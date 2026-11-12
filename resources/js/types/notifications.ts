import type { Hue } from '@/lib/hues';
import type { TaskEvent } from '@/types/activity';
import type { Priority } from '@/types/projects';

type Person = { id: number; name: string };

export type NotificationKind = 'assigned' | 'mentioned';

export type NotificationFilter = 'all' | 'unread' | 'mentions' | 'assigned';

/**
 * A stored notification (spec 0006). The actor, task and project are copies
 * made when it happened; `gone` says the task has been deleted since.
 */
export type NotificationItem = {
    id: string;
    kind: NotificationKind;
    read: boolean;
    createdAt: string;
    actor: Person | null;
    task: { id: number; title: string };
    project: { id: number; name: string; color: Hue };
    commentId: number | null;
    /** The comment's first line, for a mention. */
    excerpt: string | null;
    gone: boolean;
};

/** An open task of the viewer's due today or tomorrow. Never stored. */
export type DueSoonItem = {
    id: number;
    title: string;
    dueOn: string;
    when: 'today' | 'tomorrow';
    priority: Priority;
    project: { id: number; name: string; color: Hue };
};

/** What the bell's panel loads when it opens. */
export type NotificationPanel = {
    updates: NotificationItem[];
    dueSoon: DueSoonItem[];
    unread: number;
};

/** The notification picked on the notifications page. */
export type NotificationDetail = NotificationItem & {
    /** The task as it is now, or null once it is deleted. */
    task: {
        id: number;
        title: string;
        completed: boolean;
        dueOn: string | null;
        priority: Priority;
        list: string;
        assignee: Person | null;
        project: { id: number; name: string; color: Hue; archived: boolean };
    } | null;
    snapshot: { id: number; title: string };
    comment: {
        id: number;
        body: string;
        author: Person | null;
        createdAt: string;
        mentionNames: string[];
    } | null;
    canReply: boolean;
    recent: (TaskEvent & { quote: string | null; isThis: boolean })[];
};

export type NotificationCounts = Record<NotificationFilter, number>;
