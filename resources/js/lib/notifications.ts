import { http, router } from '@inertiajs/react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { show } from '@/routes/issues';
import type { AppNotification, NotificationType } from '@/types';

/**
 * Send a JSON request through Inertia's client, so it carries the CSRF token
 * and this tab's socket id like the app's other requests.
 */
export async function sendJson<T>(
    method: 'get' | 'patch' | 'post',
    url: string,
    data?: Record<string, unknown>,
): Promise<T | null> {
    const response = await http.getClient().request({
        method,
        url,
        data,
        headers: { Accept: 'application/json' },
    });

    return response.data === '' ? null : (JSON.parse(response.data) as T);
}

/**
 * Change the unread count every page shares, without asking the server.
 */
export function setUnreadCount(
    count: number | ((current: number) => number),
): void {
    router.replaceProp('unreadNotificationsCount', count);
}

export const notificationVerbs: Record<NotificationType, string> = {
    'issue-assigned': 'assigned you',
    'comment-mention': 'mentioned you',
};

/**
 * The page a notification leads to: the issue, scrolled to the comment that
 * mentions the reader.
 */
export function notificationUrl(notification: AppNotification): string {
    const url = show.url([
        notification.data.team.slug,
        notification.data.issue.identifier,
    ]);

    return notification.data.comment
        ? `${url}#comment-${notification.data.comment.id}`
        : url;
}

/**
 * A short age for lists: "now", "4m", "2h", "Yesterday", "3d".
 */
export function formatShortAge(value: string, now: Date = new Date()): string {
    const date = parseISO(value);
    const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (minutes < 1) {
        return 'now';
    }

    if (minutes < 60) {
        return `${minutes}m`;
    }

    if (minutes < 60 * 24) {
        return `${Math.floor(minutes / 60)}h`;
    }

    const days = differenceInCalendarDays(now, date);

    return days <= 1 ? 'Yesterday' : `${days}d`;
}
