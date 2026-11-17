import type { Hue } from '@/lib/hues';

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

/** How a recurring task's schedule steps (spec 0010). */
export type RepeatUnit = 'day' | 'weekday' | 'week' | 'month' | 'year';

/**
 * Every 1 to 30 units; `weekday` is always every 1. The anchor, the date the
 * rule counts from, keeps "the 31st" for monthly and yearly rules.
 */
export type RepeatRule = {
    unit: RepeatUnit;
    every: number;
    anchorOn?: string | null;
};

/** One step of a task's checklist (spec 0010). */
export type ChecklistItem = { id: number; body: string; checked: boolean };

/** A file attached to a task (spec 0010). */
export type Attachment = {
    id: number;
    name: string;
    mimeType: string;
    size: number;
    isImage: boolean;
    uploaderId: number | null;
    uploaderName: string | null;
    createdAt: string | null;
};

export type Task = {
    id: number;
    listId: number;
    title: string;
    description: string | null;
    priority: Priority;
    /** Date only, `YYYY-MM-DD`. */
    dueOn: string | null;
    /** Null when the task does not repeat (spec 0010). */
    repeat: RepeatRule | null;
    completedAt: string | null;
    position: number;
    creatorName: string | null;
    /** One team member or nobody (spec 0004). */
    assigneeId: number | null;
    assigneeName: string | null;
    commentCount: number;
    /** Team labels on the task, up to 5 (spec 0007). */
    labelIds: number[];
    /** Empty on pages that do not load checklists (spec 0010). */
    checklist: ChecklistItem[];
    /** Empty on pages that do not load files (spec 0010). */
    attachments: Attachment[];
    createdAt: string | null;
    updatedAt: string | null;
};

export type TaskList = {
    id: number;
    name: string;
    color: Hue;
    position: number;
    /** The project's Done list: completing a task moves it here (spec 0010). */
    isDone: boolean;
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
    /** Owners and admins delete anyone's files (spec 0010). */
    deleteAnyFile: boolean;
    /** Have Claude write a new weekly summary (spec 0011). */
    summarize: boolean;
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
    /** Open tasks assigned to the viewer. */
    assignedToMe: number;
};

export type ProjectSort = 'updated' | 'name' | 'progress' | 'overdue';

/** The projects page's tab, view, sort and filters (`App\Data\ProjectFilters`). */
export type ProjectFilters = {
    status: 'active' | 'archived';
    view: 'grid' | 'list';
    sort: ProjectSort;
    health: ProjectHealth | null;
    colors: Hue[];
    /** Only projects with an open task assigned to the viewer. */
    mine: boolean;
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
