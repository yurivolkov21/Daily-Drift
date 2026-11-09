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

/** A move from the keyboard: Alt + an arrow key. */
export type TaskStep = 'up' | 'down' | 'left' | 'right';

const STEPS: Record<string, TaskStep> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
};

type Props = {
    teamSlug: string;
    task: Task;
    canManage: boolean;
    onOpen?: (task: Task) => void;
    onStep?: (task: Task, step: TaskStep) => void;
    isOverlay?: boolean;
};

/**
 * The whole card is the drag handle (mouse, touch, or Space and Enter from
 * the keyboard). Clicking it, or the title with Enter, opens the task.
 * Alt + an arrow key moves it one place up or down, or to the next list.
 * While dragging, the card's place shows as a dashed slot.
 */
export function TaskCard({
    teamSlug,
    task,
    canManage,
    onOpen,
    onStep,
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
                aria-keyshortcuts={
                    canManage
                        ? 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight'
                        : undefined
                }
                data-task-id={task.id}
                onClick={() => onOpen?.(task)}
                onKeyDownCapture={(event) => {
                    const step = STEPS[event.key];

                    // Capture runs before dnd-kit's own keys (Space, Enter, arrows while dragging).
                    if (canManage && event.altKey && step && onStep) {
                        event.preventDefault();
                        event.stopPropagation();
                        onStep(task, step);
                    }
                }}
                className={cn(
                    'flex cursor-pointer flex-col gap-2 rounded-[14px] border border-border/80 bg-card p-3 text-left transition-[border-color,box-shadow,translate] duration-250 ease-slide outline-none hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_14px_28px_-18px_rgb(40_30_120/0.45)] focus-visible:ring-2 focus-visible:ring-ring',
                    completed && 'bg-card/70',
                    isOverlay &&
                        'rotate-2 shadow-[0_24px_44px_-20px_rgb(23_21_59/0.5)]',
                    // The card's place while it is dragged: a dashed slot.
                    !isOverlay &&
                        'data-[dragging=true]:translate-y-0 data-[dragging=true]:border-2 data-[dragging=true]:border-dashed data-[dragging=true]:border-primary/50 data-[dragging=true]:bg-primary/5 data-[dragging=true]:opacity-100 data-[dragging=true]:shadow-none [&[data-dragging=true]>*]:invisible',
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
                <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 pl-6.5">
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
