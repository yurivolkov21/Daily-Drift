import { Form, router } from '@inertiajs/react';
import {
    Check,
    ChevronRight,
    ChevronsLeft,
    MoreHorizontal,
    Palette,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { AddTask, openAddTask } from '@/components/board/add-task';
import type { TaskStep } from '@/components/board/task-card';
import { TaskCard } from '@/components/board/task-card';
import { ProgressRing } from '@/components/hue-progress';
import InputError from '@/components/input-error';
import {
    KanbanColumn,
    KanbanColumnContent,
    KanbanColumnHandle,
} from '@/components/reui/kanban';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { HUE_NAMES, HUES } from '@/lib/hues';
import { percent } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { destroy, update } from '@/routes/lists';
import type { Task, TaskList } from '@/types';

/**
 * Kanban column keys. Plain numeric keys would be reordered by JavaScript,
 * which sorts integer-like object keys, so every key gets a prefix.
 */
export const columnKey = (id: number) => `list-${id}`;

export const listIdFromKey = (key: string) => Number(key.replace('list-', ''));

type Props = {
    teamSlug: string;
    list: TaskList;
    /** The tasks shown in the column, which may differ from list.tasks while dragging. */
    tasks: Task[];
    canManage: boolean;
    onOpenTask?: (task: Task) => void;
    onStepTask?: (task: Task, step: TaskStep) => void;
    /** Folded to a narrow strip; it still takes dropped tasks. */
    folded?: boolean;
    onToggleFold?: () => void;
    isOverlay?: boolean;
    className?: string;
    style?: React.CSSProperties;
};

export function ListColumn({
    teamSlug,
    list,
    tasks,
    canManage,
    onOpenTask,
    onStepTask,
    folded = false,
    onToggleFold,
    isOverlay = false,
    className,
    style,
}: Props) {
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const parameters = { current_team: teamSlug, list: list.id };

    const done = tasks.filter((task) => task.completedAt !== null).length;
    const progress = percent(done, tasks.length);

    const title = (
        <>
            <ProgressRing value={progress} hue={list.color} />
            <span className="truncate text-sm font-semibold">{list.name}</span>
            <span
                key={tasks.length}
                className={cn(
                    'animate-bump rounded-full bg-card/70 px-2 py-px text-xs font-semibold text-muted-foreground tabular-nums',
                )}
            >
                {tasks.length}
            </span>
        </>
    );

    if (folded && !isOverlay) {
        return (
            <KanbanColumn
                value={columnKey(list.id)}
                disabled={!canManage}
                aria-label={`${list.name}, folded`}
                style={style}
                className={cn(
                    'w-[52px] shrink-0 self-stretch rounded-[20px] border-0 transition-[background-color,box-shadow] duration-300',
                    HUES[list.color].column,
                    className,
                )}
            >
                <button
                    type="button"
                    onClick={onToggleFold}
                    aria-expanded={false}
                    aria-label={`Show the ${list.name} list, ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
                    title={`Show ${list.name}`}
                    className="flex h-full min-h-60 w-full flex-col items-center gap-3 rounded-[20px] py-4 outline-none hover:bg-card/40 focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ChevronRight className="size-4 text-muted-foreground" />
                    <ProgressRing value={progress} hue={list.color} />
                    <span className="text-sm font-bold [writing-mode:vertical-rl]">
                        {list.name}
                    </span>
                    <span
                        key={tasks.length}
                        className="animate-bump rounded-full bg-card px-1.5 py-px text-xs font-bold tabular-nums"
                    >
                        {tasks.length}
                    </span>
                </button>
            </KanbanColumn>
        );
    }

    return (
        <KanbanColumn
            value={columnKey(list.id)}
            disabled={!canManage}
            aria-label={list.name}
            style={style}
            className={cn(
                'flex w-[17.5rem] shrink-0 snap-start flex-col gap-2.5 rounded-[20px] border-0 p-3 pr-2',
                HUES[list.color].column,
                isOverlay && 'shadow-[0_24px_44px_-20px_rgb(23_21_59/0.5)]',
                className,
            )}
        >
            <div className="flex min-h-8 items-center gap-1.5 pr-1 pl-0.5">
                {renaming ? (
                    <RenameListForm
                        teamSlug={teamSlug}
                        list={list}
                        onDone={() => setRenaming(false)}
                    />
                ) : (
                    <>
                        {canManage ? (
                            <KanbanColumnHandle asChild>
                                <button
                                    type="button"
                                    aria-label={`Move ${list.name}`}
                                    className="flex min-w-0 items-center gap-2 rounded-md opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {title}
                                </button>
                            </KanbanColumnHandle>
                        ) : (
                            <div className="flex min-w-0 items-center gap-2">
                                {title}
                            </div>
                        )}
                        {!isOverlay && (
                            <span className="ml-auto flex items-center">
                                {canManage && (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="rounded-lg text-muted-foreground hover:bg-card/70"
                                        aria-label={`Add a task to ${list.name}`}
                                        onClick={() => openAddTask(list.id)}
                                    >
                                        <Plus />
                                    </Button>
                                )}
                                {onToggleFold && (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="rounded-lg text-muted-foreground hover:bg-card/70"
                                        aria-label={`Fold the ${list.name} list`}
                                        aria-expanded
                                        title={`Fold ${list.name}`}
                                        onClick={onToggleFold}
                                    >
                                        <ChevronsLeft />
                                    </Button>
                                )}
                            </span>
                        )}
                        {canManage && !isOverlay && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="rounded-lg text-muted-foreground hover:bg-card/70"
                                        aria-label={`Actions for ${list.name}`}
                                    >
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onSelect={() => setRenaming(true)}
                                    >
                                        <Pencil /> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Palette /> Color
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {HUE_NAMES.map((hue) => (
                                                <DropdownMenuItem
                                                    key={hue}
                                                    onSelect={() =>
                                                        router.visit(
                                                            update(parameters),
                                                            {
                                                                data: {
                                                                    color: hue,
                                                                },
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <span
                                                        className={cn(
                                                            'size-3 rounded-full',
                                                            HUES[hue].dot,
                                                        )}
                                                    />
                                                    {HUES[hue].label}
                                                    {list.color === hue && (
                                                        <Check className="ml-auto" />
                                                    )}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={() => setDeleting(true)}
                                    >
                                        <Trash2 /> Delete list
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </>
                )}
            </div>

            <KanbanColumnContent
                value={columnKey(list.id)}
                className="-mx-1 flex scrollbar-thin max-h-[calc(100svh-22rem)] min-h-20 flex-col gap-2 overflow-y-auto px-1 py-1 pr-1.5"
            >
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        teamSlug={teamSlug}
                        task={task}
                        canManage={canManage}
                        onOpen={onOpenTask}
                        onStep={onStepTask}
                        isOverlay={isOverlay}
                    />
                ))}
                {tasks.length === 0 && (
                    <p className="flex min-h-20 flex-1 items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-foreground/15 text-xs text-muted-foreground">
                        {canManage ? 'Drop a task here' : 'No tasks'}
                    </p>
                )}
            </KanbanColumnContent>

            {canManage && !isOverlay && (
                <AddTask teamSlug={teamSlug} listId={list.id} />
            )}

            {canManage && !isOverlay && (
                <AlertDialog open={deleting} onOpenChange={setDeleting}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete “{list.name}”?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {tasks.length === 0
                                    ? 'The list is empty. This cannot be undone.'
                                    : `Its ${tasks.length} ${tasks.length === 1 ? 'task is' : 'tasks are'} deleted with it. This cannot be undone.`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                onClick={() =>
                                    router.visit(destroy(parameters), {
                                        preserveScroll: true,
                                    })
                                }
                            >
                                Delete list
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </KanbanColumn>
    );
}

function RenameListForm({
    teamSlug,
    list,
    onDone,
}: {
    teamSlug: string;
    list: TaskList;
    onDone: () => void;
}) {
    return (
        <Form
            {...update.form({ current_team: teamSlug, list: list.id })}
            options={{ preserveScroll: true }}
            onSuccess={onDone}
            className="flex w-full flex-col gap-1"
        >
            {({ errors, processing }) => (
                <>
                    <div className="flex items-center gap-1">
                        <Input
                            name="name"
                            defaultValue={list.name}
                            aria-label="List name"
                            maxLength={80}
                            required
                            autoFocus
                            onFocus={(event) => event.currentTarget.select()}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    onDone();
                                }
                            }}
                            className="h-8 bg-background"
                        />
                        <Button
                            type="submit"
                            size="icon-sm"
                            disabled={processing}
                            aria-label="Save name"
                        >
                            <Check />
                        </Button>
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={onDone}
                            aria-label="Cancel renaming"
                        >
                            <X />
                        </Button>
                    </div>
                    <InputError message={errors.name} />
                </>
            )}
        </Form>
    );
}
