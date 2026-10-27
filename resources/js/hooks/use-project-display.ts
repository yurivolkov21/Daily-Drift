import { createDisplayStore } from '@/lib/display-store';
import type { ProjectStatus } from '@/types';

export type ProjectView = 'table' | 'cards' | 'groups';

export type ProjectDisplay = {
    view: ProjectView;
    collapsedStatuses: ProjectStatus[];
};

const views: ProjectView[] = ['table', 'cards', 'groups'];

/**
 * How this browser shows the projects page: as a table, cards or groups by
 * status, and which status groups are folded.
 */
export const useProjectDisplay = createDisplayStore<ProjectDisplay>(
    'project-display',
    { view: 'table', collapsedStatuses: [] },
    (stored) => ({
        view: views.includes(stored.view as ProjectView)
            ? (stored.view as ProjectView)
            : 'table',
        collapsedStatuses: Array.isArray(stored.collapsedStatuses)
            ? stored.collapsedStatuses
            : [],
    }),
);
