import { Head, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import {
    ArrowLeft,
    ArrowUpRight,
    BellOff,
    CheckCheck,
    Inbox as InboxIcon,
    Mail,
    MailOpen,
} from 'lucide-react';
import { useState } from 'react';
import { IssueActivityTimeline } from '@/components/issue-activity-timeline';
import { IssueDevelopment } from '@/components/issue-development';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { IssueSubtasks } from '@/components/issue-subtasks';
import { MemberAvatar } from '@/components/member-avatar';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { realtimeEnabled } from '@/components/workspace-updates';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { buildTimeline } from '@/lib/issue-activity';
import { priorityLabel, statusLabel } from '@/lib/issues';
import {
    formatShortAge,
    notificationUrl,
    notificationVerbs,
    sendJson,
    setUnreadCount,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { inbox } from '@/routes';
import { readAll, update } from '@/routes/notifications';
import type {
    AppNotification,
    Issue,
    IssueActivity,
    IssueComment,
    IssueLink,
    IssueSubtask,
} from '@/types';

type Preview = {
    issue: Issue;
    comments: IssueComment[];
    activities: IssueActivity[];
    subtasks: IssueSubtask[];
    links: IssueLink[];
};

type Props = {
    notifications: AppNotification[];
    selectedId: string | null;
    preview: Preview | null;
};

/**
 * The inbox's own address for a notification. A mention also names its
 * comment, so the preview scrolls to it and lights it up.
 */
function inboxUrl(notification: AppNotification | null): string {
    if (notification === null) {
        return inbox.url();
    }

    const url = inbox.url({ query: { notification: notification.id } });

    return notification.data.comment
        ? `${url}#comment-${notification.data.comment.id}`
        : url;
}

export default function Inbox({ notifications, selectedId, preview }: Props) {
    const page = usePage();
    const user = page.props.auth.user;
    const teamSlug = page.props.currentTeam?.slug;
    const unreadCount = page.props.unreadNotificationsCount;
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [search, setSearch] = useState('');
    const [activeId, setActiveId] = useState(selectedId);
    const [syncedId, setSyncedId] = useState(selectedId);

    // Follow the server when it answers with another selection.
    if (selectedId !== syncedId) {
        setSyncedId(selectedId);
        setActiveId(selectedId);
    }

    const query = search.trim().toLowerCase();
    const shown = notifications.filter(
        (notification) =>
            (!unreadOnly ||
                notification.readAt === null ||
                notification.id === activeId) &&
            (query === '' ||
                `${notification.data.actor.name} ${notification.data.issue.identifier} ${notification.data.issue.title}`
                    .toLowerCase()
                    .includes(query)),
    );
    const active =
        notifications.find((notification) => notification.id === activeId) ??
        null;

    const setRead = (notification: AppNotification, read: boolean) => {
        if ((notification.readAt !== null) === read) {
            return Promise.resolve();
        }

        router.replaceProp('notifications', (list: AppNotification[]) =>
            list.map((item) =>
                item.id === notification.id
                    ? {
                          ...item,
                          readAt: read ? new Date().toISOString() : null,
                      }
                    : item,
            ),
        );
        setUnreadCount((count) => Math.max(0, count + (read ? -1 : 1)));

        return sendJson('patch', update.url(notification.id), { read }).catch(
            () => router.reload({ only: ['notifications'] }),
        );
    };

    const markAllRead = () => {
        router.replaceProp('notifications', (list: AppNotification[]) =>
            list.map((item) => ({
                ...item,
                readAt: item.readAt ?? new Date().toISOString(),
            })),
        );
        setUnreadCount(0);
        sendJson('post', readAll.url()).catch(() =>
            router.reload({ only: ['notifications'] }),
        );
    };

    const select = (notification: AppNotification | null) => {
        setActiveId(notification?.id ?? null);

        if (notification !== null) {
            void setRead(notification, true);
        }

        router.get(
            inboxUrl(notification),
            {},
            {
                only: ['preview', 'selectedId'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const openIssue = (notification: AppNotification) => {
        void setRead(notification, true).finally(() =>
            router.visit(notificationUrl(notification)),
        );
    };

    const move = (step: 1 | -1) => {
        const index = shown.findIndex(({ id }) => id === activeId);
        const next =
            shown[Math.min(shown.length - 1, Math.max(0, index + step))];

        if (next && next.id !== activeId) {
            select(next);
            document
                .querySelector(`[data-notification="${next.id}"]`)
                ?.scrollIntoView({ block: 'nearest' });
        }
    };

    useHotkeys([
        { keys: 'j', handler: () => move(1) },
        { keys: 'arrowdown', handler: () => move(1) },
        { keys: 'k', handler: () => move(-1) },
        { keys: 'arrowup', handler: () => move(-1) },
        {
            keys: 'u',
            handler: () =>
                active && void setRead(active, active.readAt === null),
        },
        { keys: 'enter', handler: () => active && openIssue(active) },
        { keys: 'o', handler: () => active && openIssue(active) },
    ]);

    return (
        <>
            <Head title="Inbox" />

            <div className="flex min-h-0 flex-1">
                <section
                    aria-label="Notifications"
                    className={cn(
                        'min-h-0 w-full shrink-0 flex-col border-r md:flex md:w-80 lg:w-96',
                        active ? 'hidden' : 'flex',
                    )}
                >
                    <div className="grid gap-3 border-b p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                                <span className="font-heading text-sm font-semibold tracking-wider uppercase">
                                    Inbox
                                </span>
                                {unreadCount > 0 ? (
                                    <span className="text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
                                        {unreadCount} unread
                                    </span>
                                ) : null}
                            </span>
                            <Label className="text-xs">
                                Unread only
                                <Switch
                                    checked={unreadOnly}
                                    onCheckedChange={setUnreadOnly}
                                />
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="search"
                                aria-label="Search the inbox"
                                placeholder="Search people or issues..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="h-8"
                            />
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            className="size-8"
                                            aria-label="Mark all read"
                                            disabled={unreadCount === 0}
                                            onClick={markAllRead}
                                        />
                                    }
                                >
                                    <CheckCheck />
                                </TooltipTrigger>
                                <TooltipContent>Mark all read</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {shown.length === 0 ? (
                        <Empty className="flex-1 border-0">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <BellOff />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {notifications.length > 0 &&
                                    !(unreadOnly && query === '')
                                        ? 'Nothing here'
                                        : 'You’re all caught up'}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {notifications.length > 0 &&
                                    !(unreadOnly && query === '')
                                        ? 'No notification matches the search.'
                                        : 'Mentions and assignments show up here.'}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <ul className="min-h-0 flex-1 scroll-fade-y overflow-y-auto">
                            {shown.map((notification) => (
                                <InboxRow
                                    key={notification.id}
                                    notification={notification}
                                    active={notification.id === activeId}
                                    otherTeam={
                                        notification.data.team.slug !== teamSlug
                                    }
                                    onSelect={() => select(notification)}
                                />
                            ))}
                        </ul>
                    )}

                    <div className="hidden items-center gap-3 border-t px-4 py-2 text-xs text-muted-foreground md:flex">
                        <span className="flex items-center gap-1">
                            <Kbd>J</Kbd>
                            <Kbd>K</Kbd>
                            move
                        </span>
                        <span className="flex items-center gap-1">
                            <Kbd>U</Kbd>
                            read
                        </span>
                        <span className="flex items-center gap-1">
                            <Kbd>Enter</Kbd>
                            open
                        </span>
                    </div>
                </section>

                <section
                    aria-label="Preview"
                    className={cn(
                        'min-h-0 min-w-0 flex-1 flex-col',
                        active ? 'flex' : 'hidden md:flex',
                    )}
                >
                    {active ? (
                        <InboxPreview
                            notification={active}
                            preview={selectedId === active.id ? preview : null}
                            loading={selectedId !== active.id}
                            otherTeam={active.data.team.slug !== teamSlug}
                            onBack={() => select(null)}
                            onToggleRead={() =>
                                void setRead(active, active.readAt === null)
                            }
                            onOpen={() => openIssue(active)}
                        />
                    ) : (
                        <Empty className="flex-1 border-0">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <InboxIcon />
                                </EmptyMedia>
                                <EmptyDescription>
                                    Pick a notification to see it here.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </section>
            </div>

            {realtimeEnabled ? <LiveInbox userId={user.id} /> : null}
        </>
    );
}

/**
 * A row of the list, laid out like the inbox of shadcn/ui sidebar-09.
 */
function InboxRow({
    notification,
    active,
    otherTeam,
    onSelect,
}: {
    notification: AppNotification;
    active: boolean;
    otherTeam: boolean;
    onSelect: () => void;
}) {
    const unread = notification.readAt === null;
    const { actor, issue, team, comment } = notification.data;

    return (
        <li>
            <button
                type="button"
                data-notification={notification.id}
                aria-current={active ? 'true' : undefined}
                onClick={onSelect}
                className={cn(
                    'flex w-full flex-col items-start gap-1.5 border-b p-4 text-left text-sm leading-tight outline-none hover:bg-muted/60 focus-visible:bg-muted/60',
                    active && 'bg-muted',
                )}
            >
                <span className="flex w-full items-center gap-2">
                    <span
                        aria-label={unread ? 'Unread' : undefined}
                        className={cn(
                            'size-2 shrink-0 rounded-full',
                            unread ? 'bg-sidebar-primary' : 'bg-transparent',
                        )}
                    />
                    <span className={cn('truncate', unread && 'font-semibold')}>
                        {actor.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                        {notificationVerbs[notification.type]}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {formatShortAge(notification.createdAt)}
                    </span>
                </span>
                <span className="flex w-full min-w-0 items-baseline gap-1.5 pl-4 font-medium">
                    <span className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground">
                        {issue.identifier}
                    </span>
                    <span className="truncate">{issue.title}</span>
                </span>
                {comment ? (
                    <span className="line-clamp-2 pl-4 text-xs text-muted-foreground">
                        {comment.excerpt}
                    </span>
                ) : null}
                {otherTeam ? (
                    <span className="ml-4 border px-1 text-[0.6rem] font-semibold tracking-widest text-muted-foreground uppercase">
                        {team.name}
                    </span>
                ) : null}
            </button>
        </li>
    );
}

/**
 * The issue a notification is about, beside the list: its properties,
 * sub-tasks and activity, with the comment that mentions the reader lit up.
 */
function InboxPreview({
    notification,
    preview,
    loading,
    otherTeam,
    onBack,
    onToggleRead,
    onOpen,
}: {
    notification: AppNotification;
    preview: Preview | null;
    loading: boolean;
    otherTeam: boolean;
    onBack: () => void;
    onToggleRead: () => void;
    onOpen: () => void;
}) {
    const unread = notification.readAt === null;
    const issue = preview?.issue;

    return (
        <>
            <div className="flex items-center gap-2 border-b px-4 py-3">
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="md:hidden"
                    aria-label="Back to the inbox"
                    onClick={onBack}
                >
                    <ArrowLeft />
                </Button>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">
                    {notification.data.issue.identifier}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {issue?.title ?? notification.data.issue.title}
                </span>
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={
                                    unread ? 'Mark as read' : 'Mark as unread'
                                }
                                onClick={onToggleRead}
                            />
                        }
                    >
                        {unread ? <MailOpen /> : <Mail />}
                    </TooltipTrigger>
                    <TooltipContent>
                        {unread ? 'Mark as read' : 'Mark as unread'}
                    </TooltipContent>
                </Tooltip>
                <Button variant="outline" size="xs" onClick={onOpen}>
                    {otherTeam
                        ? `Open in ${notification.data.team.name}`
                        : 'Open issue'}
                    <ArrowUpRight />
                </Button>
            </div>

            <div className="min-h-0 flex-1 scroll-fade-y overflow-y-auto">
                {issue && preview ? (
                    <div className="grid gap-6 p-4">
                        <dl className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-2.5 text-xs">
                            <dt className="text-muted-foreground">Status</dt>
                            <dd className="flex items-center gap-2">
                                <IssueStatusIcon status={issue.status} />
                                {statusLabel(issue.status)}
                            </dd>
                            <dt className="text-muted-foreground">Priority</dt>
                            <dd className="flex items-center gap-2">
                                <IssuePriorityIcon priority={issue.priority} />
                                {priorityLabel(issue.priority)}
                            </dd>
                            <dt className="text-muted-foreground">Assignee</dt>
                            <dd className="flex min-w-0 items-center gap-2">
                                {issue.assignee ? (
                                    <>
                                        <MemberAvatar
                                            name={issue.assignee.name}
                                            className="size-4"
                                        />
                                        <span className="truncate">
                                            {issue.assignee.name}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">
                                        Unassigned
                                    </span>
                                )}
                            </dd>
                        </dl>

                        {issue.description ? (
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                {issue.description}
                            </p>
                        ) : null}

                        <IssueSubtasks
                            issueIdentifier={issue.identifier}
                            subtasks={preview.subtasks}
                            location="preview"
                        />

                        <IssueDevelopment
                            identifier={issue.identifier}
                            title={issue.title}
                            links={preview.links}
                        />

                        <section
                            aria-label="Activity"
                            className="grid gap-4 border-t pt-4"
                        >
                            <h2 className="text-xs font-semibold tracking-wider uppercase">
                                Activity
                            </h2>
                            <IssueActivityTimeline
                                entries={buildTimeline(
                                    preview.comments,
                                    preview.activities,
                                )}
                                issueIdentifier={issue.identifier}
                                filter="all"
                            />
                        </section>
                    </div>
                ) : loading ? (
                    <p className="p-4 text-sm text-muted-foreground">
                        Loading the issue...
                    </p>
                ) : (
                    <Empty className="border-0">
                        <EmptyHeader>
                            <EmptyTitle>
                                {otherTeam
                                    ? `From ${notification.data.team.name}`
                                    : 'This issue is gone'}
                            </EmptyTitle>
                            <EmptyDescription>
                                {otherTeam
                                    ? 'This issue belongs to another team. Open it to switch to that team.'
                                    : 'It was deleted after the notification was sent.'}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        </>
    );
}

/**
 * Reload the list when a notification arrives or is read in another tab.
 */
function LiveInbox({ userId }: { userId: number }): null {
    useEcho(`user.${userId}`, '.notifications.changed', () =>
        router.reload({ only: ['notifications'] }),
    );

    return null;
}

Inbox.layout = () => ({
    breadcrumbs: [
        {
            title: 'Inbox',
            href: inbox(),
        },
    ],
});
