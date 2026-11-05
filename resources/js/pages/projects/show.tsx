import { Head, router, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    Archive,
    ArchiveRestore,
    CalendarClock,
    CheckCheck,
    ListTodo,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Board } from '@/components/board/board';
import { HueBar } from '@/components/hue-progress';
import { ProjectMenu } from '@/components/projects/project-menu';
import { ProjectTile } from '@/components/projects/project-tile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { percent } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { index, restore, show } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    project: Project;
};

export default function ProjectShow({ project }: Props) {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? '';

    return (
        <>
            <Head title={project.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <ProjectTile
                            name={project.name}
                            color={project.color}
                            className="size-11 text-lg"
                        />
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-semibold tracking-tight">
                                {project.name}
                            </h1>
                            {project.description && (
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {project.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <ProjectMenu
                        teamSlug={teamSlug}
                        project={project}
                        variant="outline"
                    />
                </div>

                {project.archivedAt && (
                    <Alert>
                        <Archive />
                        <AlertTitle>This project is archived</AlertTitle>
                        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                            <span>
                                Its lists and tasks are read-only until it is
                                restored.
                            </span>
                            {project.can.restore && (
                                <Button
                                    size="sm"
                                    variant="outline"
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
                        </AlertDescription>
                    </Alert>
                )}

                <BoardSummary project={project} />

                <Board teamSlug={teamSlug} project={project} />
            </div>
        </>
    );
}

function BoardSummary({ project }: { project: Project }) {
    const { stats } = project;
    const value = percent(stats.completed, stats.tasks);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Chip icon={<ListTodo />}>
                {stats.tasks} {stats.tasks === 1 ? 'task' : 'tasks'}
            </Chip>
            <Chip icon={<CheckCheck />}>{stats.completed} done</Chip>
            {stats.overdue > 0 && (
                <Chip
                    icon={<AlarmClock />}
                    className="border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                >
                    {stats.overdue} overdue
                </Chip>
            )}
            {stats.dueSoon > 0 && (
                <Chip
                    icon={<CalendarClock />}
                    className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                    {stats.dueSoon} due this week
                </Chip>
            )}
            <div className="ml-auto hidden items-center gap-3 sm:flex">
                <span className="text-xs text-muted-foreground">Progress</span>
                <HueBar value={value} hue={project.color} className="w-40" />
                <span className="text-sm font-semibold tabular-nums">
                    {value}%
                </span>
            </div>
        </div>
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
                'inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground [&_svg]:size-3.5',
                className,
            )}
        >
            {icon}
            {children}
        </span>
    );
}

ProjectShow.layout = (props: {
    currentTeam?: { slug: string } | null;
    project: Project;
}) => ({
    breadcrumbs: [
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
