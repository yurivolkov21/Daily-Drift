import type { Hue } from '@/lib/hues';
import type { Priority } from '@/types/projects';

/** A task in My focus and Due today (`App\Queries\TeamDashboard`). */
export type FocusTask = {
    id: number;
    title: string;
    priority: Priority;
    /** Date only, `YYYY-MM-DD`. */
    dueOn: string | null;
    project: { id: number; name: string; color: Hue };
    list: { id: number; name: string; color: Hue };
};

export type FocusGroup = 'overdue' | 'today' | 'week';

export type DashboardData = {
    /** Date only, in the app's time zone. */
    today: string;
    activeProjects: number;
    week: { due: number; completed: number };
    stats: {
        open: { value: number; sinceMonday: number; series: number[] };
        dueToday: {
            value: number;
            byPriority: Record<Priority, number>;
            series: number[];
        };
        overdue: {
            value: number;
            projects: number;
            oldestOn: string | null;
            series: number[];
        };
        done: { value: number; previous: number; series: number[] };
    };
    throughput: {
        days: { date: string; count: number }[];
        previous7: number;
        previous14: number;
    };
    /** Every open task due today, team-wide. */
    dueToday: { total: number; items: FocusTask[] };
    /** The viewer's tasks and unassigned ones (spec 0004). */
    focus: Record<FocusGroup, { total: number; items: FocusTask[] }>;
    projects: {
        id: number;
        name: string;
        color: Hue;
        tasks: number;
        completed: number;
    }[];
};
