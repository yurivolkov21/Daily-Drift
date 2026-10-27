import { createDisplayStore } from '@/lib/display-store';
import type { IssueStatus } from '@/types';

export { toggled } from '@/lib/display-store';

export type BoardDensity = 'compact' | 'detailed';

export type BoardLanes = 'none' | 'project' | 'assignee';

export type BoardProperty =
    | 'priority'
    | 'labels'
    | 'dueDate'
    | 'assignee'
    | 'progress';

export type BoardDisplay = {
    density: BoardDensity;
    lanes: BoardLanes;
    hiddenProperties: BoardProperty[];
    collapsedStatuses: IssueStatus[];
    collapsedLanes: string[];
};

const defaultDisplay: BoardDisplay = {
    density: 'compact',
    lanes: 'none',
    hiddenProperties: [],
    collapsedStatuses: ['done', 'canceled'],
    collapsedLanes: [],
};

/**
 * How the board is laid out for this browser: card density, swimlanes,
 * the properties shown on cards, and the collapsed columns and lanes.
 */
export const useBoardDisplay = createDisplayStore<BoardDisplay>(
    'board-display',
    defaultDisplay,
    (stored) => ({
        density: stored.density === 'detailed' ? 'detailed' : 'compact',
        lanes:
            stored.lanes === 'project' || stored.lanes === 'assignee'
                ? stored.lanes
                : 'none',
        hiddenProperties: Array.isArray(stored.hiddenProperties)
            ? stored.hiddenProperties
            : defaultDisplay.hiddenProperties,
        collapsedStatuses: Array.isArray(stored.collapsedStatuses)
            ? stored.collapsedStatuses
            : defaultDisplay.collapsedStatuses,
        collapsedLanes: Array.isArray(stored.collapsedLanes)
            ? stored.collapsedLanes
            : defaultDisplay.collapsedLanes,
    }),
);
