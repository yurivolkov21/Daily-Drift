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
}: {
    value: number;
    hue: Hue;
    size?: number;
}) {
    const radius = (size - 3) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
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
                strokeWidth={2.5}
                className="stroke-current opacity-15"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - value / 100)}
                className={STROKES[hue]}
            />
        </svg>
    );
}

/** A thin progress bar filled in the hue. */
export function HueBar({
    value,
    hue,
    className,
}: {
    value: number;
    hue: Hue;
    className?: string;
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
                className={cn('h-full rounded-full', HUES[hue].bar)}
                style={{ width: `${value}%` }}
            />
        </div>
    );
}
