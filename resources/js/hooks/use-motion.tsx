import { useSyncExternalStore } from 'react';

/**
 * The Motion setting: follow the operating system, or force reduced or full
 * motion. Stored in the `motion` cookie and mirrored as `data-motion` on
 * <html>, which the server also sets on the first render.
 */
export type Motion = 'system' | 'reduced' | 'full';

const listeners = new Set<() => void>();

const readMotion = (): Motion => {
    if (typeof document === 'undefined') {
        return 'system';
    }

    const value = document.documentElement.dataset.motion;

    return value === 'reduced' || value === 'full' ? value : 'system';
};

/**
 * Whether animations should be skipped right now, for motion that runs in
 * JavaScript (count-ups, scripted scrolling). CSS handles the rest.
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') {
        return true;
    }

    const motion = readMotion();

    if (motion !== 'system') {
        return motion === 'reduced';
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useMotion() {
    const motion = useSyncExternalStore(
        (callback) => {
            listeners.add(callback);

            return () => listeners.delete(callback);
        },
        readMotion,
        () => 'system' as Motion,
    );

    const updateMotion = (value: Motion): void => {
        document.documentElement.dataset.motion = value;
        document.cookie = `motion=${value};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
        listeners.forEach((listener) => listener());
    };

    return { motion, updateMotion } as const;
}
