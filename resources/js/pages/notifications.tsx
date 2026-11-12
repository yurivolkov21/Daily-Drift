import {
    Head,
    InfiniteScroll,
    Link,
    router,
    useHttp,
    usePage,
} from '@inertiajs/react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    AtSign,
    Bell,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Trash2,
    UserPlus,
} from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { PriorityPill } from '@/components/board/task-badges';
import { MemberAvatar } from '@/components/member-avatar';
import { SegmentedTabs } from '@/components/segmented-tabs';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { dayIn, useLocalTime } from '@/hooks/use-local-time';
import { useIsMobile } from '@/hooks/use-mobile';
import { describeEvent, splitMentions } from '@/lib/activity';
import { teamCrumb } from '@/lib/breadcrumbs';
import { HUES } from '@/lib/hues';
import {
    NOTIFICATIONS_CHANGED,
    clockTime,
    dayLabel,
    exactTime,
    groupByDay,
    notificationTaskUrl,
    relativeTime,
} from '@/lib/notifications';
import { formatDue } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { index as notificationsPage, readAll } from '@/routes/notifications';
import type {
    NotificationCounts,
    NotificationDetail,
    NotificationFilter,
    NotificationItem,
} from '@/types';

type Props = {
    filter: NotificationFilter;
    notifications: { data: NotificationItem[] };
    selected: NotificationDetail | null;
    counts: NotificationCounts;
};

const FILTERS: { value: NotificationFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'mentions', label: 'Mentions' },
    { value: 'assigned', label: 'Assigned' },
];

/**
 * Every notification of the viewer in the current team (spec 0006, the
 * approved round 6 wireframe): a timeline list on the left and the picked
 * one on the right. The pick and the filter live in the URL; on a phone the
 * two panes become two steps.
 */
export default function Notifications({
    filter,
    notifications,
    selected,
    counts,
}: Props) {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? '';
    const { zone, today } = useLocalTime();
    const { submit } = useHttp();
    const isPhone = useIsMobile();
    const [picked, setPicked] = useState<string | null>(selected?.id ?? null);
    const [readHere, setReadHere] = useState<Set<string>>(() => new Set());
    const items = notifications.data;
    const pageUrl = notificationsPage({ current_team: teamSlug }).url;

    useEffect(() => setPicked(selected?.id ?? null), [selected?.id]);

    useEffect(() => {
        const refresh = () =>
            router.reload({
                only: ['notifications', 'counts', 'unreadNotifications'],
                reset: ['notifications'],
            });
        window.addEventListener(NOTIFICATIONS_CHANGED, refresh);

        return () => window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
    }, []);

    const isRead = (item: NotificationItem) =>
        item.read || readHere.has(item.id);
    const query = (next: {
        filter?: NotificationFilter;
        n?: string | null;
    }) => {
        const f = next.filter ?? filter;
        const n = next.n === undefined ? picked : next.n;

        return { ...(f === 'all' ? {} : { filter: f }), ...(n ? { n } : {}) };
    };

    const pick = (item: NotificationItem) => {
        setPicked(item.id);
        setReadHere((ids) => new Set(ids).add(item.id));
        router.get(pageUrl, query({ n: item.id }), {
            only: ['selected', 'counts', 'unreadNotifications'],
            preserveState: true,
            preserveScroll: true,
        });
    };

    const unpick = () => {
        setPicked(null);
        router.get(pageUrl, query({ n: null }), {
            only: ['selected'],
            preserveState: true,
            preserveScroll: true,
        });
    };

    const changeFilter = (next: NotificationFilter) =>
        router.get(pageUrl, query({ filter: next }), {
            only: ['filter', 'notifications', 'counts', 'selected'],
            reset: ['notifications'],
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => setReadHere(new Set()),
        });

    const markAll = async () => {
        setReadHere(new Set(items.map((item) => item.id)));
        await submit(readAll({ current_team: teamSlug }));
        router.reload({ only: ['counts', 'unreadNotifications'] });
    };

    const index = items.findIndex((item) => item.id === picked);
    const move = (step: number) => {
        const next =
            items[Math.min(items.length - 1, Math.max(0, index + step))];

        if (next && next.id !== picked) {
            pick(next);
        }
    };

    const current = items[index] ?? (selected?.id === picked ? selected : null);
    const openTask = (item: NotificationItem) =>
        router.visit(notificationTaskUrl(teamSlug, item));

    const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'j') {
            event.preventDefault();
            move(1);
        } else if (event.key === 'ArrowUp' || event.key === 'k') {
            event.preventDefault();
            move(-1);
        } else if (event.key === 'Enter' && current && !current.gone) {
            event.preventDefault();
            openTask(current);
        }
    };

    const unread = counts.unread;
    const days = useMemo(() => groupByDay(items, zone), [items, zone]);

    const list = (
        <div
            role="listbox"
            aria-label="Notifications, newest first"
            tabIndex={0}
            onKeyDown={onListKey}
            data-test="notification-list"
            className="h-full overflow-y-auto px-3 pb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-3.5"
        >
            {items.length === 0 ? (
                <p className="px-2 py-14 text-center text-sm text-muted-foreground">
                    {filter === 'unread'
                        ? 'Nothing unread. You are all caught up.'
                        : 'Nothing here yet. When someone assigns you a task or mentions you, it shows here.'}
                </p>
            ) : (
                <InfiniteScroll
                    data="notifications"
                    preserveUrl
                    onlyNext
                    buffer={300}
                    next={({ loading, hasMore }) => (
                        <p className="py-3 pl-10 text-[12.5px] text-muted-foreground">
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <Spinner className="size-3.5" /> Loading
                                    older notifications…
                                </span>
                            ) : hasMore ? null : (
                                `That is everything for ${currentTeam?.name ?? 'this team'}.`
                            )}
                        </p>
                    )}
                >
                    {days.map(({ day, items: rows }) => (
                        <section key={day} className="flex flex-col">
                            <h3 className="sticky top-0 z-10 bg-card/95 px-1.5 pt-2.5 pb-1.5 font-sans text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase backdrop-blur-sm">
                                {dayLabel(day, today)}
                            </h3>
                            <ul role="group" aria-label={dayLabel(day, today)}>
                                {rows.map((item) => (
                                    <ListItem
                                        key={item.id}
                                        item={item}
                                        read={isRead(item)}
                                        selected={item.id === picked}
                                        time={
                                            dayIn(item.createdAt, zone) ===
                                            today
                                                ? relativeTime(
                                                      item.createdAt,
                                                      zone,
                                                      today,
                                                  )
                                                : clockTime(
                                                      item.createdAt,
                                                      zone,
                                                  )
                                        }
                                        onPick={() => pick(item)}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))}
                </InfiniteScroll>
            )}
        </div>
    );

    const detail = (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2.5 border-b px-4 py-2.5 text-[12.5px] text-muted-foreground md:px-5">
                {isPhone ? (
                    <button
                        type="button"
                        onClick={unpick}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-secondary px-2.5 text-[13.5px] font-semibold text-foreground"
                    >
                        <ArrowLeft className="size-4" /> Notifications
                    </button>
                ) : (
                    <span>
                        {index >= 0
                            ? `${index + 1} of ${counts[filter]}`
                            : 'Nothing selected'}
                    </span>
                )}
                <span className="flex items-center gap-1.5">
                    <StepButton
                        label="Newer notification"
                        disabled={index <= 0}
                        onClick={() => move(-1)}
                    >
                        <ChevronUp className="size-4" />
                    </StepButton>
                    <StepButton
                        label="Older notification"
                        disabled={index < 0 || index >= items.length - 1}
                        onClick={() => move(1)}
                    >
                        <ChevronDown className="size-4" />
                    </StepButton>
                    <span className="ml-1.5 hidden items-center gap-1 lg:flex">
                        <Kbd label="Up arrow">
                            <ArrowUp className="size-3" />
                        </Kbd>
                        <Kbd label="Down arrow">
                            <ArrowDown className="size-3" />
                        </Kbd>{' '}
                        move <Kbd>Enter</Kbd> open
                    </span>
                </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8 md:px-6">
                {current ? (
                    <Detail
                        key={current.id}
                        item={current}
                        detail={selected?.id === current.id ? selected : null}
                        teamSlug={teamSlug}
                        zone={zone}
                        today={today}
                        onOpen={() => openTask(current)}
                    />
                ) : (
                    <div className="flex h-full min-h-72 animate-pop flex-col items-center justify-center gap-2.5 text-center">
                        <span className="flex size-14 items-center justify-center rounded-[18px] bg-secondary text-primary">
                            <Bell className="size-6" />
                        </span>
                        <strong className="text-[15px]">
                            Pick a notification
                        </strong>
                        <span className="max-w-72 text-[13px] leading-relaxed text-muted-foreground">
                            Its task, the comment and the latest changes show
                            here.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <Head title="Notifications" />
            <section
                aria-label="Notifications"
                className="flex h-[calc(100svh-104px)] min-h-[520px] animate-rise flex-col overflow-hidden rounded-card bg-card [animation-delay:110ms]"
            >
                <div
                    className={cn(
                        'flex flex-col gap-3.5 px-4 pt-4 pb-3.5 md:px-5.5',
                        isPhone && current && 'hidden',
                    )}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <h1 className="font-display text-xl font-extrabold md:text-2xl">
                                Notifications
                            </h1>
                            {unread > 0 && (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-primary">
                                    {unread} unread
                                </span>
                            )}
                        </div>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={() => void markAll()}
                                data-test="page-read-all"
                                className="min-h-9 shrink-0 rounded-[10px] border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                {isPhone ? 'Read all' : 'Mark all as read'}
                            </button>
                        )}
                    </div>
                    {/* Four filters do not fit a phone's width: the row scrolls. */}
                    <div className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 md:mx-0 md:px-0">
                        <SegmentedTabs
                            label="Show"
                            className="w-full max-w-[480px] min-w-[420px]"
                            value={filter}
                            onChange={changeFilter}
                            options={FILTERS.map((option) => ({
                                ...option,
                                count: counts[option.value],
                            }))}
                        />
                    </div>
                </div>
                <div className="min-h-0 flex-1 border-t">
                    {isPhone ? (
                        current ? (
                            detail
                        ) : (
                            list
                        )
                    ) : (
                        <ResizablePanelGroup orientation="horizontal">
                            <ResizablePanel
                                defaultSize="40%"
                                minSize="30%"
                                maxSize="58%"
                            >
                                {list}
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                            <ResizablePanel minSize="42%">
                                {detail}
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    )}
                </div>
            </section>
        </>
    );
}

function ListItem({
    item,
    read,
    selected,
    time,
    onPick,
}: {
    item: NotificationItem;
    read: boolean;
    selected: boolean;
    time: string;
    onPick: () => void;
}) {
    const mention = item.kind === 'mentioned';
    const Icon = mention ? AtSign : UserPlus;

    return (
        <li className="relative pl-10">
            <span
                aria-hidden="true"
                className="absolute inset-y-0 left-[17px] w-0.5 bg-border/70"
            />
            <span
                aria-hidden="true"
                className={cn(
                    'absolute top-3 left-[3px] flex size-[30px] items-center justify-center rounded-full border-[3px] border-card',
                    item.gone
                        ? 'bg-muted text-muted-foreground'
                        : mention
                          ? 'bg-primary/12 text-primary'
                          : 'bg-sky-500/12 text-sky-700',
                )}
            >
                <Icon className="size-3.5" />
            </span>
            <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={onPick}
                data-test="notification-item"
                className={cn(
                    'my-0.5 flex w-full flex-col gap-0.5 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    selected
                        ? 'bg-primary/10 shadow-[inset_0_0_0_1.5px_rgb(110_91_245/0.35)] hover:bg-primary/10'
                        : !read && 'bg-primary/[0.04]',
                )}
            >
                <span className="flex w-full items-center gap-2 text-[13.5px]">
                    <span className="min-w-0 flex-1 truncate">
                        <strong
                            className={read ? 'font-semibold' : 'font-bold'}
                        >
                            {item.actor?.name ?? 'Someone'}
                        </strong>{' '}
                        <span className="text-muted-foreground">
                            {mention ? 'mentioned you' : 'assigned you a task'}
                        </span>
                        {!read && <span className="sr-only"> (unread)</span>}
                    </span>
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-[7px] shrink-0 rounded-full bg-primary transition-opacity',
                            read && 'opacity-0',
                        )}
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {time}
                    </span>
                </span>
                <span className="flex w-full min-w-0 items-center gap-1.5 text-[13px]">
                    <span
                        className={cn(
                            'min-w-0 truncate font-semibold',
                            item.gone && 'text-muted-foreground line-through',
                        )}
                    >
                        {item.task.title}
                    </span>
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-[7px] shrink-0 rounded-[2px]',
                            HUES[item.project.color].dot,
                        )}
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {item.project.name}
                    </span>
                </span>
                {item.excerpt && (
                    <span className="w-full truncate text-[12.5px] text-muted-foreground">
                        “{item.excerpt}”
                    </span>
                )}
            </button>
        </li>
    );
}

function Detail({
    item,
    detail,
    teamSlug,
    zone,
    today,
    onOpen,
}: {
    item: NotificationItem;
    detail: NotificationDetail | null;
    teamSlug: string;
    zone: string;
    today: string;
    onOpen: () => void;
}) {
    const { auth } = usePage().props;
    const mention = item.kind === 'mentioned';
    const name = item.actor?.name ?? 'Someone';
    const task = detail?.task ?? null;

    return (
        <article
            className="flex animate-pop flex-col gap-4.5"
            data-test="notification-detail"
        >
            <header className="flex items-start gap-3.5">
                {item.actor ? (
                    <MemberAvatar
                        id={item.actor.id}
                        name={item.actor.name}
                        className="size-11 text-[13px]"
                    />
                ) : (
                    <span className="size-11 shrink-0 rounded-full bg-muted" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <h2 className="font-display text-xl leading-snug font-extrabold">
                        {name}{' '}
                        <span className="font-semibold text-muted-foreground">
                            {mention ? 'mentioned you in' : 'assigned you'}
                        </span>{' '}
                        <span className={cn(item.gone && 'line-through')}>
                            {item.task.title}
                        </span>
                    </h2>
                    <span className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[11.5px] font-bold',
                                mention
                                    ? 'bg-primary/12 text-primary'
                                    : 'bg-sky-500/12 text-sky-700',
                            )}
                        >
                            {mention ? 'Mention' : 'Assigned'}
                        </span>
                        <time dateTime={item.createdAt}>
                            {exactTime(item.createdAt, zone)}
                        </time>
                        <span aria-hidden="true">·</span>
                        <span>{relativeTime(item.createdAt, zone, today)}</span>
                    </span>
                </div>
            </header>

            {item.gone ? (
                <div className="flex items-start gap-3 rounded-2xl border border-dashed bg-muted/60 px-4.5 py-4">
                    <Trash2 className="mt-0.5 size-5 text-muted-foreground" />
                    <div className="flex flex-col gap-1 text-[13.5px]">
                        <strong>This task was deleted</strong>
                        <span className="text-muted-foreground">
                            Its comments went with it. The notification keeps
                            the title, so the history still reads right.
                        </span>
                    </div>
                </div>
            ) : !detail ? (
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-36 rounded-2xl" />
                </div>
            ) : (
                <>
                    {mention && (
                        <section
                            aria-label="The comment"
                            className="flex flex-col gap-2.5"
                        >
                            <div className="rounded-[4px_18px_18px_18px] bg-muted px-4 py-3.5">
                                <span className="mb-1.5 block text-[12.5px] font-bold">
                                    {detail.comment?.author?.name ?? name}{' '}
                                    <span className="font-normal text-muted-foreground">
                                        ·{' '}
                                        {exactTime(
                                            detail.comment?.createdAt ??
                                                item.createdAt,
                                            zone,
                                        )}
                                    </span>
                                </span>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {detail.comment
                                        ? splitMentions(
                                              detail.comment.body,
                                              detail.comment.mentionNames,
                                          ).map((part, at) =>
                                              part.mention ? (
                                                  <mark
                                                      key={at}
                                                      className={cn(
                                                          'rounded-md px-1 py-px font-semibold',
                                                          part.text ===
                                                              `@${auth.user.name}`
                                                              ? 'bg-primary/20 text-primary'
                                                              : 'bg-primary/10 text-primary',
                                                      )}
                                                  >
                                                      {part.text}
                                                  </mark>
                                              ) : (
                                                  <span key={at}>
                                                      {part.text}
                                                  </span>
                                              ),
                                          )
                                        : `“${item.excerpt ?? ''}” (the comment has been deleted)`}
                                </p>
                            </div>
                            {detail.canReply && detail.comment && (
                                <Link
                                    href={notificationTaskUrl(teamSlug, item)}
                                    className="self-start rounded-xl border border-primary/25 px-3.5 py-2 text-[13px] font-semibold text-primary no-underline hover:bg-secondary hover:text-primary"
                                >
                                    Reply in task
                                </Link>
                            )}
                        </section>
                    )}

                    {task && (
                        <section
                            aria-label="The task"
                            className="flex flex-col gap-3.5 rounded-2xl border px-4.5 py-4"
                        >
                            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'size-[9px] rounded-[3px]',
                                        HUES[task.project.color].dot,
                                    )}
                                />
                                {task.project.name}
                                <ChevronRight
                                    aria-hidden="true"
                                    className="size-3.5 text-muted-foreground/60"
                                />
                                {task.list}
                            </div>
                            <h3
                                className={cn(
                                    '-mt-1.5 text-[17px] font-bold',
                                    task.completed && 'line-through',
                                )}
                            >
                                {task.title}
                            </h3>
                            <dl className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
                                <Field label="Assignee">
                                    {task.assignee ? (
                                        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                                            <MemberAvatar
                                                id={task.assignee.id}
                                                name={task.assignee.name}
                                                className="size-5.5 text-[9px]"
                                            />
                                            {task.assignee.id === auth.user.id
                                                ? 'You'
                                                : task.assignee.name}
                                        </span>
                                    ) : (
                                        <span className="text-[13px] text-muted-foreground">
                                            Unassigned
                                        </span>
                                    )}
                                </Field>
                                <Field label="Due">
                                    <DueChip
                                        dueOn={task.dueOn}
                                        done={task.completed}
                                        today={today}
                                    />
                                </Field>
                                <Field label="Priority">
                                    {task.priority === 'none' ? (
                                        <span className="text-[13px] text-muted-foreground">
                                            None
                                        </span>
                                    ) : (
                                        <PriorityPill
                                            priority={task.priority}
                                        />
                                    )}
                                </Field>
                                <Field label="Status">
                                    <span
                                        className={cn(
                                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                            task.completed
                                                ? 'bg-emerald-500/12 text-emerald-700'
                                                : 'bg-muted text-foreground/75',
                                        )}
                                    >
                                        {task.completed ? 'Done' : 'Open'}
                                    </span>
                                </Field>
                            </dl>
                            {task.project.archived && (
                                <p className="rounded-xl bg-slate-500/10 px-3 py-2.5 text-[12.5px] text-slate-700 dark:text-slate-300">
                                    {task.project.name} is archived: you can
                                    read the task, not change it or reply.
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={onOpen}
                                data-test="open-task"
                                className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground shadow-[0_8px_20px_-10px_var(--primary)] transition-transform active:scale-[0.98]"
                            >
                                Open task <ArrowRight className="size-4" />
                            </button>
                        </section>
                    )}

                    {detail.recent.length > 0 && (
                        <section
                            aria-label="Recent on this task"
                            className="flex flex-col gap-1.5"
                        >
                            <h3 className="font-sans text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
                                Recent on this task
                            </h3>
                            <ol className="flex flex-col gap-0.5">
                                {detail.recent.map((event) => (
                                    <li
                                        key={event.id}
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px]',
                                            event.isThis && 'bg-primary/[0.06]',
                                        )}
                                    >
                                        {event.actor ? (
                                            <MemberAvatar
                                                id={event.actor.id}
                                                name={event.actor.name}
                                                className="size-5.5 text-[9px]"
                                            />
                                        ) : (
                                            <span className="size-5.5 shrink-0 rounded-full bg-muted" />
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <strong className="font-semibold">
                                                {event.actor?.name ??
                                                    'Daily-Drift'}
                                            </strong>{' '}
                                            <span className="text-foreground/75">
                                                {event.type === 'comment.added'
                                                    ? event.quote
                                                        ? `commented: “${event.quote}”`
                                                        : 'commented'
                                                    : describeEvent(event)}
                                            </span>
                                            {event.isThis && (
                                                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-px text-[11px] font-bold text-primary">
                                                    This notification
                                                </span>
                                            )}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {relativeTime(
                                                event.createdAt,
                                                zone,
                                                today,
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                </>
            )}
        </article>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <dt className="text-[11.5px] text-muted-foreground">{label}</dt>
            <dd className="flex items-center">{children}</dd>
        </div>
    );
}

function DueChip({
    dueOn,
    done,
    today,
}: {
    dueOn: string | null;
    done: boolean;
    today: string;
}) {
    if (!dueOn) {
        return (
            <span className="text-[13px] text-muted-foreground">
                No due date
            </span>
        );
    }

    const state = done
        ? 'later'
        : dueOn < today
          ? 'overdue'
          : dueOn === today
            ? 'today'
            : 'later';

    return (
        <span
            className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                state === 'overdue' && 'bg-red-500/10 text-red-700',
                state === 'today' && 'bg-amber-500/15 text-amber-700',
                state === 'later' && 'bg-muted text-foreground/75',
            )}
        >
            {state === 'today' ? 'Today' : formatDue(dueOn, 'EEE d MMM')}
        </span>
    );
}

function StepButton({
    label,
    disabled,
    onClick,
    children,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="flex size-8 items-center justify-center rounded-[10px] border bg-card text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-35 md:size-8"
        >
            {children}
        </button>
    );
}

/** A key cap. Arrow keys get an icon and a label, never an arrow character. */
function Kbd({ children, label }: { children: ReactNode; label?: string }) {
    return (
        <kbd
            aria-label={label}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-b-2 bg-card px-1 font-sans text-[11px] font-semibold text-foreground/75"
        >
            {children}
        </kbd>
    );
}

Notifications.layout = (props: {
    currentTeam?: { name: string; slug: string } | null;
}) => ({
    breadcrumbs: [
        ...teamCrumb(props.currentTeam),
        ...(props.currentTeam
            ? [
                  {
                      title: 'Notifications',
                      href: notificationsPage(props.currentTeam.slug),
                  },
              ]
            : []),
    ],
});
