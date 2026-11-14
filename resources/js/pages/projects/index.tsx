import { Head, router, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    FolderKanban,
    LayoutGrid,
    List,
    Plus,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { HeaderActions } from '@/components/header-actions';
import { FilterPanel } from '@/components/projects/filter-panel';
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { ProjectRow } from '@/components/projects/project-row';
import { SortMenu } from '@/components/projects/sort-menu';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Switch } from '@/components/ui/switch';
import { teamCrumb } from '@/lib/breadcrumbs';
import { activeFilterCount, filtersToQuery } from '@/lib/projects';
import { cn } from '@/lib/utils';
import { index } from '@/routes/projects';
import type { Project, ProjectFilters, ProjectHealth } from '@/types';

type Props = {
    projects: Project[];
    filters: ProjectFilters;
    counts: { active: number; archived: number; attention: number };
    canCreate: boolean;
};

const VIEW_COOKIE = 'projects_view';
const GROUPED_KEY = 'projects.grouped';

const GROUPS: {
    health: ProjectHealth;
    label: string;
    hint: string;
    dot: string;
}[] = [
    {
        health: 'attention',
        label: 'Needs attention',
        hint: 'Overdue tasks, or no progress for a week',
        dot: 'bg-red-500 ring-red-500/20',
    },
    {
        health: 'track',
        label: 'On track',
        hint: 'Moving along',
        dot: 'bg-green-500 ring-green-500/20',
    },
];

export default function ProjectsIndex({
    projects,
    filters,
    counts,
    canCreate,
}: Props) {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? '';
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(
        () => activeFilterCount(filters) > 0,
    );
    const [grouped, setGrouped] = useState(() => readGrouped());
    const [collapsed, setCollapsed] = useState<ProjectHealth[]>([]);

    const visible = useMemo(() => {
        const term = name.trim().toLowerCase();

        return term
            ? projects.filter((project) =>
                  project.name.toLowerCase().includes(term),
              )
            : projects;
    }, [projects, name]);

    const archivedTab = filters.status === 'archived';
    const narrowed = activeFilterCount(filters) > 0 || name.trim() !== '';
    const total = counts.active + counts.archived;

    const update = (changes: Partial<ProjectFilters>) => {
        const next = { ...filters, ...changes };

        if (changes.view) {
            document.cookie = `${VIEW_COOKIE}=${changes.view};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
        }

        router.get(index(teamSlug).url, filtersToQuery(next), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['projects', 'filters', 'counts'],
        });
    };

    useEffect(() => {
        try {
            localStorage.setItem(GROUPED_KEY, grouped ? '1' : '0');
        } catch {
            // Storage can be unavailable (private windows); grouping still works.
        }
    }, [grouped]);

    const resetFilters = () => {
        setName('');
        update({ health: null, colors: [] });
    };

    const summary = [
        `${counts.active} active ${counts.active === 1 ? 'board' : 'boards'}`,
        counts.attention > 0 ? `${counts.attention} need attention` : null,
        `${counts.archived} archived`,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <>
            <Head title="Projects" />

            {canCreate && (
                <HeaderActions>
                    <Button
                        onClick={() => setCreating(true)}
                        className="h-10 rounded-xl px-4 shadow-[0_8px_20px_-10px_var(--primary)]"
                    >
                        <Plus /> New project
                    </Button>
                </HeaderActions>
            )}

            <div className="flex flex-col gap-3.5">
                <section className="relative z-10 flex animate-rise flex-col gap-4 rounded-card bg-card p-5 [animation-delay:110ms] md:p-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-[28px] font-extrabold tracking-tight">
                                Projects
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {summary}
                            </p>
                        </div>
                        <SegmentedTabs
                            label="Status"
                            className="w-64"
                            value={filters.status}
                            onChange={(status) =>
                                update({
                                    status,
                                    health:
                                        status === 'archived'
                                            ? null
                                            : filters.health,
                                })
                            }
                            options={[
                                {
                                    value: 'active',
                                    label: 'Active',
                                    count: counts.active,
                                },
                                {
                                    value: 'archived',
                                    label: 'Archived',
                                    count: counts.archived,
                                },
                            ]}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <label className="flex min-h-10 flex-[1_1_15rem] items-center gap-2.5 rounded-xl border bg-muted px-3 text-muted-foreground transition-[border-color,box-shadow] focus-within:border-primary focus-within:bg-card focus-within:ring-3 focus-within:ring-primary/15">
                            <Search className="size-4" />
                            <input
                                type="search"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder="Filter by name"
                                aria-label="Filter projects by name"
                                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                            />
                        </label>
                        <button
                            type="button"
                            aria-expanded={filtersOpen}
                            aria-controls="project-filters"
                            onClick={() => setFiltersOpen((open) => !open)}
                            className={cn(
                                'flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40',
                                filtersOpen || activeFilterCount(filters) > 0
                                    ? 'bg-secondary'
                                    : 'bg-card',
                                activeFilterCount(filters) > 0 &&
                                    'border-primary/40',
                            )}
                        >
                            <SlidersHorizontal className="size-4" />
                            Filters
                            {activeFilterCount(filters) > 0 && (
                                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                                    {activeFilterCount(filters)}
                                </span>
                            )}
                        </button>
                        <SortMenu
                            value={filters.sort}
                            onChange={(sort) => update({ sort })}
                        />
                        <SegmentedTabs
                            label="View"
                            className="w-full sm:w-48"
                            value={filters.view}
                            onChange={(view) => update({ view })}
                            options={[
                                {
                                    value: 'grid',
                                    label: 'Grid',
                                    icon: LayoutGrid,
                                },
                                { value: 'list', label: 'List', icon: List },
                            ]}
                        />
                    </div>

                    <FilterPanel
                        open={filtersOpen}
                        filters={filters}
                        onChange={update}
                    />
                </section>

                {total === 0 ? (
                    <Empty className="animate-rise rounded-card bg-card [animation-delay:160ms]">
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
                    <Empty className="animate-rise rounded-card bg-card [animation-delay:160ms]">
                        <EmptyHeader>
                            <EmptyTitle>
                                {narrowed
                                    ? name.trim()
                                        ? `No projects match “${name.trim()}”`
                                        : 'No projects match these filters'
                                    : archivedTab
                                      ? 'Nothing archived'
                                      : 'No active projects'}
                            </EmptyTitle>
                            <EmptyDescription>
                                {narrowed
                                    ? 'Try another name, or loosen the filters.'
                                    : archivedTab
                                      ? 'Projects you archive wait here, read-only, until they are restored.'
                                      : 'Every project is archived.'}
                            </EmptyDescription>
                        </EmptyHeader>
                        {narrowed && (
                            <EmptyContent>
                                <Button
                                    variant="outline"
                                    onClick={resetFilters}
                                >
                                    Reset filters
                                </Button>
                            </EmptyContent>
                        )}
                    </Empty>
                ) : filters.view === 'grid' ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
                        {visible.map((project, position) => (
                            <ProjectCard
                                key={project.id}
                                teamSlug={teamSlug}
                                project={project}
                                index={position}
                            />
                        ))}
                        {canCreate && !archivedTab && !narrowed && (
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                className="group/new flex min-h-80 animate-rise flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-border text-muted-foreground transition-colors outline-none hover:border-primary hover:bg-card hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                                style={{
                                    animationDelay: `${120 + visible.length * 60}ms`,
                                }}
                            >
                                <span className="flex size-13 items-center justify-center rounded-2xl bg-secondary text-primary">
                                    <Plus className="size-5" />
                                </span>
                                <span className="font-display text-base font-extrabold text-foreground">
                                    New project
                                </span>
                                <span className="max-w-56 text-center text-[13px] leading-snug">
                                    Starts with To do, In progress and Done. You
                                    can change the lists later.
                                </span>
                            </button>
                        )}
                    </div>
                ) : (
                    <ListView
                        teamSlug={teamSlug}
                        projects={visible}
                        grouped={grouped && !archivedTab}
                        canGroup={!archivedTab}
                        onGroupedChange={setGrouped}
                        collapsed={collapsed}
                        onToggle={(health) =>
                            setCollapsed((current) =>
                                current.includes(health)
                                    ? current.filter((item) => item !== health)
                                    : [...current, health],
                            )
                        }
                        showNew={canCreate && !archivedTab && !narrowed}
                        onNew={() => setCreating(true)}
                    />
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

function ListView({
    teamSlug,
    projects,
    grouped,
    canGroup,
    onGroupedChange,
    collapsed,
    onToggle,
    showNew,
    onNew,
}: {
    teamSlug: string;
    projects: Project[];
    grouped: boolean;
    canGroup: boolean;
    onGroupedChange: (grouped: boolean) => void;
    collapsed: ProjectHealth[];
    onToggle: (health: ProjectHealth) => void;
    showNew: boolean;
    onNew: () => void;
}) {
    let position = 0;

    return (
        <div className="flex flex-col gap-3">
            {canGroup && (
                <label className="flex animate-rise items-center gap-2.5 self-start px-1 text-sm font-semibold [animation-delay:150ms]">
                    <Switch
                        checked={grouped}
                        onCheckedChange={onGroupedChange}
                    />
                    Group by health
                </label>
            )}

            {grouped ? (
                GROUPS.map((group, groupIndex) => {
                    const items = projects.filter(
                        (project) => project.stats.health === group.health,
                    );
                    const open = !collapsed.includes(group.health);

                    if (items.length === 0) {
                        return null;
                    }

                    return (
                        <section
                            key={group.health}
                            aria-labelledby={`group-${group.health}`}
                            className={cn(
                                'animate-rise rounded-card border bg-card',
                                group.health === 'attention'
                                    ? 'border-red-500/15'
                                    : 'border-transparent',
                            )}
                            style={{
                                animationDelay: `${170 + groupIndex * 90}ms`,
                            }}
                        >
                            <h2 id={`group-${group.health}`}>
                                <button
                                    type="button"
                                    aria-expanded={open}
                                    onClick={() => onToggle(group.health)}
                                    className="flex min-h-14 w-full items-center gap-3 rounded-card px-5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <ChevronRight
                                        className={cn(
                                            'size-4 transition-transform duration-350 ease-slide',
                                            open && 'rotate-90',
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            'size-2.5 rounded-full ring-4',
                                            group.dot,
                                        )}
                                    />
                                    <span className="font-display text-base font-extrabold">
                                        {group.label}
                                    </span>
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                                        {items.length}
                                    </span>
                                    <span className="ml-auto hidden font-sans text-sm font-normal text-muted-foreground sm:inline">
                                        {group.hint}
                                    </span>
                                </button>
                            </h2>
                            <div
                                className={cn(
                                    'grid transition-[grid-template-rows,opacity] duration-450 ease-slide',
                                    open
                                        ? 'grid-rows-[1fr] opacity-100'
                                        : 'grid-rows-[0fr] opacity-0',
                                )}
                                inert={!open}
                            >
                                <div className="min-h-0 overflow-hidden">
                                    <ul className="flex flex-col gap-1.5 px-2.5 pb-2.5">
                                        {items.map((project) => (
                                            <ProjectRow
                                                key={project.id}
                                                teamSlug={teamSlug}
                                                project={project}
                                                index={position++}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </section>
                    );
                })
            ) : (
                <section className="animate-rise rounded-card bg-card p-2.5 [animation-delay:170ms]">
                    <ul className="flex flex-col gap-1.5">
                        {projects.map((project, rowIndex) => (
                            <ProjectRow
                                key={project.id}
                                teamSlug={teamSlug}
                                project={project}
                                index={rowIndex}
                            />
                        ))}
                    </ul>
                </section>
            )}

            {showNew && (
                <button
                    type="button"
                    onClick={onNew}
                    className="flex min-h-14 animate-rise items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors outline-none hover:border-primary hover:bg-card hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Plus className="size-4" /> New project
                </button>
            )}
        </div>
    );
}

function readGrouped(): boolean {
    try {
        return localStorage.getItem(GROUPED_KEY) !== '0';
    } catch {
        return true;
    }
}

ProjectsIndex.layout = (props: {
    currentTeam?: { name: string; slug: string } | null;
}) => ({
    breadcrumbs: [
        ...teamCrumb(props.currentTeam),
        {
            title: 'Projects',
            href: props.currentTeam ? index(props.currentTeam.slug) : '/',
        },
    ],
});
