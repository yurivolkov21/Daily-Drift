import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { dayIn } from '@/hooks/use-local-time';
import { show as showProject } from '@/routes/projects';
import type { NotificationItem } from '@/types';

/** "assigned you" or "mentioned you in", before the task's title. */
export function notificationVerb(item: NotificationItem): string {
    return item.kind === 'mentioned' ? 'mentioned you in' : 'assigned you';
}

/**
 * Where a notification leads: its task on the board, scrolled to the
 * comment for a mention (spec 0006).
 */
export function notificationTaskUrl(
    teamSlug: string,
    item: Pick<NotificationItem, 'kind' | 'task' | 'project' | 'commentId'>,
): string {
    const base = `${showProject({ current_team: teamSlug, project: item.project.id }).url}?task=${item.task.id}`;

    return item.kind === 'mentioned' && item.commentId
        ? `${base}&comment=${item.commentId}`
        : base;
}

/** A day heading in the viewer's time zone: Today, Yesterday or "Tue 10 Nov". */
export function dayLabel(day: string, today: string): string {
    const ago = differenceInCalendarDays(parseISO(today), parseISO(day));

    if (ago <= 0) {
        return 'Today';
    }

    return ago === 1 ? 'Yesterday' : format(parseISO(day), 'EEE d MMM');
}

/** A short time for the panel: "just now", "12 min ago", "3 h ago", "Yesterday", "Tue 10 Nov". */
export function relativeTime(
    iso: string,
    zone: string,
    today: string,
    now: Date = new Date(),
): string {
    const minutes = Math.floor(
        (now.getTime() - new Date(iso).getTime()) / 60000,
    );
    const day = dayIn(iso, zone);

    if (minutes < 1) {
        return 'just now';
    }

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    if (day === today) {
        return `${Math.floor(minutes / 60)} h ago`;
    }

    return dayLabel(day, today);
}

/** The clock time in the viewer's zone, such as 16:40. */
export function clockTime(iso: string, zone: string): string {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: zone,
        }).format(new Date(iso));
    } catch {
        return format(new Date(iso), 'HH:mm');
    }
}

/** The exact moment in the viewer's zone, such as "Thu 12 Nov, 08:58". */
export function exactTime(iso: string, zone: string): string {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: zone,
        }).format(new Date(iso));
    } catch {
        return format(new Date(iso), 'EEE d MMM, HH:mm');
    }
}

/** Notifications grouped by the viewer's day, newest first as given. */
export function groupByDay<T extends { createdAt: string }>(
    items: T[],
    zone: string,
): { day: string; items: T[] }[] {
    const days: { day: string; items: T[] }[] = [];

    items.forEach((item) => {
        const day = dayIn(item.createdAt, zone);
        const last = days[days.length - 1];

        if (last?.day === day) {
            last.items.push(item);
        } else {
            days.push({ day, items: [item] });
        }
    });

    return days;
}

/** Fired after notifications are marked as read outside the current page. */
export const NOTIFICATIONS_CHANGED = 'notifications:changed';
