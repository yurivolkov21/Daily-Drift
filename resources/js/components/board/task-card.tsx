import { router } from '@inertiajs/react';
import { KanbanItem, KanbanItemHandle } from '@/components/reui/kanban';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { complete } from '@/routes/tasks';
import type { Task } from '@/types';
import { CreatorAvatar, DueLabel, PriorityPill } from './task-badges';

/** Kanban item keys; see columnKey for why ids get a prefix. */
export const itemKey = (task: Pick<Task, 'id'>) => `task-${task.id}`;

export const taskIdFromKey = (key: string) => Number(key.replace('task-', ''));

type Props = {
    teamSlug: string;
    task: Task;
    canManage: boolean;
    onOpen?: (task: Task) => void;
    isOverlay?: boolean;
};

/**
 * The whole card is the drag handle (mouse, touch, or Space and Enter from
 * the keyboard). Clicking it, or the title with Enter, opens the task.
 */
export function TaskCard({
    teamSlug,
    task,
    canManage,
    onOpen,
    isOverlay = false,
}: Props) {
    const completed = task.completedAt !== null;
    // Keys pressed on the checkbox or title must not start a keyboard drag.
    const keepKeys = (event: React.KeyboardEvent) => event.stopPropagation();

    return (
        <KanbanItem value={itemKey(task)} disabled={!canManage} asChild>
            <KanbanItemHandle
                cursor={canManage}
                aria-label={task.title}
                onClick={() => onOpen?.(task)}
                className={cn(
                    'flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3 text-left shadow-xs transition-[border-color,box-shadow] outline-none hover:border-ring/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring',
                    completed && 'bg-card/60',
                    isOverlay && 'rotate-2 shadow-lg',
                )}
            >
                <div className="flex items-start gap-2.5">
                    <Checkbox
                        checked={completed}
                        disabled={!canManage}
                        aria-label={
                            completed
                                ? `Reopen ${task.title}`
                                : `Complete ${task.title}`
                        }
                        className="mt-0.5 rounded-full data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={keepKeys}
                        onCheckedChange={(checked) =>
                            router.visit(
                                complete({
                                    current_team: teamSlug,
                                    task: task.id,
                                }),
                                {
                                    data: { completed: checked === true },
                                    preserveScroll: true,
                                    preserveState: true,
                                },
                            )
                        }
                    />
                    <button
                        type="button"
                        tabIndex={-1}
                        onKeyDown={keepKeys}
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpen?.(task);
                        }}
                        className={cn(
                            'text-left text-sm leading-snug font-medium outline-none',
                            completed &&
                                'text-muted-foreground line-through decoration-muted-foreground/50',
                        )}
                    >
                        {task.title}
                    </button>
                </div>
                {task.description && !completed && (
                    <p className="line-clamp-2 pl-6.5 text-xs whitespace-pre-line text-muted-foreground">
                        {task.description}
                    </p>
                )}
                <div className="flex min-h-6 items-center gap-2 pl-6.5">
                    {!completed && <PriorityPill priority={task.priority} />}
                    <DueLabel task={task} />
                    <CreatorAvatar
                        name={task.creatorName}
                        className="ml-auto"
                    />
                </div>
            </KanbanItemHandle>
        </KanbanItem>
    );
}
