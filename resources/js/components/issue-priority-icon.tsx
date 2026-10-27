import { cn } from '@/lib/utils';
import type { IssuePriority } from '@/types';

export function IssuePriorityIcon({
    priority,
    className,
}: {
    priority: IssuePriority;
    className?: string;
}) {
    if (priority === 0) {
        return (
            <svg
                viewBox="0 0 14 14"
                aria-hidden="true"
                className={cn(
                    'size-3.5 shrink-0 text-muted-foreground',
                    className,
                )}
            >
                <path
                    d="M2 7.5h2M6 7.5h2M10 7.5h2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            </svg>
        );
    }

    if (priority === 4) {
        return (
            <svg
                viewBox="0 0 14 14"
                aria-hidden="true"
                className={cn('size-3.5 shrink-0 text-orange-500', className)}
            >
                <rect x="1" y="1" width="12" height="12" fill="currentColor" />
                <path
                    d="M7 3.8v4"
                    stroke="white"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
                <circle cx="7" cy="10.2" r="0.9" fill="white" />
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 14 14"
            aria-hidden="true"
            className={cn('size-3.5 shrink-0 text-foreground/80', className)}
        >
            {[
                { x: 1.5, y: 8, height: 4 },
                { x: 5.5, y: 5, height: 7 },
                { x: 9.5, y: 2, height: 10 },
            ].map((bar, index) => (
                <rect
                    key={bar.x}
                    x={bar.x}
                    y={bar.y}
                    width="3"
                    height={bar.height}
                    fill="currentColor"
                    opacity={index < priority ? 1 : 0.25}
                />
            ))}
        </svg>
    );
}
