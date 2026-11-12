import { addDays, format, parseISO } from 'date-fns';
import { PRIORITY_NAMES } from '@/lib/tasks';
import type { Priority, Task } from '@/types';

export type DueFilter = 'overdue' | 'today' | 'week' | 'none';

/** `me`, `none` (unassigned) or a member's id. */
export type AssigneeFilter = 'me' | 'none' | number;

/** The board's filters (spec 0007), as kept in the query string. */
export type BoardFilters = {
    q: string;
    labels: number[];
    assignee: AssigneeFilter[];
    due: DueFilter[];
    priority: Priority[];
};

export const NO_FILTERS: BoardFilters = {
    q: '',
    labels: [],
    assignee: [],
    due: [],
    priority: [],
};

export const DUE_FILTERS: DueFilter[] = ['overdue', 'today', 'week', 'none'];

const list = (value: string | null): string[] =>
    (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const ids = (value: string | null): number[] =>
    list(value)
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0);

/** Read the filters from a query string; unknown values are ignored. */
export function readFilters(search: string): BoardFilters {
    const params = new URLSearchParams(search);

    return {
        q: (params.get('q') ?? '').slice(0, 100),
        labels: [...new Set(ids(params.get('labels')))],
        assignee: [
            ...new Set(
                list(params.get('assignee')).flatMap(
                    (value): AssigneeFilter[] => {
                        if (value === 'me' || value === 'none') {
                            return [value];
                        }

                        const id = Number(value);

                        return Number.isInteger(id) && id > 0 ? [id] : [];
                    },
                ),
            ),
        ],
        due: [
            ...new Set(
                list(params.get('due')).filter((value): value is DueFilter =>
                    (DUE_FILTERS as string[]).includes(value),
                ),
            ),
        ],
        priority: [
            ...new Set(
                list(params.get('priority')).filter(
                    (value): value is Priority =>
                        (PRIORITY_NAMES as string[]).includes(value),
                ),
            ),
        ],
    };
}

/** Put the filters in the address, keeping its other parameters (such as `task`). */
export function writeFilters(filters: BoardFilters): void {
    const url = new URL(window.location.href);
    const set = (key: string, values: (string | number)[]) =>
        values.length > 0
            ? url.searchParams.set(key, values.join(','))
            : url.searchParams.delete(key);

    if (filters.q.trim() !== '') {
        url.searchParams.set('q', filters.q);
    } else {
        url.searchParams.delete('q');
    }

    set('labels', filters.labels);
    set('assignee', filters.assignee);
    set('due', filters.due);
    set('priority', filters.priority);
    window.history.replaceState(window.history.state, '', url);
}

export function filtersOn(filters: BoardFilters): boolean {
    return (
        filters.q.trim() !== '' ||
        filters.labels.length > 0 ||
        filters.assignee.length > 0 ||
        filters.due.length > 0 ||
        filters.priority.length > 0
    );
}

/** Which due filter a task falls in, in the viewer's day; done tasks fall in none. */
export function dueKind(
    task: Pick<Task, 'dueOn' | 'completedAt'>,
    today: string,
): DueFilter | null {
    if (task.completedAt !== null) {
        return null;
    }

    if (!task.dueOn) {
        return 'none';
    }

    if (task.dueOn < today) {
        return 'overdue';
    }

    if (task.dueOn === today) {
        return 'today';
    }

    return task.dueOn <= format(addDays(parseISO(today), 7), 'yyyy-MM-dd')
        ? 'week'
        : null;
}

/**
 * Whether a task passes the filters: choices inside one filter widen the
 * result, different filters narrow it.
 */
export function matches(
    task: Task,
    filters: BoardFilters,
    me: number,
    today: string,
): boolean {
    const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean);

    if (
        words.length > 0 &&
        !words.every((word) => task.title.toLowerCase().includes(word))
    ) {
        return false;
    }

    if (
        filters.labels.length > 0 &&
        !task.labelIds.some((id) => filters.labels.includes(id))
    ) {
        return false;
    }

    if (
        filters.assignee.length > 0 &&
        !filters.assignee.some((who) =>
            who === 'none'
                ? task.assigneeId === null
                : task.assigneeId === (who === 'me' ? me : who),
        )
    ) {
        return false;
    }

    if (filters.due.length > 0) {
        const kind = dueKind(task, today);

        if (kind === null || !filters.due.includes(kind)) {
            return false;
        }
    }

    return (
        filters.priority.length === 0 ||
        filters.priority.includes(task.priority)
    );
}
