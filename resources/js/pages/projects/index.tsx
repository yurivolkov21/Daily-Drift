import { Head, Link, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import { ProjectFormDialog } from '@/components/project-form-dialog';
import { Button } from '@/components/ui/button';
import { index as issuesIndex } from '@/routes/issues';
import { destroy, index } from '@/routes/projects';
import type { ProjectSummary } from '@/types';

type Props = {
    projects: ProjectSummary[];
    canDeleteProjects: boolean;
};

export default function ProjectsIndex({ projects, canDeleteProjects }: Props) {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';
    const [formSession, setFormSession] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [editedProject, setEditedProject] = useState<ProjectSummary | null>(
        null,
    );
    const [deletedProject, setDeletedProject] = useState<ProjectSummary | null>(
        null,
    );

    const openProjectForm = (project: ProjectSummary | null) => {
        setEditedProject(project);
        setFormSession((session) => session + 1);
        setFormOpen(true);
    };

    return (
        <>
            <Head title="Projects" />

            <div className="flex flex-col gap-10 px-4 py-6">
                <section className="grid gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <Heading
                            variant="small"
                            title="Projects"
                            description="Each project has its own issue numbers, like DD-1."
                        />
                        <Button
                            size="sm"
                            data-test="new-project-button"
                            onClick={() => openProjectForm(null)}
                        >
                            <Plus />
                            New project
                        </Button>
                    </div>

                    {projects.length === 0 ? (
                        <p className="border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No projects yet. Create one to start tracking
                            issues.
                        </p>
                    ) : (
                        <div className="divide-y border">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    data-test="project-row"
                                    className="flex items-center gap-4 p-4"
                                >
                                    <span className="w-12 shrink-0 text-xs font-semibold">
                                        {project.key}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={issuesIndex(teamSlug, {
                                                query: { project: project.key },
                                            })}
                                            className="font-medium hover:underline"
                                        >
                                            {project.name}
                                        </Link>
                                        {project.description ? (
                                            <p className="truncate text-sm text-muted-foreground">
                                                {project.description}
                                            </p>
                                        ) : null}
                                    </div>
                                    <span className="hidden text-xs text-muted-foreground sm:inline">
                                        {project.openIssuesCount} open ·{' '}
                                        {project.issuesCount} total
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Edit ${project.name}`}
                                        onClick={() => openProjectForm(project)}
                                    >
                                        <Pencil />
                                    </Button>
                                    {canDeleteProjects ? (
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            aria-label={`Delete ${project.name}`}
                                            onClick={() =>
                                                setDeletedProject(project)
                                            }
                                        >
                                            <Trash2 />
                                        </Button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <ProjectFormDialog
                key={formSession}
                teamSlug={teamSlug}
                project={editedProject}
                open={formOpen}
                onOpenChange={setFormOpen}
            />

            <ConfirmDialog
                open={deletedProject !== null}
                onOpenChange={(open) => !open && setDeletedProject(null)}
                title={`Delete ${deletedProject?.name ?? 'project'}?`}
                description={`This deletes the project and all ${deletedProject?.issuesCount ?? 0} of its issues. This cannot be undone.`}
                confirmLabel="Delete project"
                onConfirm={() => {
                    if (deletedProject) {
                        router.delete(
                            destroy.url([teamSlug, deletedProject.id]),
                            {
                                preserveScroll: true,
                                onSuccess: () => setDeletedProject(null),
                            },
                        );
                    }
                }}
            />
        </>
    );
}

ProjectsIndex.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Projects',
            href: index(props.currentTeam?.slug ?? ''),
        },
    ],
});
