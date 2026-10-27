import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { ProjectFormDialog } from '@/components/project-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { labelColors } from '@/lib/issues';
import { cn } from '@/lib/utils';
import { index as issuesIndex } from '@/routes/issues';
import { destroy as destroyLabel, store as storeLabel } from '@/routes/labels';
import { destroy, index } from '@/routes/projects';
import type { IssueLabelSummary, ProjectSummary } from '@/types';

type Props = {
    projects: ProjectSummary[];
    labels: IssueLabelSummary[];
    canDeleteProjects: boolean;
};

export default function ProjectsIndex({
    projects,
    labels,
    canDeleteProjects,
}: Props) {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';
    const [formSession, setFormSession] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [editedProject, setEditedProject] = useState<ProjectSummary | null>(
        null,
    );
    const [deletedProject, setDeletedProject] = useState<ProjectSummary | null>(
        null,
    );
    const [deletedLabel, setDeletedLabel] = useState<IssueLabelSummary | null>(
        null,
    );
    const [labelColor, setLabelColor] = useState(labelColors[0]);

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

                <section className="grid max-w-xl gap-4">
                    <Heading
                        variant="small"
                        title="Labels"
                        description="Labels are shared by every project in the team."
                    />

                    <Form
                        {...storeLabel.form(teamSlug)}
                        options={{ preserveScroll: true }}
                        resetOnSuccess={['name']}
                        className="grid gap-2"
                    >
                        {({ errors, processing }) => (
                            <>
                                <div className="flex items-end gap-2">
                                    <Input
                                        name="name"
                                        aria-label="Label name"
                                        data-test="label-name"
                                        placeholder="New label"
                                        required
                                    />
                                    <input
                                        type="hidden"
                                        name="color"
                                        value={labelColor}
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={processing}
                                    >
                                        Add
                                    </Button>
                                </div>
                                <div
                                    className="flex gap-1.5"
                                    role="radiogroup"
                                    aria-label="Label color"
                                >
                                    {labelColors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            role="radio"
                                            aria-checked={labelColor === color}
                                            aria-label={color}
                                            className={cn(
                                                'size-5 rounded-full ring-offset-2 ring-offset-background',
                                                labelColor === color &&
                                                    'ring-2 ring-foreground',
                                            )}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setLabelColor(color)}
                                        />
                                    ))}
                                </div>
                                <InputError message={errors.name} />
                                <InputError message={errors.color} />
                            </>
                        )}
                    </Form>

                    {labels.length > 0 ? (
                        <div className="divide-y border">
                            {labels.map((label) => (
                                <div
                                    key={label.id}
                                    data-test="label-row"
                                    className="flex items-center gap-3 px-4 py-2 text-sm"
                                >
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: label.color,
                                        }}
                                    />
                                    <span className="flex-1">{label.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {label.issuesCount} issues
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Delete label ${label.name}`}
                                        onClick={() => setDeletedLabel(label)}
                                    >
                                        <X />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : null}
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

            <ConfirmDialog
                open={deletedLabel !== null}
                onOpenChange={(open) => !open && setDeletedLabel(null)}
                title={`Delete label ${deletedLabel?.name ?? ''}?`}
                description="The label will be removed from every issue that uses it."
                confirmLabel="Delete label"
                onConfirm={() => {
                    if (deletedLabel) {
                        router.delete(
                            destroyLabel.url([teamSlug, deletedLabel.id]),
                            {
                                preserveScroll: true,
                                onSuccess: () => setDeletedLabel(null),
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
