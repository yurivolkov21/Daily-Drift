import { Head, router, usePage } from '@inertiajs/react';
import { Archive, ArchiveRestore, ListTodo } from 'lucide-react';
import { ProjectMenu } from '@/components/projects/project-menu';
import { ProjectTile } from '@/components/projects/project-tile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { HUES } from '@/lib/hues';
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

                <div className="-mx-4 flex snap-x scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-4 md:-mx-6 md:scroll-px-6 md:px-6">
                    {project.lists.map((list) => (
                        <section
                            key={list.id}
                            aria-label={list.name}
                            className={cn(
                                'flex w-[19rem] shrink-0 snap-start flex-col gap-2 rounded-2xl border p-2',
                                HUES[list.color].column,
                            )}
                        >
                            <div className="flex items-center gap-2 px-1.5 pt-1">
                                <span
                                    className={cn(
                                        'size-2.5 rounded-full',
                                        HUES[list.color].dot,
                                    )}
                                />
                                <h2 className="truncate text-sm font-semibold">
                                    {list.name}
                                </h2>
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-px text-xs font-medium tabular-nums',
                                        HUES[list.color].pill,
                                    )}
                                >
                                    0
                                </span>
                            </div>
                            <div className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-current/10 text-center text-xs text-muted-foreground">
                                <ListTodo className="size-4" />
                                No tasks yet
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </>
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
