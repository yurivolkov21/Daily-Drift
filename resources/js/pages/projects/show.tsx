import { Head, router, usePage } from '@inertiajs/react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { Board } from '@/components/board/board';
import { ProjectMenu } from '@/components/projects/project-menu';
import { ProjectTile } from '@/components/projects/project-tile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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

                <Board teamSlug={teamSlug} project={project} />
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
