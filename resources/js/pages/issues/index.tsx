import { Head, Link, router, usePage } from '@inertiajs/react';
import { FolderKanban, List, Plus, SquareKanban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { IssueBoard } from '@/components/issue-board';
import { IssueBoardDisplayMenu } from '@/components/issue-board-display-menu';
import { IssueFilterChips } from '@/components/issue-filter-chips';
import { IssueFilterMenu } from '@/components/issue-filter-menu';
import { IssueList } from '@/components/issue-list';
import { IssueListDisplayMenu } from '@/components/issue-list-display-menu';
import { IssuePeek } from '@/components/issue-peek';
import { ProjectGlyph } from '@/components/project-icon';
import { SelectMenu } from '@/components/select-menu';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/components/ui/empty';
import { Kbd } from '@/components/ui/kbd';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { useIssueTracker } from '@/hooks/use-issue-tracker';
import { useListDisplay } from '@/hooks/use-list-display';
import {
    activeDoneFilter,
    activeDueFilter,
    activeFilterProperties,
    applyDateFilters,
    clearedFilters,
    isMyIssuesScope,
    issueFilterQuery,
} from '@/lib/issue-filters';
import type { FilterPropertyKey } from '@/lib/issue-filters';
import { arrangeIssueList, isGroupCollapsed } from '@/lib/issue-list';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/issues';
import { index as projectsIndex } from '@/routes/projects';
import type {
    Issue,
    IssueFilters,
    IssuePeek as IssuePeekData,
    IssueView,
} from '@/types';

type Props = {
    issues: Issue[];
    filters: IssueFilters;
    view: IssueView;
    peek: IssuePeekData | null;
};

const viewOptions: { value: IssueView; label: string; icon: LucideIcon }[] = [
    { value: 'list', label: 'List view', icon: List },
    { value: 'board', label: 'Board view', icon: SquareKanban },
];

/**
 * A thin rule parting the toolbar's groups.
 */
function ToolbarRule() {
    return <div aria-hidden="true" className="h-4 w-px bg-border" />;
}

export default function IssuesIndex({ issues, filters, view, peek }: Props) {
    const page = usePage();
    const { openCreateIssue } = useIssueTracker();
    const team = page.props.currentTeam;
    const projects = page.props.workspace?.projects ?? [];
    const project = projects.find(({ key }) => key === filters.project);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
    const [filterMenu, setFilterMenu] = useState<{
        open: boolean;
        at: FilterPropertyKey | null;
    }>({ open: false, at: null });

    const teamSlug = team?.slug ?? '';

    const urlFor = (
        changes: Partial<IssueFilters> & {
            view?: IssueView;
            peek?: string | null;
        },
    ): string => {
        const {
            view: nextView = view,
            peek = null,
            ...filterChanges
        } = changes;

        return index.url(teamSlug, {
            query: {
                ...issueFilterQuery({ ...filters, ...filterChanges }),
                view: nextView === 'board' ? 'board' : null,
                peek,
            },
        });
    };

    /**
     * Open or close the board's quick view, keeping it in the URL.
     */
    const showPeek = (identifier: string | null) =>
        router.get(
            urlFor({ peek: identifier }),
            {},
            {
                only: ['peek'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );

    // The server sends a day to spare around each date filter; the reader's
    // own day decides.
    const shownIssues = applyDateFilters(issues, filters);
    const activeFilters = activeFilterProperties(filters);
    const dateFilter = activeDueFilter(filters) ?? activeDoneFilter(filters);
    const scope =
        filters.assignee.length === 0
            ? 'all'
            : isMyIssuesScope(filters)
              ? 'me'
              : null;

    const [listDisplay] = useListDisplay();
    const listGroups = arrangeIssueList(shownIssues, listDisplay, projects);
    const listOrder = listGroups.flatMap((group) =>
        isGroupCollapsed(group, listGroups, listDisplay) ? [] : group.issues,
    );

    const moveSelection = (offset: number) => {
        if (view !== 'list' || listOrder.length === 0) {
            return;
        }

        const currentIndex = listOrder.findIndex(
            ({ id }) => id === selectedIssueId,
        );
        const nextIndex = Math.min(
            Math.max(currentIndex === -1 ? 0 : currentIndex + offset, 0),
            listOrder.length - 1,
        );
        const nextIssue = listOrder[nextIndex];

        setSelectedIssueId(nextIssue.id);
        document
            .querySelector(`[data-issue-id="${nextIssue.id}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    };

    useHotkeys([
        { keys: 'j', handler: () => moveSelection(1) },
        { keys: 'k', handler: () => moveSelection(-1) },
        {
            keys: 'enter',
            handler: () => {
                const issue = listOrder.find(
                    ({ id }) => id === selectedIssueId,
                );

                if (issue) {
                    router.visit(show.url([teamSlug, issue.identifier]));
                }
            },
        },
        {
            keys: 'v',
            handler: () =>
                router.visit(
                    urlFor({ view: view === 'list' ? 'board' : 'list' }),
                    { preserveScroll: true },
                ),
        },
        {
            keys: 'f',
            handler: () => setFilterMenu({ open: true, at: null }),
        },
    ]);

    const title = project?.name ?? 'Issues';

    // A lone date filter explains itself; any other mix gets one message.
    const empty =
        activeFilters.length === 1 && dateFilter !== null
            ? dateFilter.empty
            : activeFilters.length > 0
              ? {
                    title: 'No issues match these filters',
                    description: 'Drop one of the filters to see more.',
                }
              : {
                    title: 'No issues here',
                    description: 'Press C anywhere to create an issue.',
                };

    return (
        <>
            <Head title={title} />

            <div className="flex min-h-0 flex-1 flex-col">
                {/*
                 * Four groups, left to right: the scope, the filters, how the
                 * issues are shown, and the way to add one.
                 */}
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                    <h1 className="mr-2 text-sm font-semibold">{title}</h1>

                    <div
                        role="group"
                        aria-label="Scope"
                        className="flex border"
                    >
                        <Button
                            size="xs"
                            variant={scope === 'all' ? 'secondary' : 'ghost'}
                            nativeButton={false}
                            render={<Link href={urlFor({ assignee: [] })} />}
                        >
                            All issues
                        </Button>
                        <Button
                            size="xs"
                            variant={scope === 'me' ? 'secondary' : 'ghost'}
                            nativeButton={false}
                            render={
                                <Link href={urlFor({ assignee: ['me'] })} />
                            }
                        >
                            My issues
                        </Button>
                    </div>

                    <ToolbarRule />

                    <div
                        role="group"
                        aria-label="Filters"
                        className="flex items-center gap-1"
                    >
                        <SelectMenu
                            size="sm"
                            label="Project"
                            data-test="project-filter"
                            icon={<FolderKanban />}
                            options={[
                                { value: '', label: 'All projects' },
                                ...projects.map((candidate) => ({
                                    value: candidate.key,
                                    label: candidate.name,
                                    icon: <ProjectGlyph project={candidate} />,
                                })),
                            ]}
                            value={project?.key ?? ''}
                            onChange={(key) =>
                                router.visit(urlFor({ project: key || null }))
                            }
                        />
                        <IssueFilterMenu
                            filters={filters}
                            open={filterMenu.open}
                            openAt={filterMenu.at}
                            onOpenChange={(open) =>
                                setFilterMenu({
                                    open,
                                    at: open ? filterMenu.at : null,
                                })
                            }
                            onChange={(changes) =>
                                router.visit(urlFor(changes), {
                                    preserveState: true,
                                    preserveScroll: true,
                                })
                            }
                        />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <div
                            role="group"
                            aria-label="View"
                            className="flex items-center gap-1"
                        >
                            {view === 'board' ? (
                                <IssueBoardDisplayMenu />
                            ) : (
                                <IssueListDisplayMenu />
                            )}
                            <div className="flex border">
                                {viewOptions.map(
                                    ({ value, label, icon: ViewIcon }) => (
                                        <Tooltip key={value}>
                                            <TooltipTrigger
                                                render={
                                                    <Button
                                                        size="icon-xs"
                                                        variant={
                                                            view === value
                                                                ? 'secondary'
                                                                : 'ghost'
                                                        }
                                                        aria-label={label}
                                                        nativeButton={false}
                                                        render={
                                                            <Link
                                                                href={urlFor({
                                                                    view: value,
                                                                })}
                                                                preserveScroll
                                                            />
                                                        }
                                                    />
                                                }
                                            >
                                                <ViewIcon />
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                                {label}
                                                {view !== value ? (
                                                    <Kbd>V</Kbd>
                                                ) : null}
                                            </TooltipContent>
                                        </Tooltip>
                                    ),
                                )}
                            </div>
                        </div>

                        <ToolbarRule />

                        <Button
                            size="xs"
                            data-test="new-issue-button"
                            disabled={projects.length === 0}
                            onClick={() =>
                                openCreateIssue({
                                    projectId: project?.id,
                                    assigneeId: isMyIssuesScope(filters)
                                        ? page.props.auth.user.id
                                        : undefined,
                                    status:
                                        filters.status.length === 1
                                            ? filters.status[0]
                                            : undefined,
                                })
                            }
                        >
                            <Plus />
                            New issue
                        </Button>
                    </div>
                </div>

                <IssueFilterChips
                    filters={filters}
                    hrefFor={urlFor}
                    onEdit={(property) =>
                        setFilterMenu({ open: true, at: property })
                    }
                />

                {projects.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>Start with a project</EmptyTitle>
                            <EmptyDescription>
                                Issues live in projects. A project key such as
                                DD becomes the prefix of every issue, like DD-1.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                nativeButton={false}
                                render={<Link href={projectsIndex(teamSlug)} />}
                            >
                                Create a project
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : shownIssues.length === 0 && view === 'list' ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>{empty.title}</EmptyTitle>
                            <EmptyDescription>
                                {empty.description}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            {activeFilters.length > 0 ? (
                                <Button
                                    variant="outline"
                                    nativeButton={false}
                                    render={
                                        <Link
                                            href={urlFor(
                                                clearedFilters(filters),
                                            )}
                                        />
                                    }
                                >
                                    {activeFilters.length > 1
                                        ? 'Clear filters'
                                        : 'Clear filter'}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() =>
                                        openCreateIssue({
                                            projectId: project?.id,
                                        })
                                    }
                                >
                                    <Plus />
                                    New issue
                                </Button>
                            )}
                        </EmptyContent>
                    </Empty>
                ) : (
                    <div
                        className={cn(
                            'flex min-h-0 flex-1 flex-col',
                            view === 'list' && 'scroll-fade-ends overflow-auto',
                        )}
                    >
                        {view === 'board' ? (
                            <IssueBoard
                                issues={shownIssues}
                                projectId={project?.id}
                                openIssueId={peek?.issue.id ?? null}
                                onOpenIssue={(issue) =>
                                    showPeek(issue.identifier)
                                }
                            />
                        ) : (
                            <IssueList
                                groups={listGroups}
                                teamSlug={teamSlug}
                                projectId={project?.id}
                                selectedIssueId={selectedIssueId}
                            />
                        )}
                    </div>
                )}
            </div>

            <IssuePeek
                peek={peek}
                teamSlug={teamSlug}
                onClose={() => showPeek(null)}
            />
        </>
    );
}

IssuesIndex.layout = (props: {
    currentTeam?: { slug: string } | null;
    filters: IssueFilters;
}) => ({
    breadcrumbs: [
        {
            title: 'Issues',
            href: index(props.currentTeam?.slug ?? ''),
        },
    ],
});
