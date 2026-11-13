const SCROLL_IDLE_MS = 900;

const timers = new WeakMap<Element, number>();

/**
 * Marks an element with `data-scrolling` while it scrolls, so the thin
 * scrollbar (the `thin-scrollbar` utility) can show and then fade out.
 */
export function initializeScrollState(): void {
    if (typeof window === 'undefined') {
        return;
    }

    document.addEventListener(
        'scroll',
        (event) => {
            const target =
                event.target instanceof Element
                    ? event.target
                    : document.scrollingElement;

            if (!target) {
                return;
            }

            if (!target.hasAttribute('data-scrolling')) {
                target.setAttribute('data-scrolling', '');
            }

            window.clearTimeout(timers.get(target));
            timers.set(
                target,
                window.setTimeout(
                    () => target.removeAttribute('data-scrolling'),
                    SCROLL_IDLE_MS,
                ),
            );
        },
        { capture: true, passive: true },
    );
}
