import { Head, Link, router, usePage } from '@inertiajs/react';
import { FolderKanban, List, Plus, SquareKanban } from 'lucide-react';
import { useState } from 'react';
import { IssueBoard } from '@/components/issue-board';
import { IssueBoardDisplayMenu } from '@/components/issue-board-display-menu';
import { IssueList } from '@/components/issue-list';
import { IssuePeek } from '@/components/issue-peek';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/components/ui/empty';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { useIssueTracker } from '@/hooks/use-issue-tracker';
import { groupIssuesByStatus } from '@/lib/issues';
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

export default function IssuesIndex({ issues, filters, view, peek }: Props) {
    const page = usePage();
    const { openCreateIssue } = useIssueTracker();
    const team = page.props.currentTeam;
    const projects = page.props.workspace?.projects ?? [];
    const project = projects.find(({ key }) => key === filters.project);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

    const teamSlug = team?.slug ?? '';

    const urlFor = (
        changes: Partial<IssueFilters> & {
            view?: IssueView;
            peek?: string | null;
        },
    ): string => {
        const query = { ...filters, view, ...changes };

        return index.url(teamSlug, {
            query: {
                project: query.project,
                assignee: query.assignee,
                view: query.view === 'board' ? 'board' : null,
                peek: query.peek ?? null,
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

    const listOrder = groupIssuesByStatus(issues).flatMap(
        (group) => group.issues,
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
    ]);

    const title = project?.name ?? 'Issues';

    return (
        <>
            <Head title={title} />

            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                    <h1 className="mr-2 text-sm font-semibold">{title}</h1>

                    <div className="flex items-center gap-1">
                        <Button
                            size="xs"
                            variant={
                                filters.assignee === null
                                    ? 'secondary'
                                    : 'ghost'
                            }
                            nativeButton={false}
                            render={<Link href={urlFor({ assignee: null })} />}
                        >
                            All issues
                        </Button>
                        <Button
                            size="xs"
                            variant={
                                filters.assignee === 'me'
                                    ? 'secondary'
                                    : 'ghost'
                            }
                            nativeButton={false}
                            render={<Link href={urlFor({ assignee: 'me' })} />}
                        >
                            My issues
                        </Button>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    size="xs"
                                    variant="outline"
                                    data-test="project-filter"
                                />
                            }
                        >
                            <FolderKanban />
                            {project?.key ?? 'All projects'}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Project
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() =>
                                        router.visit(urlFor({ project: null }))
                                    }
                                >
                                    All projects
                                </DropdownMenuItem>
                                {projects.map((candidate) => (
                                    <DropdownMenuItem
                                        key={candidate.id}
                                        onClick={() =>
                                            router.visit(
                                                urlFor({
                                                    project: candidate.key,
                                                }),
                                            )
                                        }
                                    >
                                        <span className="w-9 shrink-0 text-[0.65rem] font-semibold text-muted-foreground">
                                            {candidate.key}
                                        </span>
                                        {candidate.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="ml-auto flex items-center gap-1">
                        {view === 'board' ? <IssueBoardDisplayMenu /> : null}
                        <div className="flex border">
                            <Button
                                size="icon-xs"
                                variant={
                                    view === 'list' ? 'secondary' : 'ghost'
                                }
                                aria-label="List view"
                                nativeButton={false}
                                render={
                                    <Link
                                        href={urlFor({ view: 'list' })}
                                        preserveScroll
                                    />
                                }
                            >
                                <List />
                            </Button>
                            <Button
                                size="icon-xs"
                                variant={
                                    view === 'board' ? 'secondary' : 'ghost'
                                }
                                aria-label="Board view"
                                nativeButton={false}
                                render={
                                    <Link
                                        href={urlFor({ view: 'board' })}
                                        preserveScroll
                                    />
                                }
                            >
                                <SquareKanban />
                            </Button>
                        </div>
                        <Button
                            size="xs"
                            data-test="new-issue-button"
                            disabled={projects.length === 0}
                            onClick={() =>
                                openCreateIssue({
                                    projectId: project?.id,
                                    assigneeId:
                                        filters.assignee === 'me'
                                            ? page.props.auth.user.id
                                            : undefined,
                                })
                            }
                        >
                            <Plus />
                            New issue
                        </Button>
                    </div>
                </div>

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
                ) : issues.length === 0 && view === 'list' ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>No issues here</EmptyTitle>
                            <EmptyDescription>
                                Press C anywhere to create an issue.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                onClick={() =>
                                    openCreateIssue({ projectId: project?.id })
                                }
                            >
                                <Plus />
                                New issue
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <div
                        className={cn(
                            'flex min-h-0 flex-1 flex-col',
                            view === 'list' && 'overflow-y-auto',
                        )}
                    >
                        {view === 'board' ? (
                            <IssueBoard
                                issues={issues}
                                projectId={project?.id}
                                openIssueId={peek?.issue.id ?? null}
                                onOpenIssue={(issue) =>
                                    showPeek(issue.identifier)
                                }
                            />
                        ) : (
                            <IssueList
                                issues={issues}
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
