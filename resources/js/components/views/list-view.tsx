import {
    ArrowDown,
    ArrowUp,
    CalendarDays,
    ChevronDown,
    ChevronsUpDown,
    MessageSquare,
    Plus,
    UserRound,
} from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ADD_TASK_EVENT } from '@/components/board/add-task';
import { AssigneeAvatar } from '@/components/board/task-badges';
import { LabelBadge, useTeamLabels } from '@/components/labels/label-badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { BoardFilters } from '@/lib/board-filters';
import { filtersOn, matches } from '@/lib/board-filters';
import { HUES } from '@/lib/hues';
import type { ListSort, SortKey } from '@/lib/project-views';
import { shiftDay, sortTasks } from '@/lib/project-views';
import { dueState, formatDue, PRIORITIES } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import type { Project, Task, TaskList } from '@/types';
import { taskActions } from './task-actions';

/** Done, task, due date, priority, assignee; on phones the middle two fold under the title. */
const GRID =
    'grid grid-cols-[24px_minmax(0,1fr)_28px] md:grid-cols-[28px_minmax(0,1fr)_132px_104px_32px]';

type Props = {
    teamSlug: string;
    project: Project;
    filters: BoardFilters;
    me: number;
    today: string;
    sort: ListSort;
    onSort: (key: SortKey) => void;
    onOpenTask: (task: Task) => void;
};

/**
 * The list view (spec 0008, round 8): one tinted section per list, in the
 * board's order, with two-line rows. A header bar sorts every section by
 * task, due date or priority.
 */
export function ListView({
    teamSlug,
    project,
    filters,
    me,
    today,
    sort,
    onSort,
    onOpenTask,
}: Props) {
    const canManage = project.can.manageLists;
    const filtering = filtersOn(filters);
    const actions = taskActions(teamSlug);
    const [folded, setFolded] = useState<number[]>([]);

    return (
        <section
            aria-label="Tasks as a list"
            className="flex animate-rise flex-col gap-2.5 [animation-delay:160ms]"
            data-test="list-view"
        >
            <div
                role="row"
                className={cn(
                    GRID,
                    'hidden min-h-[42px] items-center gap-x-3 rounded-2xl bg-card pr-[33px] pl-[25px] shadow-[0_1px_2px_rgb(23_21_59/0.05)] md:grid',
                )}
            >
                <span role="columnheader" aria-label="Done" />
                <SortHeader
                    name="Task"
                    sortKey="title"
                    sort={sort}
                    onSort={onSort}
                />
                <SortHeader
                    name="Due date"
                    sortKey="due"
                    sort={sort}
                    onSort={onSort}
                />
                <SortHeader
                    name="Priority"
                    sortKey="priority"
                    sort={sort}
                    onSort={onSort}
                />
                <span
                    role="columnheader"
                    aria-label="Assignee"
                    className="flex text-muted-foreground"
                >
                    <UserRound className="size-4" aria-hidden="true" />
                </span>
            </div>

            <div
                role="grid"
                aria-label="Tasks grouped by list"
                className="flex flex-col gap-3"
            >
                {project.lists.map((list) => {
                    const all = list.tasks ?? [];
                    const shown = sortTasks(
                        all.filter((task) => matches(task, filters, me, today)),
                        sort,
                    );

                    return (
                        <ListSection
                            key={list.id}
                            list={list}
                            tasks={shown}
                            count={
                                filtering
                                    ? `${shown.length} of ${all.length}`
                                    : String(all.length)
                            }
                            filtering={filtering}
                            folded={folded.includes(list.id)}
                            onToggleFold={() =>
                                setFolded((ids) =>
                                    ids.includes(list.id)
                                        ? ids.filter((id) => id !== list.id)
                                        : [...ids, list.id],
                                )
                            }
                            onUnfold={() =>
                                setFolded((ids) =>
                                    ids.filter((id) => id !== list.id),
                                )
                            }
                            canManage={canManage}
                            today={today}
                            onOpenTask={onOpenTask}
                            onSetDone={actions.setDone}
                            onAdd={(title, onSuccess) =>
                                actions.add(list.id, title, null, {
                                    onSuccess,
                                })
                            }
                        />
                    );
                })}
            </div>

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <Kbd label="Up">
                        <ArrowUp />
                    </Kbd>
                    <Kbd label="Down">
                        <ArrowDown />
                    </Kbd>
                    move
                </span>
                <span className="inline-flex items-center gap-1">
                    <Kbd>Enter</Kbd> open
                </span>
                {canManage && (
                    <span className="inline-flex items-center gap-1">
                        <Kbd>Space</Kbd> done
                    </span>
                )}
                <span className="ml-auto">
                    Sorting applies inside every list; rows are reordered on the
                    board only.
                </span>
            </p>
        </section>
    );
}

function SortHeader({
    name,
    sortKey,
    sort,
    onSort,
}: {
    name: string;
    sortKey: SortKey;
    sort: ListSort;
    onSort: (key: SortKey) => void;
}) {
    const dir = sort?.key === sortKey ? sort.dir : null;
    const label = dir
        ? `${name}, sorted ${dir === 'asc' ? 'ascending' : 'descending'}. Sort ${dir === 'asc' ? 'descending' : 'in the board order'}`
        : `Sort by ${name.toLowerCase()}`;

    return (
        <span
            role="columnheader"
            aria-sort={
                dir === 'asc'
                    ? 'ascending'
                    : dir === 'desc'
                      ? 'descending'
                      : 'none'
            }
        >
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                aria-label={label}
                data-test={`sort-${sortKey}`}
                className={cn(
                    'group -ml-1.5 inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11.5px] font-bold tracking-[0.06em] uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-3.5',
                    dir ? 'text-primary' : 'text-muted-foreground',
                )}
            >
                {name}
                {dir === 'asc' && <ArrowUp aria-hidden="true" />}
                {dir === 'desc' && <ArrowDown aria-hidden="true" />}
                {!dir && (
                    <ChevronsUpDown
                        aria-hidden="true"
                        className="opacity-40 transition-opacity group-hover:opacity-80"
                    />
                )}
            </button>
        </span>
    );
}

function ListSection({
    list,
    tasks,
    count,
    filtering,
    folded,
    onToggleFold,
    onUnfold,
    canManage,
    today,
    onOpenTask,
    onSetDone,
    onAdd,
}: {
    list: TaskList;
    tasks: Task[];
    count: string;
    filtering: boolean;
    folded: boolean;
    onToggleFold: () => void;
    onUnfold: () => void;
    canManage: boolean;
    today: string;
    onOpenTask: (task: Task) => void;
    onSetDone: (task: Task, done: boolean) => void;
    onAdd: (title: string, onSuccess: () => void) => void;
}) {
    const [adding, setAdding] = useState(false);

    // "New task" in the page header opens the first list's form here too.
    useEffect(() => {
        const listen = (event: Event) => {
            if (
                (event as CustomEvent<{ listId: number }>).detail.listId ===
                list.id
            ) {
                onUnfold();
                setAdding(true);
            }
        };

        window.addEventListener(ADD_TASK_EVENT, listen);

        return () => window.removeEventListener(ADD_TASK_EVENT, listen);
    }, [list.id, onUnfold]);

    return (
        <div
            role="rowgroup"
            aria-label={list.name}
            data-test="list-section"
            className={cn(
                'flex flex-col gap-1.5 rounded-[20px] border-0 p-2.5 pt-2',
                HUES[list.color].column,
            )}
        >
            <div className="flex min-h-[34px] items-center gap-2">
                <button
                    type="button"
                    onClick={onToggleFold}
                    aria-expanded={!folded}
                    aria-label={`${list.name}, ${count} ${count === '1' ? 'task' : 'tasks'}`}
                    className="inline-flex min-h-8 items-center gap-2 rounded-[10px] px-1.5 transition-colors hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <ChevronDown
                        aria-hidden="true"
                        className={cn(
                            'size-4 transition-transform duration-200 motion-reduce:transition-none',
                            folded && '-rotate-90',
                        )}
                    />
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-2.5 rounded-[3px]',
                            HUES[list.color].dot,
                        )}
                    />
                    <span className="text-[14.5px] font-bold">{list.name}</span>
                    <span
                        className={cn(
                            'inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-card px-1.5 text-[11.5px] font-bold tabular-nums shadow-[inset_0_0_0_1px_rgb(23_21_59/0.08)]',
                            filtering
                                ? 'text-primary'
                                : 'text-muted-foreground',
                        )}
                    >
                        {count}
                    </span>
                </button>
                {canManage && (
                    <button
                        type="button"
                        onClick={() => {
                            onUnfold();
                            setAdding(true);
                        }}
                        aria-label={`Add a task to ${list.name}`}
                        className="ml-auto flex size-[30px] items-center justify-center rounded-[9px] text-muted-foreground transition-colors hover:bg-card/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <Plus className="size-4" />
                    </button>
                )}
            </div>

            {!folded && (
                <div className="flex flex-col gap-1.5">
                    {tasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            canManage={canManage}
                            today={today}
                            onOpen={() => onOpenTask(task)}
                            onSetDone={(done) => onSetDone(task, done)}
                        />
                    ))}
                    {filtering && tasks.length === 0 && (
                        <p className="py-3 text-center text-[12.5px] text-muted-foreground">
                            No tasks in this list match the filters.
                        </p>
                    )}
                    {canManage &&
                        (adding ? (
                            <AddRow
                                listName={list.name}
                                onAdd={onAdd}
                                onClose={() => setAdding(false)}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAdding(true)}
                                className="flex min-h-[42px] items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-foreground/12 bg-card/55 px-3 text-left text-[13.5px] font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Add task
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}

function TaskRow({
    task,
    canManage,
    today,
    onOpen,
    onSetDone,
}: {
    task: Task;
    canManage: boolean;
    today: string;
    onOpen: () => void;
    onSetDone: (done: boolean) => void;
}) {
    const { labels: teamLabels } = useTeamLabels();
    const labels = task.labelIds.flatMap((id) => {
        const label = teamLabels.find((item) => item.id === id);

        return label ? [label] : [];
    });
    const done = task.completedAt !== null;

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) {
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const rows = [
                ...document.querySelectorAll<HTMLElement>('[data-list-row]'),
            ];
            const at = rows.indexOf(event.currentTarget);
            rows[at + (event.key === 'ArrowDown' ? 1 : -1)]?.focus();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            onOpen();
        } else if (event.key === ' ' && canManage) {
            event.preventDefault();
            onSetDone(!done);
        }
    };

    const due = <DueText task={task} today={today} />;
    const priority = <PriorityDot task={task} />;

    return (
        <div
            role="row"
            tabIndex={0}
            data-list-row
            data-task-id={task.id}
            aria-label={task.title}
            onClick={onOpen}
            onKeyDown={onKeyDown}
            className={cn(
                GRID,
                'min-h-[60px] animate-pop cursor-pointer items-center gap-x-3 rounded-[14px] border bg-card px-3 py-2 transition-colors hover:border-primary/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            )}
        >
            <span role="gridcell" className="flex self-start pt-0.5">
                <Checkbox
                    checked={done}
                    disabled={!canManage}
                    aria-label={
                        done ? `Reopen ${task.title}` : `Complete ${task.title}`
                    }
                    className="rounded-full data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onCheckedChange={(checked) => onSetDone(checked === true)}
                />
            </span>
            <span role="gridcell" className="flex min-w-0 flex-col gap-1.5">
                <span
                    className={cn(
                        'truncate text-sm font-semibold',
                        done &&
                            'text-muted-foreground line-through decoration-muted-foreground/50',
                    )}
                >
                    {task.title}
                </span>
                <span
                    className={cn(
                        'flex min-w-0 items-center gap-1.5 overflow-hidden',
                        done && 'opacity-70',
                    )}
                >
                    <span className="contents md:hidden">
                        {due}
                        {task.priority !== 'none' && priority}
                    </span>
                    {labels.slice(0, 3).map((label) => (
                        <LabelBadge key={label.id} label={label} />
                    ))}
                    {labels.length > 3 && (
                        <span
                            title={labels
                                .slice(3)
                                .map((label) => label.name)
                                .join(', ')}
                            className="inline-flex h-[22px] shrink-0 items-center rounded-md bg-muted px-1.5 text-[11px] font-bold text-muted-foreground"
                        >
                            +{labels.length - 3}
                        </span>
                    )}
                    {task.commentCount > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            <span className="sr-only">Comments: </span>
                            {task.commentCount}
                        </span>
                    )}
                    {labels.length === 0 && task.commentCount === 0 && (
                        <span className="hidden text-xs text-muted-foreground/70 md:inline">
                            No labels
                        </span>
                    )}
                </span>
            </span>
            <span role="gridcell" className="hidden md:flex">
                {due}
            </span>
            <span
                role="gridcell"
                className={cn('hidden md:flex', done && 'opacity-70')}
            >
                {priority}
            </span>
            <span role="gridcell" className={cn('flex', done && 'opacity-70')}>
                {task.assigneeId !== null && task.assigneeName ? (
                    <AssigneeAvatar
                        id={task.assigneeId}
                        name={task.assigneeName}
                    />
                ) : (
                    <span
                        title="Unassigned"
                        className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-dashed border-input text-muted-foreground/70"
                    >
                        <UserRound className="size-3" aria-hidden="true" />
                        <span className="sr-only">Unassigned</span>
                    </span>
                )}
            </span>
        </div>
    );
}

/** The due date in the viewer's day; overdue and today say so in words too. */
export function DueText({ task, today }: { task: Task; today: string }) {
    const state = dueState(task, today);

    if (!task.dueOn) {
        return (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground/70">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                No date
            </span>
        );
    }

    const text =
        state === 'today'
            ? 'Today'
            : state === 'overdue'
              ? `Overdue · ${formatDue(task.dueOn)}`
              : task.dueOn === shiftDay(today, 1) && !task.completedAt
                ? 'Tomorrow'
                : formatDue(task.dueOn, 'EEE d MMM');

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 text-[13px] whitespace-nowrap',
                state === 'overdue' &&
                    'font-semibold text-red-600 dark:text-red-400',
                state === 'today' &&
                    'font-semibold text-amber-600 dark:text-amber-400',
                (state === 'later' || state === 'none') && 'text-foreground/80',
                task.completedAt && 'text-muted-foreground',
            )}
        >
            <CalendarDays className="size-3.5 opacity-70" aria-hidden="true" />
            {text}
        </span>
    );
}

function PriorityDot({ task }: { task: Task }) {
    return (
        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-semibold text-foreground/80">
            <span
                aria-hidden="true"
                className={cn(
                    'size-[7px] rounded-full bg-current',
                    PRIORITIES[task.priority].flag,
                )}
            />
            {task.priority === 'none'
                ? 'None'
                : PRIORITIES[task.priority].label}
        </span>
    );
}

function Kbd({ children, label }: { children: ReactNode; label?: string }) {
    return (
        <kbd
            aria-label={label}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-b-2 bg-card px-1 font-sans text-[11px] font-semibold text-foreground/80 [&_svg]:size-3"
        >
            {children}
        </kbd>
    );
}

function AddRow({
    listName,
    onAdd,
    onClose,
}: {
    listName: string;
    onAdd: (title: string, onSuccess: () => void) => void;
    onClose: () => void;
}) {
    const [title, setTitle] = useState('');
    const field = useRef<HTMLInputElement>(null);

    const submit = () => {
        const value = title.trim();

        if (value === '') {
            onClose();

            return;
        }

        onAdd(value.slice(0, 255), () => {
            setTitle('');
            field.current?.focus();
        });
    };

    return (
        <div
            className={cn(
                GRID,
                'min-h-11 animate-pop items-center gap-x-3 rounded-[14px] bg-card px-3 ring-[1.5px] ring-primary/40 ring-inset',
            )}
        >
            <span
                aria-hidden="true"
                className="size-4 rounded-full border-[1.5px] border-dashed border-input"
            />
            <input
                ref={field}
                autoFocus
                value={title}
                maxLength={255}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        submit();
                    }

                    if (event.key === 'Escape') {
                        event.stopPropagation();
                        onClose();
                    }
                }}
                onBlur={() => title.trim() === '' && onClose()}
                placeholder="Task title"
                aria-label={`New task in ${listName}`}
                className="min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground md:col-span-2"
            />
            <span className="hidden justify-self-end pr-1 text-xs text-muted-foreground md:col-span-2 md:block">
                Enter adds, Esc closes
            </span>
        </div>
    );
}
