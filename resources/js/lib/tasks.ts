import { format, isBefore, isToday, parseISO, startOfToday } from 'date-fns';
import type { Priority, Task } from '@/types';

export const PRIORITY_NAMES: Priority[] = [
    'none',
    'low',
    'medium',
    'high',
    'urgent',
];

export const PRIORITIES: Record<
    Priority,
    { label: string; flag: string; pill: string }
> = {
    none: {
        label: 'No priority',
        flag: 'text-muted-foreground',
        pill: 'bg-muted text-muted-foreground',
    },
    low: {
        label: 'Low',
        flag: 'text-sky-500',
        pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    },
    medium: {
        label: 'Medium',
        flag: 'text-amber-500',
        pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    },
    high: {
        label: 'High',
        flag: 'text-orange-500',
        pill: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    },
    urgent: {
        label: 'Urgent',
        flag: 'text-red-500',
        pill: 'bg-red-500/10 text-red-700 dark:text-red-400',
    },
};

export type DueState = 'none' | 'overdue' | 'today' | 'later';

/** Whether an open task is overdue, due today or later, in the viewer's own day. */
export function dueState(task: Pick<Task, 'dueOn' | 'completedAt'>): DueState {
    if (!task.dueOn || task.completedAt) {
        return 'none';
    }

    const due = parseISO(task.dueOn);

    if (isToday(due)) {
        return 'today';
    }

    return isBefore(due, startOfToday()) ? 'overdue' : 'later';
}

export function formatDue(dueOn: string, pattern = 'd MMM'): string {
    return format(parseISO(dueOn), pattern);
}

export function percent(done: number, total: number): number {
    return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function initials(name: string | null): string {
    if (!name) {
        return '?';
    }

    const parts = name.trim().split(/\s+/);

    return `${parts[0][0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}
