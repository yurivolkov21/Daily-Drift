import { format, parseISO } from 'date-fns';
import type { Project, ProjectFilters, ProjectSort } from '@/types';

export const DEFAULT_FILTERS: ProjectFilters = {
    status: 'active',
    view: 'grid',
    sort: 'updated',
    health: null,
    colors: [],
};

export const SORTS: {
    value: ProjectSort;
    label: string;
    hint: string;
    icon: string;
}[] = [
    {
        value: 'updated',
        label: 'Recently updated',
        hint: 'Newest activity first',
        icon: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    },
    {
        value: 'name',
        label: 'Name',
        hint: 'A to Z',
        icon: 'M3 18 7 6l4 12M4.5 14h5M14 6h6l-6 12h6',
    },
    {
        value: 'progress',
        label: 'Progress',
        hint: 'Least done first',
        icon: 'M4 20V11M10 20V5M16 20v-6M2 20h20',
    },
    {
        value: 'overdue',
        label: 'Overdue',
        hint: 'Most overdue tasks first',
        icon: 'M12 8v5M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
    },
];

/**
 * The query string for a set of filters, leaving out the defaults so the
 * plain page keeps a plain URL.
 */
export function filtersToQuery(
    filters: ProjectFilters,
): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.status !== DEFAULT_FILTERS.status) {
        query.status = filters.status;
    }

    if (filters.view !== DEFAULT_FILTERS.view) {
        query.view = filters.view;
    }

    if (filters.sort !== DEFAULT_FILTERS.sort) {
        query.sort = filters.sort;
    }

    if (filters.health) {
        query.health = filters.health;
    }

    if (filters.colors.length > 0) {
        query.color = filters.colors.join(',');
    }

    return query;
}

/** The number of filters that narrow the list (health counts as one). */
export function activeFilterCount(filters: ProjectFilters): number {
    return (filters.health ? 1 : 0) + filters.colors.length;
}

export function openTasks(project: Project): number {
    return project.stats.tasks - project.stats.completed;
}

/** One line on why a project is in its health group. */
export function healthReason(project: Project): string {
    const { stats } = project;
    const open = openTasks(project);

    if (project.archivedAt) {
        if (stats.tasks === 0) {
            return 'Archived · no tasks';
        }

        return open === 0
            ? 'Archived · every task done'
            : `Archived · ${open} open ${open === 1 ? 'task' : 'tasks'}`;
    }

    if (stats.overdue > 0) {
        const since = stats.oldestOverdueOn
            ? `, oldest since ${format(parseISO(stats.oldestOverdueOn), 'd MMM')}`
            : '';

        return `${stats.overdue} overdue${since}`;
    }

    if (stats.health === 'attention') {
        return 'Nothing finished in the last 7 days';
    }

    if (stats.completedRecently > 0) {
        return `${stats.completedRecently} finished in the last 7 days`;
    }

    if (stats.tasks === 0) {
        return 'No tasks yet';
    }

    if (open === 0) {
        return 'Every task done';
    }

    return stats.dueSoon > 0
        ? `${stats.dueSoon} due in the next 7 days`
        : 'Nothing due soon';
}
