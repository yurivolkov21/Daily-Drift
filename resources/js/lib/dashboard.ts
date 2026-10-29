import {
    addDays,
    differenceInCalendarDays,
    format,
    isSameDay,
    parseISO,
    startOfToday,
    startOfWeek,
    subWeeks,
} from 'date-fns';
import { activityActorName, labelList } from '@/lib/issue-activity';
import {
    formatDueDate,
    isDueThisWeek,
    isOverdue,
    priorityLabel,
    statusLabel,
    weekOptions,
} from '@/lib/issues';
import type {
    DashboardActivityEntry,
    Issue,
    IssueCompletion,
    IssueStatus,
} from '@/types';

/**
 * Days from today to the due date: 0 today, negative once it has passed.
 */
export function daysUntilDue(dueDate: string): number {
    return differenceInCalendarDays(parseISO(dueDate), startOfToday());
}

/**
 * A due date as a short day: "Today", "Tomorrow", "Yesterday", the weekday
 * within the coming week, or else the date.
 */
export function formatDueDay(dueDate: string): string {
    const days = daysUntilDue(dueDate);

    if (days === 0) {
        return 'Today';
    }

    if (days === 1) {
        return 'Tomorrow';
    }

    if (days === -1) {
        return 'Yesterday';
    }

    return days > 1 && days < 7
        ? format(parseISO(dueDate), 'EEE')
        : formatDueDate(dueDate);
}

/**
 * When a due date comes, to end a sentence: "today", "tomorrow", "on Friday".
 */
export function dueWhen(dueDate: string): string {
    const days = daysUntilDue(dueDate);

    if (days === 0) {
        return 'today';
    }

    return days === 1
        ? 'tomorrow'
        : `on ${format(parseISO(dueDate), days < 7 ? 'EEEE' : 'MMM d')}`;
}

/**
 * The order of the focus list after late and due issues: work in flight first.
 */
const focusStatusOrder: IssueStatus[] = [
    'in_progress',
    'in_review',
    'todo',
    'backlog',
];

function focusRank(issue: Issue): number {
    if (isOverdue(issue)) {
        return 0;
    }

    if (isDueThisWeek(issue)) {
        return 1;
    }

    return 2 + focusStatusOrder.indexOf(issue.status);
}

/**
 * Open issues in the order to work on them: late ones, those due this week,
 * then work in flight before what waits. Within each, the most urgent and the
 * soonest due come first.
 */
export function sortByFocus(issues: Issue[]): Issue[] {
    return [...issues].sort(
        (a, b) =>
            focusRank(a) - focusRank(b) ||
            b.priority - a.priority ||
            (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
            a.identifier.localeCompare(b.identifier, undefined, {
                numeric: true,
            }),
    );
}

/**
 * Who holds the issues, most first: "You 2 · Grace 1 · Unassigned 1".
 */
export function countByAssignee(issues: Issue[], userId: number): string {
    const counts = new Map<number | null, { name: string; count: number }>();

    for (const issue of issues) {
        const assignee = issue.assignee ?? null;
        const key = assignee?.id ?? null;
        const name =
            assignee === null
                ? 'Unassigned'
                : assignee.id === userId
                  ? 'You'
                  : assignee.name.split(' ')[0];
        const entry = counts.get(key) ?? { name, count: 0 };

        counts.set(key, { name, count: entry.count + 1 });
    }

    return [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .map(({ name, count }) => `${name} ${count}`)
        .join(' · ');
}

export type WeekThroughput = {
    thisWeek: number;
    lastWeek: number;
    /**
     * Issues done on each day from Monday to Sunday; days still ahead are null.
     */
    days: (number | null)[];
    labels: string[];
};

/**
 * Count the team's completions this week, day by day, and last week.
 */
export function weekThroughput(completions: IssueCompletion[]): WeekThroughput {
    const today = startOfToday();
    const weekStart = startOfWeek(today, weekOptions);
    const lastWeekStart = subWeeks(weekStart, 1);
    const dates = completions.map(({ completedAt }) => parseISO(completedAt));
    const days = Array.from({ length: 7 }, (_, index) =>
        addDays(weekStart, index),
    );

    return {
        thisWeek: dates.filter((date) => date >= weekStart).length,
        lastWeek: dates.filter(
            (date) => date >= lastWeekStart && date < weekStart,
        ).length,
        days: days.map((day) =>
            day > today
                ? null
                : dates.filter((date) => isSameDay(date, day)).length,
        ),
        labels: days.map((day) =>
            isSameDay(day, today) ? 'Today' : format(day, 'EEEE'),
        ),
    };
}

/**
 * The heading of a day in the activity feed: "Today", "Yesterday", the
 * weekday within the last week, or else the date.
 */
export function feedDay(timestamp: string): string {
    const date = parseISO(timestamp);
    const daysAgo = differenceInCalendarDays(startOfToday(), date);

    if (daysAgo <= 0) {
        return 'Today';
    }

    if (daysAgo === 1) {
        return 'Yesterday';
    }

    return format(date, daysAgo < 7 ? 'EEEE' : 'MMM d');
}

/**
 * Who made the change or wrote the comment.
 */
export function feedActor(entry: DashboardActivityEntry): string {
    return entry.kind === 'comment'
        ? (entry.comment.author?.name ?? 'Former member')
        : activityActorName(entry.activity);
}

/**
 * What the entry did, as the words before and after the issue's identifier:
 * "moved" DD-12 "to In Review".
 */
export function describeFeedEntry(
    entry: DashboardActivityEntry,
    userId: number,
): { before: string; after: string } {
    if (entry.kind === 'comment') {
        return { before: 'commented on', after: '' };
    }

    const activity = entry.activity;

    switch (activity.type) {
        case 'created':
            return { before: 'created', after: '' };
        case 'title_changed':
            return { before: 'renamed', after: '' };
        case 'description_changed':
            return { before: 'updated the description of', after: '' };
        case 'status_changed': {
            const status = activity.properties.to;

            if (status === 'done' || status === 'canceled') {
                return {
                    before: status === 'done' ? 'completed' : 'canceled',
                    after: '',
                };
            }

            return { before: 'moved', after: `to ${statusLabel(status)}` };
        }
        case 'priority_changed':
            return activity.properties.to === 0
                ? { before: 'removed the priority of', after: '' }
                : {
                      before: 'set the priority of',
                      after: `to ${priorityLabel(activity.properties.to)}`,
                  };
        case 'assignee_changed': {
            const assignee = activity.properties.to;

            if (assignee === null) {
                return { before: 'unassigned', after: '' };
            }

            if (assignee.id === activity.actor?.id) {
                return { before: 'self-assigned', after: '' };
            }

            return {
                before: 'assigned',
                after: `to ${assignee.id === userId ? 'you' : assignee.name}`,
            };
        }
        case 'due_date_changed':
            return activity.properties.to
                ? {
                      before: 'set the due date of',
                      after: `to ${formatDueDate(activity.properties.to)}`,
                  }
                : { before: 'removed the due date of', after: '' };
        case 'labels_changed': {
            const { added, removed } = activity.properties;

            if (added.length > 0 && removed.length > 0) {
                return { before: 'changed the labels of', after: '' };
            }

            return added.length > 0
                ? { before: `added ${labelList(added)} to`, after: '' }
                : { before: `removed ${labelList(removed)} from`, after: '' };
        }
    }
}

/**
 * "Good morning" until noon, "Good afternoon" until six, then "Good evening".
 */
export function greeting(date: Date = new Date()): string {
    const hour = date.getHours();

    if (hour < 12) {
        return 'Good morning';
    }

    return hour < 18 ? 'Good afternoon' : 'Good evening';
}
