import { Head, Link, router, usePage } from '@inertiajs/react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Check, ChevronDown, ListTodo } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PriorityPill } from '@/components/board/task-badges';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocalTime } from '@/hooks/use-local-time';
import { teamCrumb } from '@/lib/breadcrumbs';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { myTasks } from '@/routes';
import { show as showProject } from '@/routes/projects';
import { complete } from '@/routes/tasks';
import type { MyTask, MyTaskGroup, MyTasksData } from '@/types';

type Props = {
    myTasks: MyTasksData;
    filters: { project: number | null };
};

const GROUPS: {
    key: MyTaskGroup;
    label: string;
    text: string;
    pill: string;
}[] = [
    {
        key: 'overdue',
        label: 'Overdue',
        text: 'text-rose-600 dark:text-rose-400',
        pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    {
        key: 'today',
        label: 'Today',
        text: 'text-amber-700 dark:text-amber-400',
        pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    },
    {
        key: 'week',
        label: 'Next 7 days',
        text: 'text-primary',
        pill: 'bg-primary/10 text-primary',
    },
    {
        key: 'later',
        label: 'Later',
        text: 'text-muted-foreground',
        pill: 'bg-muted text-muted-foreground',
    },
    {
        key: 'none',
        label: 'No due date',
        text: 'text-muted-foreground',
        pill: 'bg-muted text-muted-foreground',
    },
];

/** The task's local date (`Y-m-d`) in a time zone. */
function dayIn(iso: string, zone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(
        new Date(iso),
    );
}

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * The viewer's open tasks in the current team (spec 0004), grouped by their
 * own day: Overdue, Today, Next 7 days, Later and No due date, then what
 * they finished in the last 7 days.
 */
export default function MyTasks({ myTasks: data, filters }: Props) {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? '';
    const { today, zone } = useLocalTime();
    const [folded, setFolded] = useState<Record<string, boolean>>({
        done: true,
    });
    const [leaving, setLeaving] = useState<number[]>([]);

    const toggle = (key: string) =>
        setFolded((current) => ({ ...current, [key]: !current[key] }));

    const pickProject = (project: number | null) =>
        router.get(myTasks(teamSlug).url, project ? { project } : {}, {
            preserveScroll: true,
            preserveState: true,
        });

    const setCompleted = (task: MyTask, completed: boolean) =>
        router.visit(complete({ current_team: teamSlug, task: task.id }), {
            data: { completed },
            preserveScroll: true,
            preserveState: true,
            onFinish: () =>
                setLeaving((ids) => ids.filter((id) => id !== task.id)),
            onSuccess: () => {
                if (completed) {
                    toast(`“${task.title}” is done`, {
                        action: {
                            label: 'Undo',
                            onClick: () => setCompleted(task, false),
                        },
                    });
                }
            },
        });

    const finish = (task: MyTask) => {
        setLeaving((ids) => [...ids, task.id]);
        window.setTimeout(() => setCompleted(task, true), 360);
    };

    const due = (task: MyTask, group: MyTaskGroup): string => {
        if (!task.dueOn) {
            return 'No date';
        }

        if (group === 'overdue') {
            const late = differenceInCalendarDays(
                parseISO(today),
                parseISO(task.dueOn),
            );

            return `${plural(late, 'day')} late`;
        }

        if (group === 'today') {
            return 'Today';
        }

        return format(
            parseISO(task.dueOn),
            group === 'week' ? 'EEE d MMM' : 'd MMM',
        );
    };

    const doneWhen = (iso: string | null): string => {
        if (!iso) {
            return '';
        }

        const day = dayIn(iso, zone);
        const ago = differenceInCalendarDays(parseISO(today), parseISO(day));

        if (ago === 0) {
            return 'Today';
        }

        return ago === 1 ? 'Yesterday' : format(parseISO(day), 'EEE d MMM');
    };

    const groups = GROUPS.map((group) => ({
        ...group,
        tasks: data.groups[group.key],
    })).filter((group) => group.tasks.length > 0);
    const count = (key: MyTaskGroup) => data.groups[key].length;
    const chips = [
        { id: null, name: 'All projects', color: null, count: data.openCount },
        ...data.projects,
    ];

    return (
        <>
            <Head title="My tasks" />

            <section className="flex animate-rise flex-col gap-4 rounded-card bg-card p-5 [animation-delay:60ms] md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">
                            My tasks
                        </h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {format(parseISO(today), 'EEEE, d MMMM')}.{' '}
                            {count('today')} due today, {count('overdue')}{' '}
                            overdue and {count('week')} in the next 7 days.
                        </p>
                    </div>
                    <span className="text-[13px] text-muted-foreground">
                        {data.openCount} open, assigned to you
                    </span>
                </div>
                {data.projects.length > 0 && (
                    <div
                        role="radiogroup"
                        aria-label="Project"
                        className="flex flex-wrap gap-2"
                    >
                        {chips.map((chip) => {
                            const on = filters.project === chip.id;

                            return (
                                <button
                                    key={chip.id ?? 'all'}
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    onClick={() => pickProject(chip.id)}
                                    className={cn(
                                        'flex min-h-[34px] items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        on
                                            ? 'border-foreground bg-foreground text-background'
                                            : 'bg-card hover:bg-muted',
                                    )}
                                >
                                    {chip.color && (
                                        <span
                                            className={cn(
                                                'size-2.5 rounded-[3px]',
                                                HUES[chip.color].dot,
                                            )}
                                        />
                                    )}
                                    {chip.name}
                                    <span
                                        className={cn(
                                            'font-medium',
                                            on
                                                ? 'text-background/70'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {chip.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            <section
                aria-label="Tasks"
                className="flex animate-rise flex-col gap-1 rounded-card bg-card p-2.5 [animation-delay:120ms]"
            >
                {groups.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                        <ListTodo className="size-6 text-muted-foreground" />
                        <p className="text-sm font-semibold">
                            {data.openCount === 0
                                ? 'Nothing is assigned to you yet'
                                : 'Nothing open in this project'}
                        </p>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Open a task on a board and pick yourself under
                            Assignee, or ask a teammate to.
                        </p>
                    </div>
                )}

                {groups.map((group, position) => (
                    <div
                        key={group.key}
                        className="flex animate-rise flex-col"
                        style={{ animationDelay: `${160 + position * 70}ms` }}
                    >
                        <GroupHeader
                            label={group.label}
                            count={group.tasks.length}
                            text={group.text}
                            pill={group.pill}
                            open={!folded[group.key]}
                            onToggle={() => toggle(group.key)}
                        />
                        <Fold open={!folded[group.key]}>
                            <ul className="flex flex-col gap-0.5 pb-1.5 pl-5.5">
                                {group.tasks.map((task) => (
                                    <Row
                                        key={task.id}
                                        teamSlug={teamSlug}
                                        task={task}
                                        due={due(task, group.key)}
                                        dueClass={
                                            group.key === 'overdue' ||
                                            group.key === 'today'
                                                ? group.text
                                                : 'text-muted-foreground'
                                        }
                                        leaving={leaving.includes(task.id)}
                                        onComplete={() => finish(task)}
                                    />
                                ))}
                            </ul>
                        </Fold>
                    </div>
                ))}

                <div className="mt-1 flex flex-col">
                    <GroupHeader
                        label="Done lately"
                        hint="last 7 days"
                        count={data.done.length}
                        text="text-green-700 dark:text-green-400"
                        pill="bg-green-500/12 text-green-700 dark:text-green-400"
                        open={!folded.done}
                        onToggle={() => toggle('done')}
                    />
                    <Fold open={!folded.done}>
                        <ul className="flex flex-col gap-0.5 pb-1.5 pl-5.5">
                            {data.done.map((task) => (
                                <li
                                    key={task.id}
                                    className="flex items-center gap-3 rounded-[14px] px-3 py-2.5"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-green-500 text-white"
                                    >
                                        <Check className="size-3 stroke-4" />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="truncate text-sm text-muted-foreground line-through">
                                            {task.title}
                                        </span>
                                        <ProjectLine task={task} />
                                    </span>
                                    <span className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                                        {doneWhen(task.completedAt)}
                                    </span>
                                </li>
                            ))}
                            {data.done.length === 0 && (
                                <li className="px-3 py-2.5 text-sm text-muted-foreground">
                                    Nothing finished in the last 7 days.
                                </li>
                            )}
                        </ul>
                    </Fold>
                </div>
            </section>
        </>
    );
}

function GroupHeader({
    label,
    hint,
    count,
    text,
    pill,
    open,
    onToggle,
}: {
    label: string;
    hint?: string;
    count: number;
    text: string;
    pill: string;
    open: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <ChevronDown
                className={cn(
                    'size-4 text-muted-foreground transition-transform duration-300 ease-slide',
                    !open && '-rotate-90',
                )}
            />
            <span className={cn('text-[14.5px] font-bold', text)}>{label}</span>
            <span
                className={cn(
                    'rounded-full px-2 py-px text-xs font-semibold tabular-nums',
                    pill,
                )}
            >
                {count}
            </span>
            {hint && (
                <span className="text-[12.5px] text-muted-foreground">
                    {hint}
                </span>
            )}
            <span
                aria-hidden="true"
                className="ml-1.5 h-px flex-1 bg-border/70"
            />
        </button>
    );
}

function Fold({ open, children }: { open: boolean; children: ReactNode }) {
    return (
        <div
            inert={!open}
            className={cn(
                'grid transition-[grid-template-rows] duration-450 ease-slide',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
        >
            <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
    );
}

function ProjectLine({ task }: { task: MyTask }) {
    return (
        <span className="flex items-center gap-1.5 truncate text-[12.5px] text-muted-foreground">
            <span
                className={cn(
                    'size-2 shrink-0 rounded-[3px]',
                    HUES[task.project.color].dot,
                )}
            />
            {task.project.name} · {task.list.name}
        </span>
    );
}

function Row({
    teamSlug,
    task,
    due,
    dueClass,
    leaving,
    onComplete,
}: {
    teamSlug: string;
    task: MyTask;
    due: string;
    dueClass: string;
    leaving: boolean;
    onComplete: () => void;
}) {
    return (
        <li
            data-test="my-task-row"
            className={cn(
                'flex flex-wrap items-center gap-3 rounded-[14px] px-3 py-2.5 transition-[background-color,opacity] duration-300 hover:bg-muted/70',
                leaving && 'opacity-45',
            )}
        >
            <Checkbox
                checked={leaving}
                disabled={leaving}
                aria-label={`Complete ${task.title}`}
                onCheckedChange={(checked) => checked === true && onComplete()}
                className="size-[22px] rounded-full"
            />
            <span className="flex min-w-0 flex-[1_1_14rem] flex-col gap-0.5">
                <Link
                    href={`${showProject({ current_team: teamSlug, project: task.project.id }).url}?task=${task.id}`}
                    className={cn(
                        'truncate text-sm font-semibold text-foreground no-underline hover:text-primary',
                        leaving && 'line-through',
                    )}
                >
                    {task.title}
                </Link>
                <ProjectLine task={task} />
            </span>
            <PriorityPill priority={task.priority} />
            <span
                className={cn(
                    'min-w-24 text-right text-[12.5px] font-semibold whitespace-nowrap',
                    dueClass,
                )}
            >
                {due}
            </span>
        </li>
    );
}

MyTasks.layout = (props: {
    currentTeam?: { name: string; slug: string } | null;
}) => ({
    breadcrumbs: [
        ...teamCrumb(props.currentTeam),
        ...(props.currentTeam
            ? [{ title: 'My tasks', href: myTasks(props.currentTeam.slug) }]
            : []),
    ],
});
