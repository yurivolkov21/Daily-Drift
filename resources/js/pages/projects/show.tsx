import { Head, router, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    Archive,
    ArchiveRestore,
    CalendarClock,
    CheckCheck,
    ChevronsLeft,
    ListTodo,
    Plus,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openAddTask } from '@/components/board/add-task';
import { FilterBar } from '@/components/board/filter-bar';
import { Board } from '@/components/board/board';
import type { Member } from '@/components/board/assignee-field';
import { TaskSheet } from '@/components/board/task-sheet';
import { useOpenTask } from '@/components/board/use-open-task';
import { HeaderActions } from '@/components/header-actions';
import { useTeamLabels } from '@/components/labels/label-badge';
import { useLocalTime } from '@/hooks/use-local-time';
import type { BoardFilters } from '@/lib/board-filters';
import {
    matches,
    NO_FILTERS,
    readFilters,
    writeFilters,
} from '@/lib/board-filters';
import { HueBar } from '@/components/hue-progress';
import { ProjectMenu } from '@/components/projects/project-menu';
import { Button } from '@/components/ui/button';
import { CalendarView } from '@/components/views/calendar-view';
import { ListView } from '@/components/views/list-view';
import { ViewSwitch } from '@/components/views/view-switch';
import { teamCrumb } from '@/lib/breadcrumbs';
import { HUES } from '@/lib/hues';
import type { ListSort, ProjectView, SortKey } from '@/lib/project-views';
import {
    monthOf,
    nextSort,
    readMonth,
    readSort,
    readView,
    remember,
    remembered,
    viewKey,
    writeViewParams,
} from '@/lib/project-views';
import { rememberRecent } from '@/lib/recent';
import { percent } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { index, restore, show } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    project: Project;
};

export default function ProjectShow({ project }: Props) {
    const { currentTeam, auth } = usePage().props;
    const teamSlug = currentTeam?.slug ?? '';
    const { today } = useLocalTime();
    const { labels } = useTeamLabels();
    const members = (usePage().props.members as Member[] | undefined) ?? [];
    // The board's filters live in the address (spec 0007).
    const [filters, setFilters] = useState<BoardFilters>(() =>
        typeof window === 'undefined'
            ? NO_FILTERS
            : readFilters(window.location.search),
    );
    const changeFilters = (next: BoardFilters) => {
        setFilters(next);
        writeFilters(next);
    };
    // The view and its sort or month live in the address too; the last view
    // of each project is remembered in this browser (spec 0008).
    const [view, setView] = useState<ProjectView>(() =>
        typeof window === 'undefined'
            ? 'board'
            : (readView(window.location.search) ??
              remembered<ProjectView>(viewKey(project.id), 'board')),
    );
    const [sort, setSort] = useState<ListSort>(() =>
        typeof window === 'undefined' ? null : readSort(window.location.search),
    );
    const [month, setMonth] = useState<string>(
        () =>
            (typeof window === 'undefined'
                ? null
                : readMonth(window.location.search)) ?? monthOf(today),
    );
    const projectPath = show({
        current_team: teamSlug,
        project: project.id,
    }).url.split('?')[0];
    const viewParams = useRef({ view, sort, month });
    viewParams.current = { view, sort, month };
    useEffect(() => {
        writeViewParams(view, sort, month);
        remember(viewKey(project.id), view);
    }, [project.id, view, sort, month]);
    // Inertia writes the page's own address after it loads and after each
    // visit; put the view back each time.
    useEffect(
        () =>
            router.on('navigate', (event) => {
                // Only on this project's page, not on the next page visited.
                if (
                    new URL(event.detail.page.url, window.location.origin)
                        .pathname !== projectPath
                ) {
                    return;
                }

                const current = viewParams.current;
                writeViewParams(current.view, current.sort, current.month);
            }),
        [projectPath],
    );
    const changeMonth = useCallback((next: string) => setMonth(next), []);
    const { openTask, showTask } = useOpenTask(teamSlug, project);
    const allTasks = project.lists.flatMap((list) => list.tasks ?? []);
    const shown = allTasks.filter((task) =>
        matches(task, filters, auth.user.id, today),
    ).length;

    // The search box lists what was opened lately (spec 0007).
    useEffect(() => {
        rememberRecent(teamSlug, {
            kind: 'project',
            id: project.id,
            title: project.name,
            color: project.color,
        });
    }, [teamSlug, project.id, project.name, project.color]);
    const firstList = project.lists[0];
    const { stats } = project;
    const progress = percent(stats.completed, stats.tasks);

    return (
        <>
            <Head title={project.name} />

            {project.can.manageLists && firstList && (
                <HeaderActions>
                    <Button
                        onClick={() => openAddTask(firstList.id)}
                        className="h-10 rounded-xl px-4 shadow-[0_8px_20px_-10px_var(--primary)]"
                    >
                        <Plus /> New task
                    </Button>
                </HeaderActions>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
                <section className="flex animate-rise flex-wrap items-center gap-x-5 gap-y-4 rounded-card bg-card px-5 py-4 [animation-delay:110ms]">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'flex size-13 shrink-0 items-center justify-center rounded-[15px] font-display text-xl font-extrabold text-white shadow-[0_12px_24px_-14px_rgb(23_21_59/0.6)]',
                            HUES[project.archivedAt ? 'slate' : project.color]
                                .dot,
                        )}
                    >
                        {project.name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                    <div className="min-w-0 flex-[1_1_16rem]">
                        <h1 className="truncate text-[22px] font-extrabold tracking-tight">
                            {project.name}
                        </h1>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                            {project.description || 'No description yet.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip icon={<ListTodo />}>
                            {stats.tasks - stats.completed} open
                        </Chip>
                        <Chip icon={<CheckCheck />}>
                            {stats.completed} done
                        </Chip>
                        {stats.overdue > 0 && (
                            <Chip
                                icon={<AlarmClock />}
                                className="bg-red-500/10 text-red-700 dark:text-red-400"
                            >
                                {stats.overdue} overdue
                            </Chip>
                        )}
                        {stats.dueSoon > 0 && (
                            <Chip
                                icon={<CalendarClock />}
                                className="bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            >
                                {stats.dueSoon} in 7 days
                            </Chip>
                        )}
                    </div>
                    <div className="flex w-44 flex-col gap-1.5">
                        <span className="flex justify-between text-xs">
                            <strong className="tabular-nums">
                                {progress}% done
                            </strong>
                            <span className="text-muted-foreground tabular-nums">
                                {stats.completed} of {stats.tasks}
                            </span>
                        </span>
                        <HueBar
                            value={progress}
                            hue={project.color}
                            delay="400ms"
                            className="h-[7px]"
                        />
                    </div>
                    <ProjectMenu
                        teamSlug={teamSlug}
                        project={project}
                        variant="outline"
                        className="rounded-xl"
                    />
                    <FilterBar
                        filters={filters}
                        onChange={changeFilters}
                        tasks={allTasks}
                        labels={labels}
                        members={members}
                        me={auth.user.id}
                        today={today}
                        shown={shown}
                        noun={view === 'board' ? 'card' : 'task'}
                        leading={
                            <ViewSwitch
                                value={view}
                                onChange={setView}
                                className="max-sm:w-full"
                            />
                        }
                    />
                </section>

                {project.archivedAt && (
                    <div
                        role="status"
                        className="flex animate-rise flex-wrap items-center gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900 [animation-delay:140ms] dark:text-amber-200"
                    >
                        <Archive className="size-4" />
                        <span className="flex-1">
                            <strong>This project is archived.</strong> Its lists
                            and tasks are read-only until it is restored.
                        </span>
                        {project.can.restore && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                onClick={() =>
                                    router.visit(
                                        restore({
                                            current_team: teamSlug,
                                            project: project.id,
                                        }),
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                <ArchiveRestore /> Restore
                            </Button>
                        )}
                    </div>
                )}

                {view === 'list' && (
                    <ListView
                        teamSlug={teamSlug}
                        project={project}
                        filters={filters}
                        me={auth.user.id}
                        today={today}
                        sort={sort}
                        onSort={(key: SortKey) =>
                            setSort((current) => nextSort(current, key))
                        }
                        onOpenTask={showTask}
                    />
                )}

                {view === 'calendar' && (
                    <CalendarView
                        teamSlug={teamSlug}
                        project={project}
                        filters={filters}
                        me={auth.user.id}
                        today={today}
                        month={month}
                        onMonth={changeMonth}
                        onOpenTask={showTask}
                    />
                )}

                {view === 'board' && (
                    <Board
                        teamSlug={teamSlug}
                        project={project}
                        filters={filters}
                        me={auth.user.id}
                        today={today}
                        onOpenTask={showTask}
                    />
                )}

                <TaskSheet
                    teamSlug={teamSlug}
                    project={project}
                    task={openTask}
                    canManage={project.can.manageLists}
                    onClose={() => showTask(null)}
                />

                {view === 'board' && (
                    <p className="animate-rise px-1 text-[12.5px] text-muted-foreground [animation-delay:500ms]">
                        Drag a card to move it, or press{' '}
                        <kbd className="rounded border bg-card px-1 font-sans text-[11px]">
                            Alt
                        </kbd>{' '}
                        + arrow keys. Fold a list with{' '}
                        <ChevronsLeft
                            className="inline size-3.5 align-[-2px] text-foreground"
                            aria-label="the fold button"
                        />
                        : it still takes dropped cards and keeps its count.
                    </p>
                )}
            </div>
        </>
    );
}

function Chip({
    icon,
    children,
    className,
}: {
    icon: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground [&_svg]:size-3.5',
                className,
            )}
        >
            {icon}
            {children}
        </span>
    );
}

ProjectShow.layout = (props: {
    currentTeam?: { name: string; slug: string } | null;
    project: Project;
}) => ({
    breadcrumbs: [
        ...teamCrumb(props.currentTeam),
        {
            title: 'Projects',
            href: props.currentTeam ? index(props.currentTeam.slug) : '/',
        },
        {
            title: props.project.name,
            href: props.currentTeam
                ? show({
                      current_team: props.currentTeam.slug,
                      project: props.project.id,
                  })
                : '/',
        },
    ],
});
