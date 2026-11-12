import { Link, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { HueBar } from '@/components/hue-progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useCountUp } from '@/hooks/use-count-up';
import { hourIn, useLocalTime } from '@/hooks/use-local-time';
import { HUES } from '@/lib/hues';
import { PRIORITIES, percent } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { index as projectsIndex, show as showProject } from '@/routes/projects';
import { complete } from '@/routes/tasks';
import type { DashboardData, FocusTask } from '@/types';

/** A white dashboard card that rises in after `delay` milliseconds. */
export function Card({
    delay,
    className,
    children,
}: {
    delay: number;
    className?: string;
    children: ReactNode;
}) {
    return (
        <article
            className={cn(
                'flex min-w-0 animate-rise flex-col gap-3.5 rounded-card bg-card p-5 transition-[translate,box-shadow] duration-300 ease-slide hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgb(40_30_120/0.35)]',
                className,
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            {children}
        </article>
    );
}

export function CardTitle({
    children,
    aside,
}: {
    children: ReactNode;
    aside?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">{children}</h2>
            {aside}
        </div>
    );
}

export function completeTask(teamSlug: string, task: FocusTask): void {
    router.visit(complete({ current_team: teamSlug, task: task.id }), {
        data: { completed: true },
        preserveScroll: true,
        preserveState: true,
    });
}

function greeting(hour: number): string {
    if (hour < 12) {
        return 'Good morning';
    }

    return hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** The night-blue greeting card with the week's progress ring. */
export function GreetingCard({
    data,
    onShow,
}: {
    data: DashboardData;
    onShow: (group: 'overdue' | 'today') => void;
}) {
    const { auth } = usePage().props;
    const { zone } = useLocalTime();
    const firstName = auth.user.name.trim().split(/\s+/)[0] || auth.user.name;
    const overdue = data.stats.overdue.value;
    const dueToday = data.stats.dueToday.value;
    const share = percent(data.week.completed, data.week.due);
    const shown = useCountUp(share, 1300);
    const circumference = 2 * Math.PI * 70;
    const projects = `${data.activeProjects} ${data.activeProjects === 1 ? 'project' : 'projects'}`;

    const overduePart =
        overdue === 0
            ? 'Nothing is overdue'
            : `${overdue} ${overdue === 1 ? 'task is' : 'tasks are'} overdue`;
    const todayPart =
        dueToday === 0
            ? 'nothing is due today'
            : `${dueToday} ${dueToday === 1 ? 'is' : 'are'} due today`;
    const summary = `${overduePart} and ${todayPart} across ${projects}.`;

    return (
        <article
            className="flex min-w-0 animate-rise flex-wrap items-center justify-between gap-6 rounded-card bg-hero p-6 text-[#dcd9fb] [animation-delay:120ms] md:col-span-2 md:p-7"
            aria-labelledby="greeting"
        >
            <div className="flex flex-[1_1_20rem] flex-col gap-4">
                <div>
                    <p className="text-[13.5px] text-[#b9b6e6]">
                        {format(parseISO(data.today), 'EEEE, d MMMM')}
                    </p>
                    <h1
                        id="greeting"
                        className="mt-1.5 text-[30px] leading-tight font-extrabold tracking-tight text-white"
                    >
                        {greeting(hourIn(zone))}, {firstName}
                    </h1>
                    <p className="mt-2 text-[14.5px]">{summary}</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                    <button
                        type="button"
                        onClick={() => onShow('overdue')}
                        className="flex min-h-10 items-center rounded-xl bg-white px-4 text-sm font-bold text-hero transition-transform outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                        Review overdue
                    </button>
                    <button
                        type="button"
                        onClick={() => onShow('today')}
                        className="flex min-h-10 items-center rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition-colors outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                        Plan my day
                    </button>
                </div>
            </div>
            <svg
                role="img"
                aria-label={
                    data.week.due === 0
                        ? 'Nothing is due this week'
                        : `${share}% of this week's tasks done`
                }
                width="160"
                height="160"
                viewBox="0 0 168 168"
                className="shrink-0"
            >
                <circle
                    cx="84"
                    cy="84"
                    r="70"
                    fill="none"
                    stroke="rgb(255 255 255 / 0.1)"
                    strokeWidth="16"
                />
                <circle
                    cx="84"
                    cy="84"
                    r="70"
                    fill="none"
                    stroke="var(--fresh)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - share / 100)}
                    transform="rotate(-90 84 84)"
                    className="animate-draw [animation-delay:250ms]"
                    style={
                        {
                            '--ring-length': `${circumference}px`,
                        } as CSSProperties
                    }
                />
                <text
                    x="84"
                    y="86"
                    textAnchor="middle"
                    className="fill-white font-display text-[34px] font-extrabold"
                >
                    {data.week.due === 0 ? '–' : `${shown}%`}
                </text>
                <text
                    x="84"
                    y="108"
                    textAnchor="middle"
                    className="fill-[#b9b6e6] text-[12px]"
                >
                    {data.week.due === 0 ? 'nothing due' : 'of this week done'}
                </text>
            </svg>
        </article>
    );
}

export function DueTodayCard({
    teamSlug,
    tasks,
    total,
    onMore,
}: {
    teamSlug: string;
    tasks: FocusTask[];
    total: number;
    onMore: () => void;
}) {
    return (
        <Card delay={180}>
            <CardTitle
                aside={
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {total} {total === 1 ? 'task' : 'tasks'}
                    </span>
                }
            >
                Due today
            </CardTitle>
            {tasks.length === 0 ? (
                <p className="flex flex-1 items-center justify-center rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
                    Nothing is due today.
                </p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {tasks.slice(0, 3).map((task) => (
                        <li
                            key={task.id}
                            className="flex items-start gap-3 rounded-2xl bg-muted p-3"
                        >
                            <Checkbox
                                aria-label={`Complete ${task.title}`}
                                className="mt-0.5 size-[18px] rounded-full"
                                onCheckedChange={() =>
                                    completeTask(teamSlug, task)
                                }
                            />
                            <span className="flex min-w-0 flex-col gap-1">
                                <span className="truncate text-sm font-semibold">
                                    {task.title}
                                </span>
                                <span className="truncate text-[12.5px] text-muted-foreground">
                                    {task.project.name} · {task.list.name}
                                </span>
                                {task.priority !== 'none' && (
                                    <span
                                        className={cn(
                                            'text-xs font-semibold',
                                            PRIORITIES[task.priority].flag,
                                        )}
                                    >
                                        {PRIORITIES[task.priority].label}
                                    </span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {total > 3 && (
                <button
                    type="button"
                    onClick={onMore}
                    className="self-start text-sm font-semibold text-primary"
                >
                    {total - 3} more in My focus
                </button>
            )}
        </Card>
    );
}

export function StatCard({
    label,
    value,
    icon: Icon,
    tone,
    series,
    context,
    delay,
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: { tile: string; bar: string; text: string };
    series: number[];
    context: ReactNode;
    delay: number;
}) {
    const shown = useCountUp(value, 1200, delay);
    const top = Math.max(1, ...series);

    return (
        <Card delay={delay} className="gap-3.5 p-[18px]">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                    {label}
                </span>
                <span
                    className={cn(
                        'flex size-9 items-center justify-center rounded-[11px]',
                        tone.tile,
                    )}
                >
                    <Icon className="size-[18px]" />
                </span>
            </div>
            <div className="flex items-end justify-between gap-2">
                <span className="font-display text-[34px] leading-none font-extrabold tracking-tight tabular-nums">
                    {shown}
                </span>
                <span
                    aria-hidden="true"
                    className="flex h-[34px] items-end gap-[3px]"
                    title="The last 7 days"
                >
                    {series.map((point, index) => (
                        <span
                            key={index}
                            className={cn(
                                'w-1.5 origin-bottom animate-grow rounded-[3px]',
                                tone.bar,
                            )}
                            style={{
                                height: `${6 + (point / top) * 28}px`,
                                opacity: 0.35 + index * 0.1,
                                animationDelay: `${delay + 140 + index * 40}ms`,
                            }}
                        />
                    ))}
                </span>
            </div>
            <span className="text-[12.5px] text-muted-foreground">
                {context}
            </span>
        </Card>
    );
}

export function ProjectsCard({
    teamSlug,
    projects,
}: {
    teamSlug: string;
    projects: DashboardData['projects'];
}) {
    return (
        <Card delay={380}>
            <CardTitle
                aside={
                    <Link
                        href={projectsIndex(teamSlug)}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary no-underline"
                    >
                        All{' '}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                }
            >
                Projects
            </CardTitle>
            {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No active projects yet.
                </p>
            ) : (
                <ul className="flex flex-col gap-3.5">
                    {projects.map((project, position) => {
                        const value = percent(project.completed, project.tasks);

                        return (
                            <li
                                key={project.id}
                                className="flex flex-col gap-2"
                            >
                                <Link
                                    href={showProject({
                                        current_team: teamSlug,
                                        project: project.id,
                                    })}
                                    className="flex items-center gap-2.5 text-[13.5px] text-foreground no-underline"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'flex size-7 items-center justify-center rounded-lg text-xs font-bold',
                                            HUES[project.color].tile,
                                        )}
                                    >
                                        {project.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-semibold">
                                        {project.name}
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">
                                        {value}%
                                    </span>
                                </Link>
                                <HueBar
                                    value={value}
                                    hue={project.color}
                                    delay={`${640 + position * 80}ms`}
                                />
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
