import {
    addDays,
    addMonths,
    endOfMonth,
    format,
    isValid,
    parse,
    parseISO,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import type { Priority, Task } from '@/types';

/** The ways to look at a project's tasks (spec 0008). */
export type ProjectView = 'board' | 'list' | 'calendar';

export const PROJECT_VIEWS: ProjectView[] = ['board', 'list', 'calendar'];

export type SortKey = 'title' | 'due' | 'priority';

export type ListSort = { key: SortKey; dir: 'asc' | 'desc' } | null;

const SORT_KEYS: SortKey[] = ['title', 'due', 'priority'];

/** Most urgent first when sorting by priority. */
const PRIORITY_RANK: Record<Priority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
    none: 4,
};

/** The view named in a query string, if any. */
export function readView(search: string): ProjectView | null {
    const view = new URLSearchParams(search).get('view');

    return view === 'list' || view === 'calendar' ? view : null;
}

/** `?sort=due`, or `?sort=-due` when reversed. */
export function readSort(search: string): ListSort {
    const value = new URLSearchParams(search).get('sort') ?? '';
    const dir = value.startsWith('-') ? 'desc' : 'asc';
    const key = value.replace(/^-/, '');

    return (SORT_KEYS as string[]).includes(key)
        ? { key: key as SortKey, dir }
        : null;
}

/** `?month=2026-11`, or null when missing or not a month. */
export function readMonth(search: string): string | null {
    const value = new URLSearchParams(search).get('month') ?? '';

    return /^\d{4}-\d{2}$/.test(value) &&
        isValid(parse(value, 'yyyy-MM', new Date()))
        ? value
        : null;
}

/**
 * Put the view and its sort or month in the address, keeping the filters
 * and the open task. The board is the default and takes no parameter.
 */
export function writeViewParams(
    view: ProjectView,
    sort: ListSort,
    month: string,
): void {
    const url = new URL(window.location.href);

    if (view === 'board') {
        url.searchParams.delete('view');
    } else {
        url.searchParams.set('view', view);
    }

    if (view === 'list' && sort) {
        url.searchParams.set(
            'sort',
            `${sort.dir === 'desc' ? '-' : ''}${sort.key}`,
        );
    } else {
        url.searchParams.delete('sort');
    }

    if (view === 'calendar') {
        url.searchParams.set('month', month);
    } else {
        url.searchParams.delete('month');
    }

    window.history.replaceState(window.history.state, '', url);
}

/** Ascending, descending, then back to the board's order. */
export function nextSort(sort: ListSort, key: SortKey): ListSort {
    if (!sort || sort.key !== key) {
        return { key, dir: 'asc' };
    }

    return sort.dir === 'asc' ? { key, dir: 'desc' } : null;
}

/** Sort a list's tasks; undated tasks stay last when sorting by due date. */
export function sortTasks(tasks: Task[], sort: ListSort): Task[] {
    if (!sort) {
        return tasks;
    }

    const dir = sort.dir === 'asc' ? 1 : -1;

    return [...tasks].sort((a, b) => {
        if (sort.key === 'title') {
            return a.title.localeCompare(b.title) * dir;
        }

        if (sort.key === 'priority') {
            return (
                (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * dir
            );
        }

        if (!a.dueOn || !b.dueOn) {
            return (a.dueOn ? 0 : 1) - (b.dueOn ? 0 : 1);
        }

        return a.dueOn.localeCompare(b.dueOn) * dir;
    });
}

/** Open tasks first, then by priority, as chips sit on a day. */
export function dayOrder(a: Task, b: Task): number {
    return (
        (a.completedAt ? 1 : 0) - (b.completedAt ? 1 : 0) ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.position - b.position
    );
}

export const ymd = (date: Date): string => format(date, 'yyyy-MM-dd');

/** The weeks shown for a month, Monday first, each as seven `Y-m-d` days. */
export function monthWeeks(month: string): string[][] {
    const first = parseISO(`${month}-01`);
    const start = startOfWeek(first, { weekStartsOn: 1 });
    const last = endOfMonth(first);
    const weeks: string[][] = [];

    for (let day = start; day <= last; day = addDays(day, 7)) {
        weeks.push(
            Array.from({ length: 7 }, (_, index) => ymd(addDays(day, index))),
        );
    }

    return weeks;
}

export function shiftMonth(month: string, by: number): string {
    return format(addMonths(parseISO(`${month}-01`), by), 'yyyy-MM');
}

export function monthOf(day: string): string {
    return format(startOfMonth(parseISO(day)), 'yyyy-MM');
}

export function shiftDay(day: string, by: number): string {
    return ymd(addDays(parseISO(day), by));
}

/** "Wed 18 Nov" */
export function shortDay(day: string): string {
    return format(parseISO(day), 'EEE d MMM');
}

/** The Monday after today (a week from today when today is a Monday). */
export function nextMonday(today: string): string {
    const day = parseISO(today);
    const ahead = (8 - day.getDay()) % 7 || 7;

    return ymd(addDays(day, ahead));
}

/**
 * Small things a person sets on a project's views, kept in this browser:
 * the last view, and the calendar's panel and hidden lists (spec 0008).
 */
export function remembered<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);

        return stored === null ? fallback : (JSON.parse(stored) as T);
    } catch {
        return fallback;
    }
}

export function remember(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage can be unavailable (private windows); the views still work.
    }
}

export const viewKey = (projectId: number) => `project.view.${projectId}`;
export const panelKey = (projectId: number) => `calendar.panel.${projectId}`;
export const hiddenKey = (projectId: number) => `calendar.hidden.${projectId}`;
