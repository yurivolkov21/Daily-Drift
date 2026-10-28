import { differenceInCalendarDays, parseISO } from 'date-fns';
import { show } from '@/routes/issues';
import type { AppNotification, NotificationType } from '@/types';

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
