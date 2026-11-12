import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { labelIcon } from '@/lib/label-icons';
import { cn } from '@/lib/utils';
import type { Label, TeamLabel } from '@/types';

/**
 * A label as an outline badge with its icon and name, in the text color
 * (spec 0007, round 7): shadcn/ui's outline badge with an icon.
 */
export function LabelBadge({
    label,
    size = 'sm',
    className,
}: {
    label: Label;
    size?: 'sm' | 'md';
    className?: string;
}) {
    const Icon = labelIcon(label.icon);

    return (
        <span
            className={cn(
                'inline-flex max-w-full shrink-0 items-center gap-1 rounded-md border border-border bg-card font-semibold whitespace-nowrap text-foreground/85',
                size === 'sm'
                    ? 'h-[22px] px-1.5 text-[11.5px] [&>svg]:size-3'
                    : 'h-7 px-2 text-[12.5px] [&>svg]:size-3.5',
                className,
            )}
        >
            <Icon
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
            />
            <span className="truncate">{label.name}</span>
        </span>
    );
}

/** The team's labels from the board page, by id. */
export function useTeamLabels(): {
    labels: TeamLabel[];
    byId: Map<number, TeamLabel>;
} {
    const labels = (usePage().props.labels as TeamLabel[] | undefined) ?? EMPTY;

    return useMemo(
        () => ({
            labels,
            byId: new Map(labels.map((label) => [label.id, label])),
        }),
        [labels],
    );
}

const EMPTY: TeamLabel[] = [];
