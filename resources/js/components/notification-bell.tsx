import { Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import {
    Bell,
    BellOff,
    CheckCheck,
    Inbox as InboxIcon,
    Mail,
    MailOpen,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { realtimeEnabled } from '@/components/workspace-updates';
import { Kbd } from '@/components/ui/kbd';
import {
    formatShortAge,
    notificationUrl,
    notificationVerbs,
    sendJson,
    setUnreadCount,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { inbox } from '@/routes';
import { index, readAll, update } from '@/routes/notifications';
import type { AppNotification } from '@/types';

/**
 * How many notifications the bell shows. It is a quick look; the Inbox page
 * lists the rest.
 */
const BELL_LIMIT = 8;

/**
 * The bell in the page header: the unread count, and the newest
 * notifications to open or mark as read.
 */
export function NotificationBell() {
    const page = usePage();
    const user = page.props.auth.user;
    const teamSlug = page.props.currentTeam?.slug;
    const unreadCount = page.props.unreadNotificationsCount;
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<
        AppNotification[] | null
    >(null);
    const [pop, setPop] = useState(0);
    const previousCount = useRef(unreadCount);

    // Make the count pop when it grows, not when the page first shows it.
    useEffect(() => {
        if (unreadCount > previousCount.current) {
            setPop((value) => value + 1);
        }

        previousCount.current = unreadCount;
    }, [unreadCount]);

    const load = useCallback(() => {
        sendJson<{ data: AppNotification[] }>('get', index.url())
            .then((body) => setNotifications(body?.data ?? []))
            .catch(() => setNotifications((current) => current ?? []));
    }, []);

    useEffect(() => {
        if (open) {
            load();
        }
    }, [open, load]);

    // Refresh the open list when something changes, without leaving and
    // rejoining the channel each time the bell opens or closes.
    const openRef = useRef(open);

    useEffect(() => {
        openRef.current = open;
    }, [open]);

    const refreshIfOpen = useCallback(() => {
        if (openRef.current) {
            load();
        }
    }, [load]);

    const setRead = (notification: AppNotification, read: boolean) => {
        if ((notification.readAt !== null) === read) {
            return Promise.resolve();
        }

        setNotifications(
            (list) =>
                list?.map((item) =>
                    item.id === notification.id
                        ? {
                              ...item,
                              readAt: read ? new Date().toISOString() : null,
                          }
                        : item,
                ) ?? null,
        );
        setUnreadCount((count) => Math.max(0, count + (read ? -1 : 1)));

        return sendJson('patch', update.url(notification.id), { read }).catch(
            load,
        );
    };

    const markAllRead = () => {
        setNotifications(
            (list) =>
                list?.map((item) => ({
                    ...item,
                    readAt: item.readAt ?? new Date().toISOString(),
                })) ?? null,
        );
        setUnreadCount(0);
        sendJson('post', readAll.url()).catch(load);
    };

    const openNotification = (notification: AppNotification) => {
        setOpen(false);

        // The issue page counts the unread notifications again, so save the read first.
        void setRead(notification, true).finally(() =>
            router.visit(notificationUrl(notification)),
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="relative"
                        aria-label={`Notifications, ${unreadCount} unread`}
                        data-test="notification-bell"
                    />
                }
            >
                <Bell className="size-4" />
                {unreadCount > 0 ? (
                    <span
                        key={pop}
                        className={cn(
                            'pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center bg-sidebar-primary px-1 text-[10px] leading-none font-semibold text-sidebar-primary-foreground tabular-nums',
                            pop > 0 && 'motion-safe:animate-count-pop',
                        )}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                ) : null}
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[min(22rem,calc(100vw-1rem))] gap-0 p-0"
            >
                <div className="flex items-center justify-between gap-2 border-b py-2 pr-2 pl-4">
                    <span className="flex items-center gap-2">
                        <span className="font-heading text-xs font-semibold tracking-wider uppercase">
                            Notifications
                        </span>
                        {unreadCount > 0 ? (
                            <span className="text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
                                {unreadCount} new
                            </span>
                        ) : null}
                    </span>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
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
                {notifications === null ? (
                    <div className="grid gap-3 px-4 py-3">
                        {[0, 1, 2].map((row) => (
                            <div key={row} className="grid gap-1.5 pl-4.5">
                                <Skeleton className="h-3.5 w-3/5" />
                                <Skeleton className="h-3 w-4/5" />
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <Empty className="p-8">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <BellOff />
                            </EmptyMedia>
                            <EmptyTitle>You’re all caught up</EmptyTitle>
                            <EmptyDescription>
                                Mentions and assignments show up here.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <ul className="max-h-[min(24rem,60vh)] scroll-fade-y overflow-y-auto py-1">
                        {notifications
                            .slice(0, BELL_LIMIT)
                            .map((notification) => (
                                <NotificationRow
                                    key={notification.id}
                                    notification={notification}
                                    teamSlug={teamSlug}
                                    onOpen={() =>
                                        openNotification(notification)
                                    }
                                    onToggleRead={() =>
                                        void setRead(
                                            notification,
                                            notification.readAt === null,
                                        )
                                    }
                                />
                            ))}
                    </ul>
                )}
                <div className="border-t p-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between px-3"
                        nativeButton={false}
                        render={
                            <Link
                                href={inbox()}
                                onClick={() => setOpen(false)}
                            />
                        }
                    >
                        <span className="flex items-center gap-2">
                            <InboxIcon />
                            Open Inbox
                            {notifications !== null &&
                            notifications.length > BELL_LIMIT
                                ? ` · ${notifications.length - BELL_LIMIT} more`
                                : null}
                        </span>
                        <span className="flex items-center gap-1">
                            <Kbd>G</Kbd>
                            <Kbd>N</Kbd>
                        </span>
                    </Button>
                </div>
            </PopoverContent>
            {realtimeEnabled ? (
                <LiveNotificationCount
                    userId={user.id}
                    onChange={refreshIfOpen}
                />
            ) : null}
        </Popover>
    );
}

function NotificationRow({
    notification,
    teamSlug,
    onOpen,
    onToggleRead,
}: {
    notification: AppNotification;
    teamSlug: string | undefined;
    onOpen: () => void;
    onToggleRead: () => void;
}) {
    const unread = notification.readAt === null;
    const { actor, issue, team } = notification.data;

    return (
        <li className="group/row relative">
            <button
                type="button"
                onClick={onOpen}
                className="flex w-full items-start gap-2.5 py-2 pr-12 pl-4 text-left text-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
            >
                <span
                    aria-label={unread ? 'Unread' : undefined}
                    className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        unread ? 'bg-sidebar-primary' : 'bg-transparent',
                    )}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('truncate', unread && 'font-semibold')}>
                        {actor.name}{' '}
                        <span className="font-normal text-muted-foreground">
                            {notificationVerbs[notification.type]}
                        </span>
                    </span>
                    <span className="flex min-w-0 items-baseline gap-1.5 text-xs">
                        <span className="shrink-0 font-semibold tracking-wide text-muted-foreground">
                            {issue.identifier}
                        </span>
                        <span className="truncate">{issue.title}</span>
                        {team.slug !== teamSlug ? (
                            <span className="shrink-0 border px-1 text-[0.6rem] font-semibold tracking-widest text-muted-foreground uppercase">
                                {team.name}
                            </span>
                        ) : null}
                    </span>
                </span>
            </button>
            <span className="pointer-events-none absolute top-2 right-4 text-xs text-muted-foreground group-focus-within/row:hidden group-hover/row:hidden">
                {formatShortAge(notification.createdAt)}
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
                            className="absolute top-1 right-2 hidden group-focus-within/row:inline-flex group-hover/row:inline-flex"
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
        </li>
    );
}

/**
 * Keep the count in step with the server: a notification arrives, or the
 * person reads some in another tab.
 */
function LiveNotificationCount({
    userId,
    onChange,
}: {
    userId: number;
    onChange: () => void;
}): null {
    useEcho<{ unreadCount: number }>(
        `user.${userId}`,
        '.notifications.changed',
        (payload) => {
            setUnreadCount(payload.unreadCount);
            onChange();
        },
        [onChange],
    );

    return null;
}
