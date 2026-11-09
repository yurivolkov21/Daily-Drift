import type { Hue } from '@/lib/hues';

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export type Task = {
    id: number;
    listId: number;
    title: string;
    description: string | null;
    priority: Priority;
    /** Date only, `YYYY-MM-DD`. */
    dueOn: string | null;
    completedAt: string | null;
    position: number;
    creatorName: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

export type TaskList = {
    id: number;
    name: string;
    color: Hue;
    position: number;
    /** Null on pages that do not load tasks. */
    tasks: Task[] | null;
    /** Null on pages that do not count tasks. */
    taskCount: number | null;
};

export type ProjectAbilities = {
    update: boolean;
    archive: boolean;
    restore: boolean;
    delete: boolean;
    manageLists: boolean;
};

export type ProjectHealth = 'attention' | 'track';

export type ProjectStats = {
    tasks: number;
    completed: number;
    overdue: number;
    dueSoon: number;
    /** Completed in the last 7 days. */
    completedRecently: number;
    /** Date only, `YYYY-MM-DD`. */
    oldestOverdueOn: string | null;
    health: ProjectHealth;
};

export type ProjectSort = 'updated' | 'name' | 'progress' | 'overdue';

/** The projects page's tab, view, sort and filters (`App\Data\ProjectFilters`). */
export type ProjectFilters = {
    status: 'active' | 'archived';
    view: 'grid' | 'list';
    sort: ProjectSort;
    health: ProjectHealth | null;
    colors: Hue[];
};

export type Project = {
    id: number;
    name: string;
    description: string | null;
    color: Hue;
    archivedAt: string | null;
    updatedAt: string | null;
    creatorName: string | null;
    lists: TaskList[];
    stats: ProjectStats;
    can: ProjectAbilities;
};

export type RecentProject = Pick<Project, 'id' | 'name' | 'color'> & {
    /** Open (not completed) tasks. */
    open: number;
};
