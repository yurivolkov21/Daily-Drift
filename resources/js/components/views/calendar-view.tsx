import { format, parseISO } from 'date-fns';
import {
    CalendarX2,
    Check,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    PanelLeft,
    Plus,
    X,
} from 'lucide-react';
import type { DragEvent, KeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ADD_TASK_EVENT } from '@/components/board/add-task';
import { MemberAvatar } from '@/components/member-avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover';
import type { BoardFilters } from '@/lib/board-filters';
import { matches } from '@/lib/board-filters';
import { HUES } from '@/lib/hues';
import {
    dayOrder,
    hiddenKey,
    monthOf,
    monthWeeks,
    panelKey,
    remember,
    remembered,
    shiftDay,
    shiftMonth,
    shortDay,
    ymd,
} from '@/lib/project-views';
import { cn } from '@/lib/utils';
import type { Project, Task, TaskList } from '@/types';
import { Agenda } from './agenda';
import { taskActions } from './task-actions';

type Props = {
    teamSlug: string;
    project: Project;
    filters: BoardFilters;
    me: number;
    today: string;
    month: string;
    onMonth: (month: string) => void;
    onOpenTask: (task: Task) => void;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Where a popover of a day is open, and what it shows. */
type DayPop = { day: string; kind: 'add' | 'more' } | null;

/**
 * The calendar view (spec 0008, round 8): a month starting on Monday with a
 * side panel (a mini month, the lists to show or hide, _No due date_). Drag a
 * task to another day, or press Alt with an arrow key, to change its due
 * date. Phones get an agenda instead.
 */
export function CalendarView({
    teamSlug,
    project,
    filters,
    me,
    today,
    month,
    onMonth,
    onOpenTask,
}: Props) {
    const canManage = project.can.manageLists;
    const actions = taskActions(teamSlug);
    const firstList = project.lists[0];

    const [panel, setPanel] = useState<boolean>(() =>
        remembered(panelKey(project.id), true),
    );
    const [hidden, setHidden] = useState<number[]>(() =>
        remembered<number[]>(hiddenKey(project.id), []).filter((id) =>
            project.lists.some((list) => list.id === id),
        ),
    );
    useEffect(() => remember(panelKey(project.id), panel), [project.id, panel]);
    useEffect(
        () => remember(hiddenKey(project.id), hidden),
        [project.id, hidden],
    );

    // A drag or Alt + arrow shows the task on its new day at once; the next
    // props hold the saved date, or the old one if saving failed.
    const [moved, setMoved] = useState<Record<number, string | null>>({});
    const [dragging, setDragging] = useState<number | null>(null);
    // Drag events can come before the next render; the ref is always current.
    const draggingRef = useRef<number | null>(null);
    const [overDay, setOverDay] = useState<string | null>(null);
    const [pop, setPop] = useState<DayPop>(null);
    const [picked, setPicked] = useState<string | null>(null);
    const [keepVisible, setKeepVisible] = useState<number | null>(null);

    const listOf = useMemo(
        () =>
            new Map<number, TaskList>(
                project.lists.map((list) => [list.id, list]),
            ),
        [project.lists],
    );
    const dueOf = (task: Task) =>
        task.id in moved ? moved[task.id] : task.dueOn;
    const tasks = project.lists
        .flatMap((list) => list.tasks ?? [])
        .filter((task) => matches(task, filters, me, today))
        .map((task) => ({ ...task, dueOn: dueOf(task) }));
    const shown = tasks.filter((task) => !hidden.includes(task.listId));
    const byDay = new Map<string, Task[]>();

    shown.forEach((task) => {
        if (task.dueOn) {
            byDay.set(task.dueOn, [...(byDay.get(task.dueOn) ?? []), task]);
        }
    });
    byDay.forEach((items) => items.sort(dayOrder));

    const undated = shown.filter(
        (task) => !task.dueOn && task.completedAt === null,
    );
    const weeks = monthWeeks(month);

    // "New task" in the page header adds a task due today.
    useEffect(() => {
        const listen = () => {
            if (!canManage) {
                return;
            }

            onMonth(monthOf(today));
            setPop({ day: today, kind: 'add' });
        };

        window.addEventListener(ADD_TASK_EVENT, listen);

        return () => window.removeEventListener(ADD_TASK_EVENT, listen);
    }, [canManage, onMonth, today]);

    const reschedule = (task: Task, day: string | null, refocus = false) => {
        const original = project.lists
            .flatMap((list) => list.tasks ?? [])
            .find((item) => item.id === task.id);

        if (!original || dueOf(original) === day || !canManage) {
            return;
        }

        setMoved((current) => ({ ...current, [task.id]: day }));

        if (refocus) {
            setKeepVisible(task.id);
        }

        actions.reschedule({ ...original, dueOn: dueOf(original) }, day, {
            onSuccess: () => {
                if (refocus) {
                    requestAnimationFrame(() =>
                        document
                            .querySelector<HTMLElement>(
                                `[data-chip-id="${task.id}"]`,
                            )
                            ?.focus(),
                    );
                }
            },
            onFinish: () =>
                setMoved((current) => {
                    const next = { ...current };
                    delete next[task.id];

                    return next;
                }),
        });
    };

    const chipKeys = (event: KeyboardEvent<HTMLElement>, task: Task) => {
        const steps: Record<string, number> = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
        };

        if (!event.altKey || !(event.key in steps)) {
            return;
        }

        // Alt + Left is also the browser's Back: keep it on the task.
        event.preventDefault();
        event.stopPropagation();

        if (!task.dueOn) {
            return;
        }

        const day = shiftDay(task.dueOn, steps[event.key]);

        if (monthOf(day) !== month) {
            onMonth(monthOf(day));
        }

        reschedule(task, day, true);
    };

    const dragProps = (task: Task) => ({
        draggable: canManage,
        onDragStart: (event: DragEvent<HTMLElement>) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(task.id));
            draggingRef.current = task.id;
            setDragging(task.id);
            setPop(null);
        },
        onDragEnd: () => {
            draggingRef.current = null;
            setDragging(null);
            setOverDay(null);
        },
    });

    const chip = (task: Task, size: 'sm' | 'md' = 'sm') => (
        <TaskChip
            key={task.id}
            task={task}
            list={listOf.get(task.listId)}
            size={size}
            dragging={dragging === task.id}
            onOpen={() => {
                setPop(null);
                onOpenTask(task);
            }}
            onKeyDown={(event) => chipKeys(event, task)}
            {...dragProps(task)}
        />
    );

    const busyDays = [...byDay.entries()]
        .filter(([, items]) => items.some((task) => task.completedAt === null))
        .map(([day]) => parseISO(day));

    const jumpTo = (day: string) => {
        onMonth(monthOf(day));
        setPicked(day);
        window.setTimeout(
            () => setPicked((current) => (current === day ? null : current)),
            1800,
        );
    };

    return (
        <>
            <section
                aria-label="Calendar"
                data-test="calendar-view"
                className="hidden animate-rise rounded-card bg-card [animation-delay:160ms] md:flex"
            >
                {panel && (
                    <aside
                        aria-label="Calendar panel"
                        className="flex w-[236px] shrink-0 animate-pop flex-col gap-4 border-r px-3.5 py-3.5"
                    >
                        <Calendar
                            mode="single"
                            weekStartsOn={1}
                            showOutsideDays
                            month={parseISO(`${month}-01`)}
                            onMonthChange={(date) =>
                                onMonth(ymd(date).slice(0, 7))
                            }
                            today={parseISO(today)}
                            selected={picked ? parseISO(picked) : undefined}
                            onSelect={(date) => date && jumpTo(ymd(date))}
                            modifiers={{ busy: busyDays }}
                            modifiersClassNames={{
                                busy: 'relative after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary',
                            }}
                            className="w-full bg-transparent p-0 [--cell-size:--spacing(7.5)]"
                        />
                        <p className="-mt-2 px-0.5 text-[11.5px] text-muted-foreground">
                            A dot marks a day with open tasks.
                        </p>

                        <div className="flex flex-col gap-0.5">
                            <h3 className="px-1 pb-1 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                                Lists
                            </h3>
                            {project.lists.map((list) => {
                                const on = !hidden.includes(list.id);
                                const count = tasks.filter(
                                    (task) =>
                                        task.listId === list.id &&
                                        task.dueOn !== null &&
                                        monthOf(task.dueOn) === month,
                                ).length;

                                return (
                                    <button
                                        key={list.id}
                                        type="button"
                                        role="checkbox"
                                        aria-checked={on}
                                        data-test="calendar-list-toggle"
                                        onClick={() =>
                                            setHidden((ids) =>
                                                on
                                                    ? [...ids, list.id]
                                                    : ids.filter(
                                                          (id) =>
                                                              id !== list.id,
                                                      ),
                                            )
                                        }
                                        className="flex min-h-8 items-center gap-2.5 rounded-[9px] px-1.5 text-left text-[13.5px] font-semibold transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'flex size-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] text-white',
                                                on
                                                    ? cn(
                                                          'border-transparent',
                                                          HUES[list.color].dot,
                                                      )
                                                    : 'border-input',
                                            )}
                                        >
                                            {on && (
                                                <Check
                                                    className="size-3"
                                                    strokeWidth={3.4}
                                                />
                                            )}
                                        </span>
                                        <span className="flex-1 truncate">
                                            {list.name}
                                        </span>
                                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                            <h3 className="flex items-center gap-1.5 px-1 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                                <CalendarX2
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                No due date
                                <span className="tracking-normal tabular-nums">
                                    {undated.length}
                                </span>
                            </h3>
                            {canManage && undated.length > 0 && (
                                <p className="px-1 text-[11.5px] text-muted-foreground">
                                    Drag one onto a day to give it that date.
                                </p>
                            )}
                            <div className="-mx-0.5 flex scrollbar-thin max-h-[22rem] flex-col gap-1.5 overflow-y-auto p-0.5">
                                {undated.map((task) => (
                                    <UndatedCard
                                        key={task.id}
                                        task={task}
                                        list={listOf.get(task.listId)}
                                        canManage={canManage}
                                        dragging={dragging === task.id}
                                        onOpen={() => onOpenTask(task)}
                                        {...dragProps(task)}
                                    />
                                ))}
                                {undated.length === 0 && (
                                    <p className="rounded-xl border-[1.5px] border-dashed px-2 py-3.5 text-center text-xs text-muted-foreground">
                                        Every open task has a date.
                                    </p>
                                )}
                            </div>
                        </div>
                    </aside>
                )}

                <div className="flex min-w-0 flex-1 flex-col px-3.5 pt-3 pb-3.5">
                    <div className="flex flex-wrap items-center gap-2.5 pb-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setPanel((open) => !open)}
                            aria-expanded={panel}
                            aria-label={
                                panel
                                    ? 'Hide the side panel'
                                    : 'Show the side panel'
                            }
                            className="size-8 rounded-[10px]"
                        >
                            <PanelLeft />
                        </Button>
                        <h2
                            aria-live="polite"
                            className="font-display text-lg font-extrabold whitespace-nowrap"
                        >
                            {format(parseISO(`${month}-01`), 'MMMM yyyy')}
                        </h2>
                        {canManage && (
                            <span
                                id="calendar-hint"
                                className="hidden text-xs text-muted-foreground lg:inline"
                            >
                                Drag a task to another day, or press Alt with an
                                arrow key on a focused task.
                            </span>
                        )}
                        <span className="ml-auto flex items-center gap-1.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onMonth(shiftMonth(month, -1))}
                                aria-label="Previous month"
                                className="size-8 rounded-[10px]"
                            >
                                <ChevronLeft />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onMonth(monthOf(today))}
                                className="h-8 rounded-[10px]"
                            >
                                Today
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onMonth(shiftMonth(month, 1))}
                                aria-label="Next month"
                                className="size-8 rounded-[10px]"
                            >
                                <ChevronRight />
                            </Button>
                        </span>
                    </div>

                    <div
                        role="grid"
                        aria-label={format(
                            parseISO(`${month}-01`),
                            'MMMM yyyy',
                        )}
                        className="flex flex-col gap-px overflow-hidden rounded-[14px] border bg-border"
                    >
                        <div role="row" className="grid grid-cols-7 gap-px">
                            {WEEKDAYS.map((name, index) => (
                                <span
                                    key={name}
                                    role="columnheader"
                                    className={cn(
                                        'bg-card bg-linear-to-b from-secondary/70 to-secondary/70 px-2 py-1.5 text-[11px] font-bold tracking-[0.06em] uppercase',
                                        index >= 5
                                            ? 'text-muted-foreground/70'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                        {weeks.map((week) => (
                            <div
                                key={week[0]}
                                role="row"
                                className="grid grid-cols-7 gap-px"
                            >
                                {week.map((day, index) => {
                                    const items = byDay.get(day) ?? [];
                                    const room = items.length > 3 ? 2 : 3;
                                    let visible = items.slice(0, room);
                                    const kept = items.find(
                                        (task) => task.id === keepVisible,
                                    );

                                    if (kept && !visible.includes(kept)) {
                                        visible = [
                                            ...items.slice(0, room - 1),
                                            kept,
                                        ];
                                    }

                                    return (
                                        <DayCell
                                            key={day}
                                            day={day}
                                            items={items}
                                            visible={visible}
                                            inMonth={monthOf(day) === month}
                                            weekend={index >= 5}
                                            today={today}
                                            picked={picked === day}
                                            over={
                                                dragging !== null &&
                                                overDay === day
                                            }
                                            canManage={canManage}
                                            pop={
                                                pop?.day === day
                                                    ? pop.kind
                                                    : null
                                            }
                                            onPop={(kind) =>
                                                setPop(
                                                    kind ? { day, kind } : null,
                                                )
                                            }
                                            chip={chip}
                                            onDragOver={(event) => {
                                                if (
                                                    draggingRef.current === null
                                                ) {
                                                    return;
                                                }

                                                event.preventDefault();
                                                event.dataTransfer.dropEffect =
                                                    'move';

                                                if (overDay !== day) {
                                                    setOverDay(day);
                                                }
                                            }}
                                            onDrop={(event) => {
                                                event.preventDefault();
                                                const id = draggingRef.current;
                                                const task = tasks.find(
                                                    (item) => item.id === id,
                                                );
                                                draggingRef.current = null;
                                                setDragging(null);
                                                setOverDay(null);

                                                if (task) {
                                                    reschedule(task, day);
                                                }
                                            }}
                                            onAdd={(title, done) =>
                                                firstList &&
                                                actions.add(
                                                    firstList.id,
                                                    title,
                                                    day,
                                                    {
                                                        onSuccess: () => {
                                                            done();
                                                            setPop(null);
                                                            toast(
                                                                `Added “${title}” to ${firstList.name}, due ${shortDay(day)}`,
                                                            );
                                                        },
                                                    },
                                                )
                                            }
                                            firstListName={
                                                firstList?.name ?? ''
                                            }
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Agenda
                className="md:hidden"
                project={project}
                tasks={tasks}
                today={today}
                month={month}
                onMonth={onMonth}
                canManage={canManage}
                onOpenTask={onOpenTask}
                onSetDone={actions.setDone}
                onReschedule={(task, day) => reschedule(task, day)}
            />
        </>
    );
}

function DayCell({
    day,
    items,
    visible,
    inMonth,
    weekend,
    today,
    picked,
    over,
    canManage,
    pop,
    onPop,
    chip,
    onDragOver,
    onDrop,
    onAdd,
    firstListName,
}: {
    day: string;
    items: Task[];
    visible: Task[];
    inMonth: boolean;
    weekend: boolean;
    today: string;
    picked: boolean;
    over: boolean;
    canManage: boolean;
    pop: 'add' | 'more' | null;
    onPop: (kind: 'add' | 'more' | null) => void;
    chip: (task: Task, size?: 'sm' | 'md') => ReactNode;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
    onAdd: (title: string, done: () => void) => void;
    firstListName: string;
}) {
    const isToday = day === today;
    const late = day < today && items.some((task) => task.completedAt === null);
    const date = parseISO(day);
    const label = format(date, 'EEEE d MMMM');

    return (
        <Popover
            open={pop !== null}
            onOpenChange={(open) => !open && onPop(null)}
        >
            <PopoverAnchor asChild>
                <div
                    role="gridcell"
                    aria-label={`${label}${isToday ? ', today' : ''}${items.length ? `, ${items.length} ${items.length === 1 ? 'task' : 'tasks'}` : ''}`}
                    data-cal-day={day}
                    onClick={() => canManage && onPop('add')}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    className={cn(
                        'group/day relative flex min-h-[7.25rem] min-w-0 flex-col gap-0.5 p-1.5',
                        canManage && 'cursor-pointer',
                        // Opaque shades: the grid's lines show through anything see-through.
                        'bg-card',
                        (!inMonth || weekend) &&
                            'bg-linear-to-b from-secondary/45 to-secondary/45',
                        isToday && 'bg-linear-to-b from-primary/5 to-primary/5',
                        over && 'bg-primary/10 ring-2 ring-primary ring-inset',
                        picked && !over && 'ring-2 ring-primary/40 ring-inset',
                    )}
                >
                    <div className="flex h-[22px] items-center gap-1">
                        <span
                            className={cn(
                                'flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
                                isToday &&
                                    'bg-primary font-bold text-primary-foreground',
                                !isToday &&
                                    !inMonth &&
                                    'text-muted-foreground/60',
                                !isToday &&
                                    inMonth &&
                                    late &&
                                    'text-red-600 dark:text-red-400',
                            )}
                        >
                            {date.getDate() === 1
                                ? format(date, 'd MMM')
                                : date.getDate()}
                        </span>
                        {late && <span className="sr-only">Overdue</span>}
                        {canManage && (
                            <button
                                type="button"
                                aria-label={`Add a task on ${label}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onPop('add');
                                }}
                                className="ml-auto flex size-[22px] items-center justify-center rounded-md text-primary opacity-0 transition-opacity group-hover/day:opacity-100 hover:bg-primary/10 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <Plus className="size-3.5" />
                            </button>
                        )}
                    </div>
                    {visible.map((task) => chip(task))}
                    {items.length > visible.length && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onPop('more');
                            }}
                            aria-haspopup="dialog"
                            aria-expanded={pop === 'more'}
                            className="self-start rounded-md px-1.5 text-[11.5px] font-bold text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            +{items.length - visible.length} more
                        </button>
                    )}
                </div>
            </PopoverAnchor>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={4}
                collisionPadding={16}
                className="w-64 rounded-2xl p-2.5"
                onClick={(event) => event.stopPropagation()}
            >
                {pop === 'more' ? (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between pb-1 pl-0.5">
                            <span className="text-[13px] font-bold">
                                {shortDay(day)} · {items.length} tasks
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Close"
                                onClick={() => onPop(null)}
                                className="size-7 rounded-lg"
                            >
                                <X />
                            </Button>
                        </div>
                        {items.map((task) => chip(task, 'md'))}
                    </div>
                ) : (
                    <AddOnDay
                        day={day}
                        listName={firstListName}
                        onAdd={onAdd}
                        onCancel={() => onPop(null)}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
}

function AddOnDay({
    day,
    listName,
    onAdd,
    onCancel,
}: {
    day: string;
    listName: string;
    onAdd: (title: string, done: () => void) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = () => {
        const value = title.trim().slice(0, 255);

        if (value === '' || saving) {
            return;
        }

        setSaving(true);
        onAdd(value, () => setTitle(''));
        window.setTimeout(() => setSaving(false), 600);
    };

    return (
        <form
            className="flex flex-col gap-2.5"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <span className="text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                New task · {shortDay(day)}
            </span>
            <input
                autoFocus
                value={title}
                maxLength={255}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task title"
                aria-label={`Task title, due ${shortDay(day)}`}
                className="h-9 rounded-[10px] border border-primary/25 bg-primary/[0.03] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">
                    Goes into {listName}
                </span>
                <span className="flex gap-1.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={saving || title.trim() === ''}
                    >
                        Add task
                    </Button>
                </span>
            </div>
        </form>
    );
}

function TaskChip({
    task,
    list,
    size,
    dragging,
    onOpen,
    onKeyDown,
    ...drag
}: {
    task: Task;
    list: TaskList | undefined;
    size: 'sm' | 'md';
    dragging: boolean;
    onOpen: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    draggable: boolean;
    onDragStart: (event: DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
}) {
    const done = task.completedAt !== null;
    const hue = list?.color ?? 'slate';

    return (
        <div
            role="button"
            tabIndex={0}
            data-chip-id={task.id}
            title={task.title}
            aria-describedby="calendar-hint"
            aria-label={`${task.title}${done ? ', done' : ''}${list ? `, ${list.name}` : ''}${task.assigneeName ? `, assigned to ${task.assigneeName}` : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                onOpen();
            }}
            onKeyDown={(event) => {
                onKeyDown(event);

                if (
                    !event.defaultPrevented &&
                    (event.key === 'Enter' || event.key === ' ')
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpen();
                }
            }}
            {...drag}
            className={cn(
                'flex w-full min-w-0 shrink-0 items-center gap-1.5 rounded-md pr-0.5 pl-1.5 text-left font-semibold transition-[opacity,transform] hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
                size === 'sm' ? 'h-5 text-[11.5px]' : 'h-7 text-[12.5px]',
                HUES[hue].pill,
                drag.draggable && 'cursor-grab active:cursor-grabbing',
                done && 'opacity-60',
                dragging && 'opacity-40',
            )}
        >
            {done ? (
                <Check
                    className="size-3 shrink-0"
                    strokeWidth={3}
                    aria-hidden="true"
                />
            ) : (
                <span
                    aria-hidden="true"
                    className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        HUES[hue].dot,
                    )}
                />
            )}
            <span
                className={cn(
                    'min-w-0 flex-1 truncate',
                    done && 'line-through',
                )}
            >
                {task.title}
            </span>
            {task.assigneeId !== null && task.assigneeName && (
                <MemberAvatar
                    id={task.assigneeId}
                    name={task.assigneeName}
                    className="size-4 text-[6.5px] ring-[1.5px] ring-card"
                />
            )}
        </div>
    );
}

function UndatedCard({
    task,
    list,
    canManage,
    dragging,
    onOpen,
    ...drag
}: {
    task: Task;
    list: TaskList | undefined;
    canManage: boolean;
    dragging: boolean;
    onOpen: () => void;
    draggable: boolean;
    onDragStart: (event: DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen();
                }
            }}
            aria-label={`${task.title}, no due date${list ? `, ${list.name}` : ''}`}
            {...drag}
            className={cn(
                'flex min-h-[34px] w-full items-center gap-1.5 rounded-[10px] border bg-card pr-2 pl-1 text-left transition-colors hover:border-primary/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                canManage && 'cursor-grab active:cursor-grabbing',
                dragging && 'opacity-40',
            )}
        >
            {canManage && (
                <GripVertical
                    className="size-3.5 shrink-0 text-muted-foreground/60"
                    aria-hidden="true"
                />
            )}
            <span
                aria-hidden="true"
                className={cn(
                    'size-2 shrink-0 rounded-[3px]',
                    HUES[list?.color ?? 'slate'].dot,
                )}
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
                {task.title}
            </span>
            {task.assigneeId !== null && task.assigneeName && (
                <MemberAvatar
                    id={task.assigneeId}
                    name={task.assigneeName}
                    className="size-5 text-[8px]"
                />
            )}
        </div>
    );
}
