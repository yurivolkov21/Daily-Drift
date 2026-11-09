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
};

export type ProjectAbilities = {
    update: boolean;
    archive: boolean;
    restore: boolean;
    delete: boolean;
    manageLists: boolean;
};

export type ProjectStats = {
    tasks: number;
    completed: number;
    overdue: number;
    dueSoon: number;
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
