import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * A thin bar with a "done/total" count, shown only when there are sub-tasks.
 */
export function SubtaskProgress({
    completed,
    total,
    className,
}: {
    completed: number;
    total: number;
    className?: string;
}) {
    if (total === 0) {
        return null;
    }

    return (
        <div className={cn('flex min-w-0 items-center gap-2', className)}>
            <Progress
                value={(completed / total) * 100}
                aria-label={`${completed} of ${total} sub-tasks done`}
                className="flex-1 gap-0 [&_[data-slot=progress-track]]:h-1"
            />
            <span className="text-[11px] text-muted-foreground tabular-nums">
                {completed}/{total}
            </span>
        </div>
    );
}
