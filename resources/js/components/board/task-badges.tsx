import { CalendarDays, Flag } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { dueState, formatDue, initials, PRIORITIES } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import type { Priority, Task } from '@/types';

export function PriorityPill({ priority }: { priority: Priority }) {
    if (priority === 'none') {
        return null;
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
                PRIORITIES[priority].pill,
            )}
        >
            <Flag className="size-3" />
            {PRIORITIES[priority].label}
        </span>
    );
}

export function DueLabel({
    task,
    className,
}: {
    task: Pick<Task, 'dueOn' | 'completedAt'>;
    className?: string;
}) {
    if (!task.dueOn) {
        return null;
    }

    const state = dueState(task);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-xs',
                state === 'overdue' &&
                    'font-medium text-red-600 dark:text-red-400',
                state === 'today' &&
                    'font-medium text-amber-600 dark:text-amber-400',
                (state === 'later' || state === 'none') &&
                    'text-muted-foreground',
                className,
            )}
        >
            <CalendarDays className="size-3.5" />
            {state === 'overdue' && 'Overdue · '}
            {state === 'today' ? 'Today' : formatDue(task.dueOn)}
        </span>
    );
}

export function CreatorAvatar({
    name,
    className,
}: {
    name: string | null;
    className?: string;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Avatar className={cn('size-6', className)}>
                    <AvatarFallback className="bg-muted text-[10px] font-medium">
                        {initials(name)}
                    </AvatarFallback>
                </Avatar>
            </TooltipTrigger>
            <TooltipContent>
                {name ? `Created by ${name}` : 'Creator removed'}
            </TooltipContent>
        </Tooltip>
    );
}
