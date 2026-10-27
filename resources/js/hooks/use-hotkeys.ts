import { useEffect, useRef } from 'react';

export type Hotkey = {
    /**
     * A single key ("c"), a modifier combination ("mod+k"), or a two key
     * sequence ("g i"). "mod" is Cmd on macOS and Ctrl elsewhere.
     */
    keys: string;
    handler: (event: KeyboardEvent) => void;
};

type HotkeyGroup = { current: Hotkey[] };

const sequenceTimeout = 1000;

const registeredGroups = new Set<HotkeyGroup>();

let pendingSequenceKey: string | null = null;
let pendingSequenceTimer: ReturnType<typeof setTimeout> | undefined;

function registeredHotkeys(): Hotkey[] {
    return [...registeredGroups].flatMap((group) => group.current);
}

function isTypingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    );
}

/**
 * Enter on a focused button or link must keep activating that element.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        target.closest(
            'a, button, [role="button"], [role="menuitem"], [role="option"], [role="tab"]',
        ) !== null
    );
}

function isInsideDialog(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        target.closest('[role="dialog"], [role="alertdialog"]') !== null
    );
}

function run(hotkey: Hotkey | undefined, event: KeyboardEvent): boolean {
    if (!hotkey) {
        return false;
    }

    event.preventDefault();
    hotkey.handler(event);

    return true;
}

function handleKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || event.repeat) {
        return;
    }

    const key = event.key.toLowerCase();
    const hotkeys = registeredHotkeys();

    if (event.metaKey || event.ctrlKey) {
        if (!event.altKey) {
            run(
                hotkeys.find((hotkey) => hotkey.keys === `mod+${key}`),
                event,
            );
        }

        return;
    }

    if (
        event.altKey ||
        isTypingTarget(event.target) ||
        isInsideDialog(event.target) ||
        (key === 'enter' && isInteractiveTarget(event.target))
    ) {
        return;
    }

    if (pendingSequenceKey !== null) {
        const sequence = `${pendingSequenceKey} ${key}`;

        pendingSequenceKey = null;
        clearTimeout(pendingSequenceTimer);
        run(
            hotkeys.find((hotkey) => hotkey.keys === sequence),
            event,
        );

        return;
    }

    if (hotkeys.some((hotkey) => hotkey.keys.startsWith(`${key} `))) {
        pendingSequenceKey = key;
        pendingSequenceTimer = setTimeout(() => {
            pendingSequenceKey = null;
        }, sequenceTimeout);

        return;
    }

    run(
        hotkeys.find((hotkey) => hotkey.keys === key),
        event,
    );
}

/**
 * Register keyboard shortcuts while the calling component is mounted.
 *
 * All shortcuts share one listener so that sequences like "g p" are never
 * mistaken for the single key shortcut "p" registered by another component.
 */
export function useHotkeys(hotkeys: Hotkey[]): void {
    const group = useRef(hotkeys);

    useEffect(() => {
        group.current = hotkeys;
    });

    useEffect(() => {
        registeredGroups.add(group);

        if (registeredGroups.size === 1) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            registeredGroups.delete(group);

            if (registeredGroups.size === 0) {
                window.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, []);
}
