import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const chip =
    'inline-flex h-5 shrink-0 items-center gap-1.5 border px-1.5 text-[0.7rem] text-muted-foreground';

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
                <span key={label.id} className={chip}>
                    <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                </span>
            ))}
            {folded.length > 0 ? (
                <span
                    className={chip}
                    title={folded.map((label) => label.name).join(', ')}
                >
                    +{folded.length}
                </span>
            ) : null}
        </div>
    );
}
