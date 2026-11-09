import type { Hue } from '@/lib/hues';
import type { Priority } from '@/types/projects';

/** A row on My tasks (`App\Queries\MyTasks`). */
export type MyTask = {
    id: number;
    title: string;
    priority: Priority;
    dueOn: string | null;
    completedAt: string | null;
    project: { id: number; name: string; color: Hue };
    list: { id: number; name: string; color: Hue };
};

export type MyTaskGroup = 'overdue' | 'today' | 'week' | 'later' | 'none';

export type MyTasksData = {
    today: string;
    groups: Record<MyTaskGroup, MyTask[]>;
    done: MyTask[];
    projects: { id: number; name: string; color: Hue; count: number }[];
    openCount: number;
};
