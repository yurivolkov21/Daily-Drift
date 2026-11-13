import { format, parseISO } from 'date-fns';
import { CalendarX2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MemberAvatar } from '@/components/member-avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { HUES } from '@/lib/hues';
import {
    dayOrder,
    monthOf,
    nextMonday,
    shiftDay,
    shiftMonth,
    shortDay,
} from '@/lib/project-views';
import { PRIORITIES } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import type { Project, Task } from '@/types';

/**
 * The calendar on a phone (spec 0008): the days of the month that have
 * tasks, one under another, scrolled to today, then _No due date_. Dragging
 * is not offered; a task's bottom sheet changes its due date instead.
 */
export function Agenda({
    className,
    project,
    tasks,
    today,
    month,
    onMonth,
    canManage,
    onOpenTask,
    onSetDone,
    onReschedule,
}: {
    className?: string;
    project: Project;
    tasks: Task[];
    today: string;
    month: string;
    onMonth: (month: string) => void;
    canManage: boolean;
    onOpenTask: (task: Task) => void;
    onSetDone: (task: Task, done: boolean) => void;
    onReschedule: (task: Task, day: string | null) => void;
}) {
    const [sheetId, setSheetId] = useState<number | null>(null);
    const sheet = tasks.find((task) => task.id === sheetId) ?? null;
    const lists = new Map(project.lists.map((list) => [list.id, list]));

    const inMonth = tasks.filter(
        (task) => task.dueOn !== null && monthOf(task.dueOn) === month,
    );
    const days = [...new Set(inMonth.map((task) => task.dueOn as string))];

    if (monthOf(today) === month && !days.includes(today)) {
        days.push(today);
    }

    days.sort();
    const undated = tasks.filter(
        (task) => task.dueOn === null && task.completedAt === null,
    );

    useEffect(() => {
        if (window.matchMedia('(max-width: 767px)').matches) {
            document
                .querySelector('[data-agenda-today]')
                ?.scrollIntoView({ block: 'start' });
        }
        // Only when the page opens: later changes keep the reader's place.
    }, []);

    const row = (task: Task, showDue: boolean) => {
        const list = lists.get(task.listId);
        const done = task.completedAt !== null;

        return (
            <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => setSheetId(task.id)}
                onKeyDown={(event) => {
                    if (
                        event.target === event.currentTarget &&
                        (event.key === 'Enter' || event.key === ' ')
                    ) {
                        event.preventDefault();
                        setSheetId(task.id);
                    }
                }}
                className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
                <span
                    className="flex size-8 shrink-0 items-center justify-center"
                    onClick={(event) => event.stopPropagation()}
                >
                    <Checkbox
                        checked={done}
                        disabled={!canManage}
                        aria-label={
                            done
                                ? `Reopen ${task.title}`
                                : `Complete ${task.title}`
                        }
                        className="size-5 rounded-full data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                        onKeyDown={(event) => event.stopPropagation()}
                        onCheckedChange={(checked) =>
                            onSetDone(task, checked === true)
                        }
                    />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                        className={cn(
                            'truncate text-[14.5px] font-semibold',
                            done &&
                                'text-muted-foreground line-through decoration-muted-foreground/50',
                        )}
                    >
                        {task.title}
                    </span>
                    <span
                        className={cn(
                            'flex items-center gap-1.5 text-xs text-muted-foreground',
                            done && 'opacity-70',
                        )}
                    >
                        {showDue ? (
                            <span>No due date</span>
                        ) : (
                            list && (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'size-2 rounded-[3px]',
                                            HUES[list.color].dot,
                                        )}
                                    />
                                    {list.name}
                                </>
                            )
                        )}
                        {task.priority !== 'none' && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span
                                    className={cn(
                                        'font-semibold',
                                        PRIORITIES[task.priority].flag,
                                    )}
                                >
                                    {PRIORITIES[task.priority].label}
                                </span>
                            </>
                        )}
                    </span>
                </span>
                {task.assigneeId !== null && task.assigneeName && (
                    <MemberAvatar
                        id={task.assigneeId}
                        name={task.assigneeName}
                        className="size-7 text-[10px]"
                    />
                )}
            </div>
        );
    };

    const monday = nextMonday(today);
    const quick: [string, string | null][] = [
        ['Today', today],
        ['Tomorrow', shiftDay(today, 1)],
        [shortDay(monday), monday],
        ['No date', null],
    ];
    const sheetList = sheet ? lists.get(sheet.listId) : undefined;

    return (
        <section
            aria-label="Tasks by day"
            data-test="agenda"
            className={cn('flex animate-rise flex-col gap-2.5', className)}
        >
            <div className="flex items-center gap-1.5">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onMonth(shiftMonth(month, -1))}
                    aria-label="Previous month"
                    className="rounded-xl bg-card"
                >
                    <ChevronLeft />
                </Button>
                <h2
                    aria-live="polite"
                    className="flex-1 text-center font-display text-base font-extrabold"
                >
                    {format(parseISO(`${month}-01`), 'MMMM yyyy')}
                </h2>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onMonth(shiftMonth(month, 1))}
                    aria-label="Next month"
                    className="rounded-xl bg-card"
                >
                    <ChevronRight />
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onMonth(monthOf(today))}
                    className="rounded-xl bg-card"
                >
                    Today
                </Button>
            </div>

            <div className="flex flex-col rounded-card bg-card px-2 pb-4">
                {days.map((day) => {
                    const items = inMonth
                        .filter((task) => task.dueOn === day)
                        .sort(dayOrder);
                    const isToday = day === today;
                    const late =
                        day < today &&
                        items.some((task) => task.completedAt === null);

                    return (
                        <section
                            key={day}
                            aria-label={`${format(parseISO(day), 'EEEE d MMMM')}, ${items.length} ${items.length === 1 ? 'task' : 'tasks'}`}
                            data-agenda-today={isToday ? '' : undefined}
                            className="scroll-mt-20"
                        >
                            <h3
                                className={cn(
                                    'sticky top-0 z-[1] flex items-center gap-2 bg-card px-2 pt-3.5 pb-1.5 text-[13px] font-bold',
                                    isToday && 'text-primary',
                                )}
                            >
                                {isToday
                                    ? `Today · ${shortDay(day)}`
                                    : shortDay(day)}
                                {late && (
                                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-400">
                                        Overdue
                                    </span>
                                )}
                            </h3>
                            {items.map((task) => row(task, false))}
                            {items.length === 0 && (
                                <p className="px-2 pb-1 text-[13px] text-muted-foreground">
                                    Nothing due today.
                                </p>
                            )}
                        </section>
                    );
                })}
                {days.length === 0 && (
                    <p className="px-2 py-6 text-center text-[13.5px] text-muted-foreground">
                        No task is due in{' '}
                        {format(parseISO(`${month}-01`), 'MMMM yyyy')}.
                    </p>
                )}
                <section
                    aria-label="No due date"
                    className="mt-2 border-t pt-1"
                >
                    <h3 className="flex items-center gap-2 px-2 pt-3 pb-1.5 text-[13px] font-bold text-muted-foreground">
                        <CalendarX2 className="size-4" aria-hidden="true" />
                        No due date
                        <span className="font-semibold">{undated.length}</span>
                    </h3>
                    {undated.map((task) => row(task, true))}
                </section>
            </div>

            <Drawer
                open={sheet !== null}
                onOpenChange={(open) => !open && setSheetId(null)}
            >
                <DrawerContent>
                    {sheet && (
                        <>
                            <DrawerHeader className="gap-2 text-left">
                                <DrawerDescription className="flex items-center gap-2 text-xs">
                                    {sheetList && (
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'size-2 rounded-[3px]',
                                                HUES[sheetList.color].dot,
                                            )}
                                        />
                                    )}
                                    {sheetList?.name}
                                </DrawerDescription>
                                <DrawerTitle className="text-xl font-extrabold">
                                    {sheet.title}
                                </DrawerTitle>
                            </DrawerHeader>
                            <dl className="grid grid-cols-[86px_minmax(0,1fr)] items-center gap-y-3 px-4 text-sm">
                                <dt className="text-muted-foreground">
                                    Priority
                                </dt>
                                <dd>
                                    <span
                                        className={cn(
                                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                            PRIORITIES[sheet.priority].pill,
                                        )}
                                    >
                                        {PRIORITIES[sheet.priority].label}
                                    </span>
                                </dd>
                                <dt className="text-muted-foreground">
                                    Assignee
                                </dt>
                                <dd className="flex items-center gap-2 font-semibold">
                                    {sheet.assigneeId !== null &&
                                    sheet.assigneeName ? (
                                        <>
                                            <MemberAvatar
                                                id={sheet.assigneeId}
                                                name={sheet.assigneeName}
                                            />
                                            {sheet.assigneeName}
                                        </>
                                    ) : (
                                        <span className="font-normal text-muted-foreground">
                                            Unassigned
                                        </span>
                                    )}
                                </dd>
                                <dt className="self-start pt-0.5 text-muted-foreground">
                                    Due date
                                </dt>
                                <dd className="flex flex-col gap-2.5">
                                    <span className="font-semibold">
                                        {sheet.dueOn
                                            ? format(
                                                  parseISO(sheet.dueOn),
                                                  'EEEE d MMMM',
                                              )
                                            : 'No due date'}
                                    </span>
                                    {canManage && (
                                        <span
                                            role="group"
                                            aria-label="Change the due date"
                                            className="flex flex-wrap gap-1.5"
                                        >
                                            {quick.map(([label, day]) => {
                                                const on = sheet.dueOn === day;

                                                return (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        aria-pressed={on}
                                                        onClick={() =>
                                                            onReschedule(
                                                                sheet,
                                                                day,
                                                            )
                                                        }
                                                        className={cn(
                                                            'h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                                            on
                                                                ? 'border-primary/30 bg-primary/10 text-primary'
                                                                : 'bg-card hover:bg-secondary',
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </span>
                                    )}
                                </dd>
                            </dl>
                            <DrawerFooter className="flex-row gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    disabled={!canManage}
                                    onClick={() =>
                                        onSetDone(
                                            sheet,
                                            sheet.completedAt === null,
                                        )
                                    }
                                >
                                    {sheet.completedAt === null
                                        ? 'Mark done'
                                        : 'Reopen'}
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1"
                                    onClick={() => {
                                        setSheetId(null);
                                        onOpenTask(sheet);
                                    }}
                                >
                                    Open task
                                </Button>
                            </DrawerFooter>
                        </>
                    )}
                </DrawerContent>
            </Drawer>
        </section>
    );
}
