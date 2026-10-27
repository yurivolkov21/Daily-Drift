import { createDisplayStore } from '@/lib/display-store';

export type ListGrouping =
    | 'status'
    | 'assignee'
    | 'project'
    | 'priority'
    | 'none';

export type ListOrdering =
    | 'priority'
    | 'dueDate'
    | 'updated'
    | 'created'
    | 'identifier'
    | 'title'
    | 'status'
    | 'assignee'
    | 'progress'
    | 'comments';

export type ListProperty =
    | 'identifier'
    | 'priority'
    | 'assignee'
    | 'labels'
    | 'dueDate'
    | 'progress'
    | 'comments'
    | 'updated';

export type ListDisplay = {
    grouping: ListGrouping;
    ordering: ListOrdering;
    reversed: boolean;
    hiddenProperties: ListProperty[];
    collapsedGroups: string[];
};

const groupings: ListGrouping[] = [
    'status',
    'assignee',
    'project',
    'priority',
    'none',
];

const orderings: ListOrdering[] = [
    'priority',
    'dueDate',
    'updated',
    'created',
    'identifier',
    'title',
    'status',
    'assignee',
    'progress',
    'comments',
];

const defaultDisplay: ListDisplay = {
    grouping: 'status',
    ordering: 'priority',
    reversed: false,
    hiddenProperties: ['updated'],
    collapsedGroups: ['status:done', 'status:canceled'],
};

/**
 * How the issue list is laid out for this browser: grouping, ordering, the
 * columns shown and the collapsed groups.
 */
export const useListDisplay = createDisplayStore<ListDisplay>(
    'list-display',
    defaultDisplay,
    (stored) => ({
        grouping:
            groupings.find((value) => value === stored.grouping) ??
            defaultDisplay.grouping,
        ordering:
            orderings.find((value) => value === stored.ordering) ??
            defaultDisplay.ordering,
        reversed: stored.reversed === true,
        hiddenProperties: Array.isArray(stored.hiddenProperties)
            ? stored.hiddenProperties
            : defaultDisplay.hiddenProperties,
        collapsedGroups: Array.isArray(stored.collapsedGroups)
            ? stored.collapsedGroups
            : defaultDisplay.collapsedGroups,
    }),
);
