import { Head, router, usePage } from '@inertiajs/react';
import { FolderOpen, Inbox, LayoutGrid, List, Plus, Rows3 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ProjectCards } from '@/components/project-cards';
import { ProjectDialog } from '@/components/project-dialog';
import type { ProjectDialogDefaults } from '@/components/project-dialog';
import { ProjectGroups } from '@/components/project-groups';
import type { ProjectActions } from '@/components/project-parts';
import { ProjectTable } from '@/components/project-table';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Kbd } from '@/components/ui/kbd';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { useProjectDisplay } from '@/hooks/use-project-display';
import type { ProjectView } from '@/hooks/use-project-display';
import { toggled } from '@/lib/display-store';
import { projectStatusLabel, projectStatuses } from '@/lib/projects';
import { destroy, index } from '@/routes/projects';
import type { ProjectStatus, ProjectSummary } from '@/types';

type Props = {
    projects: ProjectSummary[];
    canDeleteProjects: boolean;
};

type StatusFilter = 'all' | ProjectStatus;

const viewOptions: { value: ProjectView; label: string; icon: typeof Rows3 }[] =
    [
        { value: 'table', label: 'Table view', icon: Rows3 },
        { value: 'cards', label: 'Card view', icon: LayoutGrid },
        { value: 'groups', label: 'Grouped view', icon: List },
    ];

export default function ProjectsIndex({ projects, canDeleteProjects }: Props) {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';
    const [display, updateDisplay] = useProjectDisplay();
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [dialog, setDialog] = useState<{
        session: number;
        project: ProjectSummary | null;
        defaults: ProjectDialogDefaults;
    }>({ session: 0, project: null, defaults: {} });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deletedProject, setDeletedProject] = useState<ProjectSummary | null>(
        null,
    );

    const openDialog = (
        project: ProjectSummary | null,
        defaults: ProjectDialogDefaults = {},
    ) => {
        setDialog((current) => ({
            session: current.session + 1,
            project,
            defaults,
        }));
        setDialogOpen(true);
    };

    const actions: ProjectActions = {
        edit: (project) => openDialog(project),
        delete: canDeleteProjects ? setDeletedProject : null,
    };

    useHotkeys([
        {
            keys: 'v',
            handler: () => {
                const current = viewOptions.findIndex(
                    ({ value }) => value === display.view,
                );

                updateDisplay({
                    view: viewOptions[(current + 1) % viewOptions.length].value,
                });
            },
        },
    ]);

    const counts = Object.fromEntries(
        projectStatuses.map(({ value }) => [
            value,
            projects.filter((project) => project.status === value).length,
        ]),
    ) as Record<ProjectStatus, number>;
    const filters: { value: StatusFilter; label: string; count: number }[] = [
        { value: 'all', label: 'All', count: projects.length },
        ...projectStatuses
            .filter(({ value }) => counts[value] > 0 || filter === value)
            .map(({ value, label }) => ({
                value,
                label,
                count: counts[value],
            })),
    ];
    const visible =
        filter === 'all'
            ? projects
            : projects.filter((project) => project.status === filter);

    return (
        <>
            <Head title="Projects" />

            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                    <h1 className="mr-2 text-sm font-semibold">Projects</h1>

                    {projects.length > 0 ? (
                        <div
                            role="group"
                            aria-label="Filter by status"
                            className="flex flex-wrap items-center gap-1"
                        >
                            {filters.map((option) => (
                                <Button
                                    key={option.value}
                                    size="xs"
                                    variant={
                                        filter === option.value
                                            ? 'secondary'
                                            : 'ghost'
                                    }
                                    aria-pressed={filter === option.value}
                                    onClick={() => setFilter(option.value)}
                                >
                                    {option.label}
                                    <span className="font-medium tracking-normal text-muted-foreground tabular-nums">
                                        {option.count}
                                    </span>
                                </Button>
                            ))}
                        </div>
                    ) : null}

                    <div className="ml-auto flex items-center gap-1">
                        <div className="flex border">
                            {viewOptions.map(
                                ({ value, label, icon: ViewIcon }) => (
                                    <Tooltip key={value}>
                                        <TooltipTrigger
                                            render={
                                                <Button
                                                    size="icon-xs"
                                                    variant={
                                                        display.view === value
                                                            ? 'secondary'
                                                            : 'ghost'
                                                    }
                                                    aria-label={label}
                                                    aria-pressed={
                                                        display.view === value
                                                    }
                                                    onClick={() =>
                                                        updateDisplay({
                                                            view: value,
                                                        })
                                                    }
                                                />
                                            }
                                        >
                                            <ViewIcon />
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                            {label}
                                            {display.view !== value ? (
                                                <Kbd>V</Kbd>
                                            ) : null}
                                        </TooltipContent>
                                    </Tooltip>
                                ),
                            )}
                        </div>
                        <Button
                            size="xs"
                            data-test="new-project-button"
                            onClick={() => openDialog(null)}
                        >
                            <Plus />
                            New project
                        </Button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 scroll-fade-ends overflow-auto">
                    {projects.length === 0 ? (
                        <div className="flex w-full items-center justify-center px-4 py-10 sm:py-16">
                            <div className="w-full max-w-sm border bg-card p-10">
                                <Empty className="gap-5 p-0">
                                    <EmptyHeader className="gap-4">
                                        <EmptyMedia
                                            variant="icon"
                                            className="mb-0 size-11"
                                        >
                                            <FolderOpen />
                                        </EmptyMedia>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <EmptyTitle>
                                                No projects yet
                                            </EmptyTitle>
                                            <EmptyDescription>
                                                A project gives its issues a
                                                key, like DD-1. Create one to
                                                start tracking work.
                                            </EmptyDescription>
                                        </div>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <Button
                                            onClick={() => openDialog(null)}
                                        >
                                            <Plus />
                                            New project
                                        </Button>
                                    </EmptyContent>
                                </Empty>
                            </div>
                        </div>
                    ) : visible.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Inbox />
                                </EmptyMedia>
                                <EmptyTitle>
                                    No{' '}
                                    {filter === 'all'
                                        ? ''
                                        : projectStatusLabel(
                                              filter,
                                          ).toLowerCase()}{' '}
                                    projects
                                </EmptyTitle>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setFilter('all')}
                                >
                                    Show all projects
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : display.view === 'cards' ? (
                        <ProjectCards
                            projects={visible}
                            actions={actions}
                            onCreate={
                                filter === 'all' ? () => openDialog(null) : null
                            }
                        />
                    ) : display.view === 'groups' ? (
                        <ProjectGroups
                            projects={visible}
                            actions={actions}
                            collapsed={display.collapsedStatuses}
                            onToggle={(status) =>
                                updateDisplay({
                                    collapsedStatuses: toggled(
                                        display.collapsedStatuses,
                                        status,
                                    ),
                                })
                            }
                            onCreate={(status) => openDialog(null, { status })}
                        />
                    ) : (
                        <ProjectTable projects={visible} actions={actions} />
                    )}
                </div>
            </div>

            <ProjectDialog
                key={dialog.session}
                project={dialog.project}
                defaults={dialog.defaults}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
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
