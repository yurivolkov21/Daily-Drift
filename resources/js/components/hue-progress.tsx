import type { CSSProperties, ReactNode } from 'react';
import type { Hue } from '@/lib/hues';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';

const STROKES: Record<Hue, string> = {
    slate: 'stroke-slate-500',
    red: 'stroke-red-500',
    orange: 'stroke-orange-500',
    amber: 'stroke-amber-500',
    green: 'stroke-green-500',
    teal: 'stroke-teal-500',
    blue: 'stroke-blue-500',
    indigo: 'stroke-indigo-500',
    violet: 'stroke-violet-500',
    pink: 'stroke-pink-500',
};

/** A small progress ring in the hue, for column headers. */
export function ProgressRing({
    value,
    hue,
    size = 16,
    stroke = 2.5,
    children,
}: {
    value: number;
    hue: Hue;
    size?: number;
    stroke?: number;
    /** Shown in the middle of larger rings, such as the percentage. */
    children?: ReactNode;
}) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    const ring = (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="shrink-0 -rotate-90"
            role="img"
            aria-label={`${value}% complete`}
        >
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                className="stroke-current opacity-15"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - value / 100)}
                className={cn('animate-draw', STROKES[hue])}
                style={
                    {
                        '--ring-length': `${circumference}px`,
                    } as CSSProperties
                }
            />
        </svg>
    );

    if (!children) {
        return ring;
    }

    return (
        <span
            className="relative inline-flex shrink-0 items-center justify-center"
            style={{ width: size, height: size }}
        >
            {ring}
            <span className="absolute text-[11px] font-bold tabular-nums">
                {children}
            </span>
        </span>
    );
}

/** A thin progress bar filled in the hue. */
export function HueBar({
    value,
    hue,
    className,
    delay,
}: {
    value: number;
    hue: Hue;
    className?: string;
    /** Animation delay, to stagger bars in a grid. */
    delay?: string;
}) {
    return (
        <div
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn(
                'h-1.5 overflow-hidden rounded-full bg-muted',
                className,
            )}
        >
            <div
                className={cn(
                    'h-full origin-left animate-fill rounded-full',
                    HUES[hue].bar,
                )}
                style={{ width: `${value}%`, animationDelay: delay }}
            />
        </div>
    );
}

/**
 * A bar split by list, each part as wide as its share of the tasks and
 * filled in the list's hue. Empty projects show an empty track.
 */
export function ListBar({
    lists,
    className,
    delay,
}: {
    lists: { id: number; name: string; color: Hue; taskCount: number | null }[];
    className?: string;
    delay?: string;
}) {
    const label = lists
        .map((list) => `${list.name} ${list.taskCount ?? 0}`)
        .join(', ');

    return (
        <span
            role="img"
            aria-label={label}
            className={cn('flex h-2 gap-0.5 rounded-full bg-muted', className)}
        >
            {lists
                .filter((list) => (list.taskCount ?? 0) > 0)
                .map((list) => (
                    <span
                        key={list.id}
                        className={cn(
                            'origin-left animate-fill rounded-full',
                            HUES[list.color].bar,
                        )}
                        style={{
                            flexGrow: list.taskCount ?? 0,
                            flexBasis: 0,
                            animationDelay: delay,
                        }}
                    />
                ))}
        </span>
    );
}
