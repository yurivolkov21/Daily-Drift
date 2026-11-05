import { Head, usePage } from '@inertiajs/react';
import { Archive, FolderKanban, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { index } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    projects: Project[];
    canCreate: boolean;
};

export default function ProjectsIndex({ projects, canCreate }: Props) {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? '';
    const [tab, setTab] = useState<'active' | 'archived'>('active');
    const [filter, setFilter] = useState('');
    const [creating, setCreating] = useState(false);

    const active = projects.filter((project) => !project.archivedAt);
    const archived = projects.filter((project) => project.archivedAt);
    const visible = useMemo(() => {
        const term = filter.trim().toLowerCase();
        const list = tab === 'active' ? active : archived;

        return term
            ? list.filter((project) =>
                  project.name.toLowerCase().includes(term),
              )
            : list;
    }, [active, archived, filter, tab]);

    return (
        <>
            <Head title="Projects" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Projects
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {active.length} active{' '}
                            {active.length === 1 ? 'board' : 'boards'} in{' '}
                            {currentTeam?.name}
                        </p>
                    </div>
                    {canCreate && (
                        <Button onClick={() => setCreating(true)}>
                            <Plus /> New project
                        </Button>
                    )}
                </div>

                {projects.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Tabs
                            value={tab}
                            onValueChange={(value) =>
                                setTab(value as typeof tab)
                            }
                        >
                            <TabsList>
                                <TabsTrigger value="active">
                                    Active
                                    <Badge variant="secondary" className="ml-1">
                                        {active.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="archived">
                                    Archived
                                    <Badge variant="secondary" className="ml-1">
                                        {archived.length}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="relative w-full sm:w-64">
                            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                value={filter}
                                onChange={(event) =>
                                    setFilter(event.target.value)
                                }
                                placeholder="Find a project"
                                aria-label="Find a project"
                                className="pl-8"
                            />
                        </div>
                    </div>
                )}

                {projects.length === 0 ? (
                    <Empty className="flex-1 border border-dashed">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <FolderKanban />
                            </EmptyMedia>
                            <EmptyTitle>No projects yet</EmptyTitle>
                            <EmptyDescription>
                                {canCreate
                                    ? 'Create a board for your team. It starts with To do, In progress and Done.'
                                    : 'An owner or admin of this team can create the first project.'}
                            </EmptyDescription>
                        </EmptyHeader>
                        {canCreate && (
                            <EmptyContent>
                                <Button onClick={() => setCreating(true)}>
                                    <Plus /> New project
                                </Button>
                            </EmptyContent>
                        )}
                    </Empty>
                ) : visible.length === 0 ? (
                    <Empty className="border border-dashed">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                {filter ? <Search /> : <Archive />}
                            </EmptyMedia>
                            <EmptyTitle>
                                {filter
                                    ? 'No matching projects'
                                    : 'Nothing archived'}
                            </EmptyTitle>
                            <EmptyDescription>
                                {filter
                                    ? 'Try another name.'
                                    : 'Archived projects stay read-only here until they are restored.'}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {visible.map((project) => (
                            <ProjectCard
                                key={project.id}
                                teamSlug={teamSlug}
                                project={project}
                            />
                        ))}
                        {canCreate && tab === 'active' && !filter && (
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors outline-none hover:border-ring/50 hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                                    <Plus className="size-5" />
                                </span>
                                <span className="font-medium">New project</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {canCreate && (
                <ProjectDialog
                    teamSlug={teamSlug}
                    open={creating}
                    onOpenChange={setCreating}
                />
            )}
        </>
    );
}

ProjectsIndex.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Projects',
            href: props.currentTeam ? index(props.currentTeam.slug) : '/',
        },
    ],
});
