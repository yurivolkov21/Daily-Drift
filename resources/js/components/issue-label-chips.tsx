import { usePage } from '@inertiajs/react';
import { labelTextColor } from '@/lib/issues';
import { cn } from '@/lib/utils';

const chip =
    'inline-flex h-5 max-w-full shrink-0 items-center rounded-[4px] px-2 text-[0.7rem] font-semibold tracking-normal normal-case';

/**
 * One label as a solid chip in its own color.
 */
export function IssueLabel({
    name,
    color,
    className,
}: {
    name: string;
    color: string;
    className?: string;
}) {
    return (
        <span
            className={cn(chip, className)}
            style={{ backgroundColor: color, color: labelTextColor(color) }}
        >
            <span className="truncate">{name}</span>
        </span>
    );
}

/**
 * The issue's labels as chips; with a maximum, the rest fold into "+2".
 */
export function IssueLabelChips({
    labelIds = [],
    max,
    className,
}: {
    labelIds?: string[];
    max?: number;
    className?: string;
}) {
    const labels = (usePage().props.workspace?.labels ?? []).filter(({ id }) =>
        labelIds.includes(id),
    );

    if (labels.length === 0) {
        return null;
    }

    const shown = max === undefined ? labels : labels.slice(0, max);
    const folded = labels.slice(shown.length);

    return (
        <div className={cn('flex flex-wrap items-center gap-1', className)}>
            {shown.map((label) => (
                <IssueLabel
                    key={label.id}
                    name={label.name}
                    color={label.color}
                />
            ))}
            {folded.length > 0 ? (
                <span
                    className={cn(chip, 'bg-muted text-muted-foreground')}
                    title={folded.map((label) => label.name).join(', ')}
                >
                    +{folded.length}
                </span>
            ) : null}
        </div>
    );
}
