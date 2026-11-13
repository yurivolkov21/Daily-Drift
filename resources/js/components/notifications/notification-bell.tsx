import { Link, router, useHttp, usePage } from '@inertiajs/react';
import { Bell, Clock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MemberAvatar } from '@/components/member-avatar';
import { SegmentedTabs } from '@/components/segmented-tabs';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalTime } from '@/hooks/use-local-time';
import {
    NOTIFICATIONS_CHANGED,
    notificationTaskUrl,
    notificationVerb,
    relativeTime,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { myTasks } from '@/routes';
import {
    index as notificationsPage,
    read,
    readAll,
    recent,
} from '@/routes/notifications';
import { show as showProject } from '@/routes/projects';
import type { DueSoonItem, NotificationItem, NotificationPanel } from '@/types';

type Tab = 'updates' | 'due';

/**
 * The bell in the header bar and its panel (spec 0006, the chosen round 6
 * wireframe): _Updates_ and _Due soon_ tabs with one line per item. The
 * panel only says what happened; clicking leads to the task.
 */
export function NotificationBell() {
    const { unreadNotifications, currentTeam } = usePage().props;
    const { zone, today } = useLocalTime();
    const { submit } = useHttp();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('updates');
    const [panel, setPanel] = useState<NotificationPanel | null>(null);
    const [failed, setFailed] = useState(false);
    const [unread, setUnread] = useState(unreadNotifications);
    const teamSlug = currentTeam?.slug ?? '';

    useEffect(() => setUnread(unreadNotifications), [unreadNotifications]);

    const load = useCallback(async () => {
        try {
            const data = (await submit(
                recent({ current_team: teamSlug }),
            )) as NotificationPanel;
            setPanel(data);
            setUnread(data.unread);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [submit, teamSlug]);

    useEffect(() => {
        if (open) {
            void load();
        }
    }, [open, load]);

    if (!currentTeam) {
        return null;
    }

    const markRead = (id: string) => {
        setPanel(
            (current) =>
                current && {
                    ...current,
                    updates: current.updates.map((item) =>
                        item.id === id ? { ...item, read: true } : item,
                    ),
                },
        );
        setUnread((count) => Math.max(0, count - 1));

        return submit(read({ current_team: teamSlug, notification: id }));
    };

    const openUpdate = async (item: NotificationItem) => {
        if (!item.read) {
            try {
                await markRead(item.id);
            } catch {
                // Opening the task matters more than the dot.
            }
        }

        if (item.gone) {
            return;
        }

        setOpen(false);
        router.visit(notificationTaskUrl(teamSlug, item));
    };

    const openDue = (task: DueSoonItem) => {
        setOpen(false);
        router.visit(
            `${showProject({ current_team: teamSlug, project: task.project.id }).url}?task=${task.id}`,
        );
    };

    const markAll = async () => {
        setPanel(
            (current) =>
                current && {
                    ...current,
                    updates: current.updates.map((item) => ({
                        ...item,
                        read: true,
                    })),
                },
        );
        setUnread(0);

        try {
            await submit(readAll({ current_team: teamSlug }));
            window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
        } catch {
            void load();
        }
    };

    const updates = panel?.updates ?? [];
    const dueSoon = panel?.dueSoon ?? [];
    const badge = unread > 9 ? '9+' : String(unread);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    data-test="notification-bell"
                    aria-label={
                        unread > 0
                            ? `Notifications, ${unread} unread`
                            : 'Notifications'
                    }
                    className={cn(
                        'relative flex size-[42px] items-center justify-center rounded-xl border bg-card text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        open && 'border-primary/25 bg-secondary',
                    )}
                >
                    <Bell className="size-[19px]" />
                    {unread > 0 && (
                        <span
                            key={unread}
                            data-test="notification-badge"
                            className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 animate-bump items-center justify-center rounded-full border-2 border-card bg-[#f43f5e] px-1 text-[11px] font-bold text-white tabular-nums"
                        >
                            {badge}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={10}
                aria-label="Notifications"
                className="flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[20px] p-0 shadow-[0_30px_60px_-24px_rgb(23_21_59/0.45)]"
            >
                <div className="flex items-center justify-between gap-2.5 px-4 pt-3.5 pb-2">
                    <h2 className="font-display text-base font-extrabold">
                        Notifications
                    </h2>
                    {unread > 0 && (
                        <button
                            type="button"
                            onClick={markAll}
                            data-test="notifications-read-all"
                            className="rounded-md p-1 text-[12.5px] font-semibold text-primary hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>
                <div className="px-3.5 pb-2">
                    <SegmentedTabs
                        label="Show"
                        className="w-full"
                        value={tab}
                        onChange={setTab}
                        options={[
                            {
                                value: 'updates',
                                label: 'Updates',
                                count: unread,
                            },
                            {
                                value: 'due',
                                label: 'Due soon',
                                count: dueSoon.length,
                            },
                        ]}
                    />
                </div>
                <div className="thin-scrollbar max-h-[min(520px,60vh)] overflow-y-auto px-2 pb-2">
                    {failed ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Could not load notifications.{' '}
                            <button
                                type="button"
                                onClick={() => void load()}
                                className="font-semibold text-primary"
                            >
                                Try again
                            </button>
                        </p>
                    ) : !panel ? (
                        <div className="flex flex-col gap-1 p-1">
                            {[0, 1, 2, 3].map((row) => (
                                <Skeleton
                                    key={row}
                                    className="h-10 rounded-xl"
                                />
                            ))}
                        </div>
                    ) : tab === 'updates' ? (
                        updates.length === 0 ? (
                            <Empty>
                                When someone assigns you a task or mentions you,
                                it shows here.
                            </Empty>
                        ) : (
                            <ul
                                key="updates"
                                className="flex animate-pop flex-col gap-0.5"
                            >
                                {updates.map((item) => (
                                    <li key={item.id}>
                                        <UpdateRow
                                            item={item}
                                            time={relativeTime(
                                                item.createdAt,
                                                zone,
                                                today,
                                            )}
                                            onOpen={() => void openUpdate(item)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )
                    ) : dueSoon.length === 0 ? (
                        <Empty>
                            Nothing of yours is due today or tomorrow.
                        </Empty>
                    ) : (
                        <ul
                            key="due"
                            className="flex animate-pop flex-col gap-0.5"
                        >
                            {dueSoon.map((task) => (
                                <li key={task.id}>
                                    <button
                                        type="button"
                                        data-test="due-soon-row"
                                        onClick={() => openDue(task)}
                                        className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        <Clock
                                            className={cn(
                                                'size-4 shrink-0',
                                                task.when === 'today'
                                                    ? 'text-amber-700'
                                                    : 'text-muted-foreground',
                                            )}
                                        />
                                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                                            {task.title}
                                        </span>
                                        <span
                                            className={cn(
                                                'shrink-0 text-xs font-semibold',
                                                task.when === 'today'
                                                    ? 'text-amber-700'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            due {task.when}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <Link
                    href={
                        tab === 'updates'
                            ? notificationsPage({ current_team: teamSlug }).url
                            : myTasks({ current_team: teamSlug }).url
                    }
                    onClick={() => setOpen(false)}
                    data-test="notifications-footer"
                    className="border-t px-3 py-3 text-center text-[13px] font-semibold text-primary no-underline hover:bg-secondary/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    {tab === 'updates'
                        ? 'View all notifications'
                        : 'Open My tasks'}
                </Link>
            </PopoverContent>
        </Popover>
    );
}

function UpdateRow({
    item,
    time,
    onOpen,
}: {
    item: NotificationItem;
    time: string;
    onOpen: () => void;
}) {
    const name = item.actor?.name ?? 'Someone';

    return (
        <button
            type="button"
            data-test="notification-row"
            onClick={onOpen}
            title={`${name} ${notificationVerb(item)} ${item.task.title}`}
            className={cn(
                'relative flex min-h-11 w-full items-center gap-2.5 rounded-xl py-1.5 pr-2.5 pl-4 text-left transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                !item.read && 'bg-primary/[0.05]',
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-primary transition-opacity',
                    item.read && 'opacity-0',
                )}
            />
            {item.actor ? (
                <MemberAvatar
                    id={item.actor.id}
                    name={item.actor.name}
                    className="size-7"
                />
            ) : (
                <span className="size-7 shrink-0 rounded-full bg-muted" />
            )}
            <span className="min-w-0 flex-1 truncate text-[13.5px]">
                <strong className={item.read ? 'font-semibold' : 'font-bold'}>
                    {name}
                </strong>{' '}
                <span className="text-muted-foreground">
                    {notificationVerb(item)}
                </span>{' '}
                <span
                    className={cn(
                        'font-semibold',
                        item.gone && 'text-muted-foreground line-through',
                    )}
                >
                    {item.task.title}
                </span>
                {!item.read && <span className="sr-only"> (unread)</span>}
            </span>
            {item.gone && (
                <span className="shrink-0 text-[11.5px] text-muted-foreground">
                    deleted
                </span>
            )}
            <span className="shrink-0 text-xs text-muted-foreground">
                {time}
            </span>
        </button>
    );
}

function Empty({ children }: { children: string }) {
    return (
        <p className="px-4 py-8 text-center text-[13px] leading-relaxed text-muted-foreground">
            {children}
        </p>
    );
}
