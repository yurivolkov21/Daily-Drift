import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { formatDueDate, priorityLabel, statusLabel } from '@/lib/issues';
import type {
    IssueActivity,
    IssueComment,
    IssueLabel,
    IssueTimelineEntry,
} from '@/types';

/**
 * Merge comments and recorded changes into one list, oldest first.
 */
export function buildTimeline(
    comments: IssueComment[],
    activities: IssueActivity[],
): IssueTimelineEntry[] {
    const entries: IssueTimelineEntry[] = [
        ...comments.map((comment) => ({
            kind: 'comment' as const,
            id: comment.id,
            createdAt: comment.createdAt,
            comment,
        })),
        ...activities.map((activity) => ({
            kind: 'activity' as const,
            id: activity.id,
            createdAt: activity.createdAt,
            activity,
        })),
    ];

    return entries.sort(
        (a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
}

function labelList(labels: IssueLabel[]): string {
    const names = labels.map(({ name }) => name);
    const list =
        names.length > 1
            ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
            : names[0];

    return `the ${list} label${names.length > 1 ? 's' : ''}`;
}

/**
 * Describe a change as the end of a sentence that starts with who made it.
 */
export function describeActivity(activity: IssueActivity): string {
    switch (activity.type) {
        case 'created':
            return 'created the issue';
        case 'description_changed':
            return 'updated the description';
        case 'title_changed':
            return `renamed the issue to “${activity.properties.to}”`;
        case 'status_changed':
            return `changed the status from ${statusLabel(activity.properties.from)} to ${statusLabel(activity.properties.to)}`;
        case 'priority_changed':
            return activity.properties.to === 0
                ? 'removed the priority'
                : `set the priority to ${priorityLabel(activity.properties.to)}`;
        case 'assignee_changed': {
            const { from, to } = activity.properties;

            if (to === null) {
                return from
                    ? `unassigned ${from.name}`
                    : 'removed the assignee';
            }

            return to.id === activity.actor?.id
                ? 'self-assigned the issue'
                : `assigned the issue to ${to.name}`;
        }
        case 'due_date_changed':
            return activity.properties.to
                ? `set the due date to ${formatDueDate(activity.properties.to)}`
                : 'removed the due date';
        case 'labels_changed': {
            const { added, removed } = activity.properties;
            const parts = [
                added.length > 0 ? `added ${labelList(added)}` : null,
                removed.length > 0 ? `removed ${labelList(removed)}` : null,
            ];

            return parts.filter(Boolean).join(' and ');
        }
    }
}

export function formatRelativeTime(value: string): string {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
}

export function formatFullTime(value: string): string {
    return format(parseISO(value), 'PPpp');
}
