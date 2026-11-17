import {
    CalendarDays,
    Flag,
    ListChecks,
    Paperclip,
    Repeat,
} from 'lucide-react';
import { MemberAvatar } from '@/components/member-avatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLocalTime } from '@/hooks/use-local-time';
import { dueState, formatDue, initials, PRIORITIES } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import type { ChecklistItem, Priority, RepeatRule, Task } from '@/types';

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
    task: Pick<Task, 'dueOn' | 'completedAt'> & { repeat?: RepeatRule | null };
    className?: string;
}) {
    const { today } = useLocalTime();

    if (!task.dueOn) {
        return null;
    }

    const state = dueState(task, today);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-xs whitespace-nowrap',
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
            {task.repeat && <RepeatIcon />}
        </span>
    );
}

/** Beside a due date: the task repeats (spec 0010). */
export function RepeatIcon({ className }: { className?: string }) {
    return (
        <span
            title="Repeats"
            className={cn('inline-flex text-primary', className)}
        >
            <Repeat className="size-3.5" aria-hidden="true" />
            <span className="sr-only">, repeats</span>
        </span>
    );
}

/**
 * How much of the checklist is checked, "2/5", green once it all is
 * (spec 0010).
 */
export function ChecklistCount({ items }: { items: ChecklistItem[] }) {
    if (items.length === 0) {
        return null;
    }

    const checked = items.filter((item) => item.checked).length;

    return (
        <span
            title={`Checklist: ${checked} of ${items.length} checked`}
            className={cn(
                'inline-flex h-5.5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-bold tabular-nums',
                checked === items.length
                    ? 'bg-green-500/12 text-green-700 dark:text-green-400'
                    : 'bg-muted text-muted-foreground',
            )}
        >
            <ListChecks className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Checklist: </span>
            {checked}/{items.length}
        </span>
    );
}

/** A paperclip with the number of files (spec 0010). */
export function FileCount({ count }: { count: number }) {
    if (count === 0) {
        return null;
    }

    return (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Paperclip className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Files: </span>
            {count}
        </span>
    );
}

/** The assignee on a card, with their name on hover (spec 0004). */
export function AssigneeAvatar({
    id,
    name,
    className,
}: {
    id: number;
    name: string;
    className?: string;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    tabIndex={-1}
                    className={cn('animate-pop rounded-full', className)}
                >
                    <MemberAvatar id={id} name={name} />
                    <span className="sr-only">Assigned to {name}</span>
                </span>
            </TooltipTrigger>
            <TooltipContent>Assigned to {name}</TooltipContent>
        </Tooltip>
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
