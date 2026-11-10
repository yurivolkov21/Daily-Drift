import type { Hue } from '@/lib/hues';

type Person = { id: number; name: string };

/** One row of the event log (`App\Models\Activity`, spec 0005). */
export type TaskEvent = {
    id: number;
    type: string;
    properties: Record<string, string | number | null | undefined>;
    actor: Person | null;
    createdAt: string;
};

export type TaskComment = {
    id: number;
    body: string;
    /** Ids of the team members mentioned as `@Name`. */
    mentions: number[];
    author: Person | null;
    createdAt: string;
    edited: boolean;
    canEdit: boolean;
    canDelete: boolean;
};

/** What the task sheet loads when it opens. */
export type TaskActivity = {
    comments: TaskComment[];
    events: TaskEvent[];
    /** Set when the task is older than the event log. */
    historyStartsAt: string | null;
    canComment: boolean;
};

export type FeedFilter = 'all' | 'comments' | 'completed';

/** A row of the dashboard's Activity card (`App\Queries\TeamFeed`). */
export type FeedItem = TaskEvent & {
    task: { id: number; title: string } | null;
    project: { id: number; name: string; color: Hue };
    quote: string | null;
};

export type TeamFeed = { filter: FeedFilter; items: FeedItem[] };
