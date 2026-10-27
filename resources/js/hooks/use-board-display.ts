import { useSyncExternalStore } from 'react';
import type { IssueStatus } from '@/types';

export type BoardDensity = 'compact' | 'detailed';

export type BoardLanes = 'none' | 'project' | 'assignee';

export type BoardProperty =
    | 'priority'
    | 'labels'
    | 'dueDate'
    | 'assignee'
    | 'progress';

export type BoardDisplay = {
    density: BoardDensity;
    lanes: BoardLanes;
    hiddenProperties: BoardProperty[];
    collapsedStatuses: IssueStatus[];
    collapsedLanes: string[];
};

const storageKey = 'board-display';

const defaultDisplay: BoardDisplay = {
    density: 'compact',
    lanes: 'none',
    hiddenProperties: [],
    collapsedStatuses: ['done', 'canceled'],
    collapsedLanes: [],
};

const listeners = new Set<() => void>();
let currentDisplay: BoardDisplay | null = null;

/**
 * Read the saved options, keeping only values this version understands.
 */
function storedDisplay(): BoardDisplay {
    try {
        const stored: Partial<BoardDisplay> = JSON.parse(
            localStorage.getItem(storageKey) ?? '{}',
        );

        return {
            density: stored.density === 'detailed' ? 'detailed' : 'compact',
            lanes:
                stored.lanes === 'project' || stored.lanes === 'assignee'
                    ? stored.lanes
                    : 'none',
            hiddenProperties: Array.isArray(stored.hiddenProperties)
                ? stored.hiddenProperties
                : defaultDisplay.hiddenProperties,
            collapsedStatuses: Array.isArray(stored.collapsedStatuses)
                ? stored.collapsedStatuses
                : defaultDisplay.collapsedStatuses,
            collapsedLanes: Array.isArray(stored.collapsedLanes)
                ? stored.collapsedLanes
                : defaultDisplay.collapsedLanes,
        };
    } catch {
        return defaultDisplay;
    }
}

function getDisplay(): BoardDisplay {
    if (typeof window === 'undefined') {
        return defaultDisplay;
    }

    currentDisplay ??= storedDisplay();

    return currentDisplay;
}

function subscribe(callback: () => void): () => void {
    listeners.add(callback);

    return () => listeners.delete(callback);
}

function updateDisplay(changes: Partial<BoardDisplay>): void {
    currentDisplay = { ...getDisplay(), ...changes };

    try {
        localStorage.setItem(storageKey, JSON.stringify(currentDisplay));
    } catch {
        // Storage can be full or blocked; the options still apply until reload.
    }

    listeners.forEach((listener) => listener());
}

/**
 * How the board is laid out for this browser: card density, swimlanes,
 * the properties shown on cards, and the collapsed columns and lanes.
 */
export function useBoardDisplay(): [
    BoardDisplay,
    (changes: Partial<BoardDisplay>) => void,
] {
    const display = useSyncExternalStore(
        subscribe,
        getDisplay,
        () => defaultDisplay,
    );

    return [display, updateDisplay];
}

/**
 * Add the value to the list, or take it out if it is already there.
 */
export function toggled<T>(values: T[], value: T): T[] {
    return values.includes(value)
        ? values.filter((candidate) => candidate !== value)
        : [...values, value];
}
