import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '@/hooks/use-motion';

/**
 * Counts from the previous value up (or down) to `value` with an ease-out
 * curve. With reduced motion it returns the value at once.
 */
export function useCountUp(value: number, duration = 1200, delay = 0): number {
    const [shown, setShown] = useState(() =>
        prefersReducedMotion() ? value : 0,
    );

    useEffect(() => {
        if (prefersReducedMotion()) {
            setShown(value);

            return;
        }

        let frame = 0;
        const from = shown;
        const startAt = performance.now() + delay;

        const step = (now: number) => {
            const progress = Math.min(
                1,
                Math.max(0, (now - startAt) / duration),
            );
            const eased = 1 - Math.pow(1 - progress, 3);

            setShown(Math.round(from + (value - from) * eased));

            if (progress < 1) {
                frame = requestAnimationFrame(step);
            }
        };

        frame = requestAnimationFrame(step);

        return () => cancelAnimationFrame(frame);
        // Only a new target restarts the count; `shown` is its starting point.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, duration, delay]);

    return shown;
}
