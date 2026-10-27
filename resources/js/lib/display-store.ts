import { useSyncExternalStore } from 'react';

/**
 * Create a hook for display options that this browser remembers, shared by
 * every component that reads them. The parser keeps only stored values that
 * this version understands.
 */
export function createDisplayStore<T extends object>(
    storageKey: string,
    defaults: T,
    parse: (stored: Partial<T>) => T,
): () => [T, (changes: Partial<T>) => void] {
    const listeners = new Set<() => void>();
    let current: T | null = null;

    const read = (): T => {
        try {
            return parse(JSON.parse(localStorage.getItem(storageKey) ?? '{}'));
        } catch {
            return defaults;
        }
    };

    const get = (): T => {
        if (typeof window === 'undefined') {
            return defaults;
        }

        current ??= read();

        return current;
    };

    const subscribe = (callback: () => void) => {
        listeners.add(callback);

        return () => listeners.delete(callback);
    };

    const update = (changes: Partial<T>): void => {
        current = { ...get(), ...changes };

        try {
            localStorage.setItem(storageKey, JSON.stringify(current));
        } catch {
            // Storage can be full or blocked; the options still apply until reload.
        }

        listeners.forEach((listener) => listener());
    };

    return function useDisplayStore() {
        return [useSyncExternalStore(subscribe, get, () => defaults), update];
    };
}

/**
 * Add the value to the list, or take it out if it is already there.
 */
export function toggled<T>(values: T[], value: T): T[] {
    return values.includes(value)
        ? values.filter((candidate) => candidate !== value)
        : [...values, value];
}
