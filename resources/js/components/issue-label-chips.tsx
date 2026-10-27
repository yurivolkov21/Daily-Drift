import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export function IssueLabelChips({
    labelIds = [],
    className,
}: {
    labelIds?: string[];
    className?: string;
}) {
    const labels = (usePage().props.workspace?.labels ?? []).filter(({ id }) =>
        labelIds.includes(id),
    );

    if (labels.length === 0) {
        return null;
    }

    return (
        <div className={cn('flex flex-wrap items-center gap-1', className)}>
            {labels.map((label) => (
                <span
                    key={label.id}
                    className="inline-flex h-5 items-center gap-1.5 border px-1.5 text-[0.7rem] text-muted-foreground"
                >
                    <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                </span>
            ))}
        </div>
    );
}
