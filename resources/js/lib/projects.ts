import {
    differenceInCalendarDays,
    format,
    parseISO,
    startOfToday,
} from 'date-fns';
import type { ProjectStatus, ProjectSummary } from '@/types';

export const projectStatuses: {
    value: ProjectStatus;
    label: string;
    hint: string;
}[] = [
    {
        value: 'planned',
        label: 'Planned',
        hint: 'Scoped, but work has not started.',
    },
    {
        value: 'in_progress',
        label: 'In progress',
        hint: 'The team is working on it now.',
    },
    {
        value: 'paused',
        label: 'Paused',
        hint: 'On hold. Its issues stay open.',
    },
    {
        value: 'completed',
        label: 'Completed',
        hint: 'Shipped. It leaves the active list.',
    },
    { value: 'canceled', label: 'Canceled', hint: 'Stopped for good.' },
];

/**
 * The order of status groups and of the default sort: work in flight first.
 */
export const projectStatusOrder: ProjectStatus[] = [
    'in_progress',
    'planned',
    'paused',
    'completed',
    'canceled',
];

export function projectStatusLabel(status: ProjectStatus): string {
    return (
        projectStatuses.find((option) => option.value === status)?.label ?? ''
    );
}

export function isProjectClosed(
    project: Pick<ProjectSummary, 'status'>,
): boolean {
    return project.status === 'completed' || project.status === 'canceled';
}

/**
 * Done issues out of the issues that still count, so canceled ones neither
 * help nor hurt.
 */
export function projectProgress(project: ProjectSummary): {
    done: number;
    total: number;
    percent: number;
} {
    const total = project.issuesCount - project.canceledIssuesCount;
    const done = project.completedIssuesCount;

    return {
        done,
        total,
        percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
}

/**
 * Days from today to the target date, negative once it has passed.
 */
export function daysUntilTarget(targetDate: string): number {
    return differenceInCalendarDays(parseISO(targetDate), startOfToday());
}

export function isProjectOverdue(
    project: Pick<ProjectSummary, 'status' | 'targetDate'>,
): boolean {
    return (
        project.targetDate !== null &&
        !isProjectClosed(project) &&
        daysUntilTarget(project.targetDate) < 0
    );
}

/**
 * "Nov 30", with the year when it is not this year.
 */
export function formatTargetDate(targetDate: string): string {
    const date = parseISO(targetDate);

    return format(
        date,
        date.getFullYear() === new Date().getFullYear()
            ? 'MMM d'
            : 'MMM d, yyyy',
    );
}
