import { usePage } from '@inertiajs/react';
import { ArrowLeftToLine, ChevronRight, Plus, UserRound } from 'lucide-react';
import { Fragment, useState } from 'react';
import { IssueBoardCard } from '@/components/issue-board-card';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { MemberAvatar } from '@/components/member-avatar';
import {
    Kanban,
    KanbanBoard,
    KanbanColumn,
    KanbanColumnContent,
    KanbanItem,
    KanbanOverlay,
} from '@/components/ui/kanban';
import type { KanbanCommitMeta } from '@/components/ui/kanban';
import { Progress } from '@/components/ui/progress';
import { toggled, useBoardDisplay } from '@/hooks/use-board-display';
import type { BoardDisplay, BoardLanes } from '@/hooks/use-board-display';
import { useIssueTracker } from '@/hooks/use-issue-tracker';
import { useUpdateIssue } from '@/hooks/use-update-issue';
import type { IssueChanges } from '@/hooks/use-update-issue';
import { issueStatuses } from '@/lib/issues';
import { cn } from '@/lib/utils';
import type { Issue, IssueStatus, Project, WorkspaceMember } from '@/types';

type Props = {
    issues: Issue[];
    projectId?: string;
    openIssueId?: string | null;
    onOpenIssue: (issue: Issue) => void;
};

type Lane = {
    key: string;
    title: string;
    projectKey?: string;
    personName?: string;
    projectId?: string;
    assigneeId?: number | null;
};

type Columns = Record<string, Issue[]>;

const cellSeparator = '|';

/**
 * The id of a board cell: a status column, or one lane's part of it.
 */
function cellId(status: IssueStatus, lane: string | null): string {
    return lane === null ? status : `${status}${cellSeparator}${lane}`;
}

function parseCell(id: string): { status: IssueStatus; lane: string | null } {
    const [status, lane] = id.split(cellSeparator);

    return { status: status as IssueStatus, lane: lane ?? null };
}

function laneKeyOf(issue: Issue, lanes: BoardLanes): string | null {
    if (lanes === 'project') {
        return issue.projectId;
    }

    if (lanes === 'assignee') {
        return issue.assignee ? String(issue.assignee.id) : 'none';
    }

    return null;
}

function lanesFor(
    lanes: BoardLanes,
    projects: Project[],
    members: WorkspaceMember[],
    projectId?: string,
): Lane[] {
    if (lanes === 'project') {
        return projects
            .filter(({ id }) => projectId === undefined || id === projectId)
            .map((project) => ({
                key: project.id,
                title: project.name,
                projectKey: project.key,
                projectId: project.id,
            }));
    }

    if (lanes === 'assignee') {
        return [
            ...members.map((member) => ({
                key: String(member.id),
                title: member.name,
                personName: member.name,
                assigneeId: member.id,
            })),
            { key: 'none', title: 'Unassigned', assigneeId: null },
        ];
    }

    return [];
}

/**
 * Sort the issues into cells, each in its saved board order.
 */
function buildColumns(
    issues: Issue[],
    lanes: BoardLanes,
    laneList: Lane[],
): Columns {
    const columns: Columns = {};

    for (const { value: status } of issueStatuses) {
        if (lanes === 'none') {
            columns[cellId(status, null)] = [];
        }

        for (const lane of laneList) {
            columns[cellId(status, lane.key)] = [];
        }
    }

    const ordered = [...issues].sort(
        (a, b) =>
            (a.boardPosition ?? Number.MAX_SAFE_INTEGER) -
            (b.boardPosition ?? Number.MAX_SAFE_INTEGER),
    );

    for (const issue of ordered) {
        const cell =
            columns[cellId(issue.status, laneKeyOf(issue, lanes))] ??
            columns[cellId(issue.status, 'none')];

        cell?.push(issue);
    }

    return columns;
}

/**
 * A board position between the dropped card's new neighbours.
 */
function positionBetween(before?: Issue, after?: Issue): number {
    const low = before?.boardPosition ?? null;
    const high = after?.boardPosition ?? null;

    if (low !== null && high !== null) {
        return (low + high) / 2;
    }

    if (low !== null) {
        return low + 1;
    }

    return high !== null ? high - 1 : 0;
}

function BoardCard({
    issue,
    display,
    isOpen,
    onOpen,
}: {
    issue: Issue;
    display: BoardDisplay;
    isOpen: boolean;
    onOpen: (issue: Issue) => void;
}) {
    return (
        <KanbanItem
            value={issue.id}
            asHandle
            aria-label={`${issue.identifier}: ${issue.title}`}
            onClick={() => onOpen(issue)}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    onOpen(issue);
                }
            }}
            className={cn(
                'group/card outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                isOpen && 'ring-1 ring-primary',
            )}
        >
            <IssueBoardCard issue={issue} display={display} />
        </KanbanItem>
    );
}

function LaneHeader({
    lane,
    issues,
    isCollapsed,
    onToggle,
}: {
    lane: Lane;
    issues: Issue[];
    isCollapsed: boolean;
    onToggle: () => void;
}) {
    const open = issues.filter(({ status }) => status !== 'canceled');
    const done = open.filter(({ status }) => status === 'done').length;

    return (
        <button
            type="button"
            aria-expanded={!isCollapsed}
            onClick={onToggle}
            className="col-span-full mt-3 flex h-9 items-center text-left text-xs font-semibold"
        >
            <span className="sticky left-4 flex items-center gap-2.5">
                <ChevronRight
                    className={cn(
                        'size-3.5 transition-transform',
                        !isCollapsed && 'rotate-90',
                    )}
                />
                {lane.projectKey ? (
                    <span className="border px-1.5 text-[0.7rem] font-medium text-muted-foreground">
                        {lane.projectKey}
                    </span>
                ) : lane.personName ? (
                    <MemberAvatar name={lane.personName} />
                ) : (
                    <UserRound className="size-4 text-muted-foreground" />
                )}
                {lane.title}
                <span className="font-normal text-muted-foreground tabular-nums">
                    {issues.length}
                </span>
                {open.length > 0 ? (
                    <span className="flex w-44 items-center gap-2 font-normal">
                        <Progress
                            value={(done / open.length) * 100}
                            aria-label={`${done} of ${open.length} issues done`}
                            className="flex-1 gap-0 [&_[data-slot=progress-track]]:h-1"
                        />
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                            {done}/{open.length} done
                        </span>
                    </span>
                ) : null}
            </span>
        </button>
    );
}

/**
 * The issues board: a column per status, optionally split into swimlanes,
 * with cards that drag between columns and keep their order.
 */
export function IssueBoard({
    issues,
    projectId,
    openIssueId,
    onOpenIssue,
}: Props) {
    const workspace = usePage().props.workspace;
    const [display, updateDisplay] = useBoardDisplay();
    const updateIssue = useUpdateIssue();
    const { openCreateIssue } = useIssueTracker();
    const [preview, setPreview] = useState<Columns | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [blockedCell, setBlockedCell] = useState<string | null>(null);

    const lanes = lanesFor(
        display.lanes,
        workspace?.projects ?? [],
        workspace?.members ?? [],
        projectId,
    );
    const columns = preview ?? buildColumns(issues, display.lanes, lanes);
    const issuesById = new Map(issues.map((issue) => [issue.id, issue]));
    const columnWidth = display.density === 'detailed' ? '20rem' : '18rem';
    const isCollapsed = (status: IssueStatus) =>
        display.collapsedStatuses.includes(status);

    const toggleStatus = (status: IssueStatus) =>
        updateDisplay({
            collapsedStatuses: toggled(display.collapsedStatuses, status),
        });

    const endDrag = () => {
        setPreview(null);
        setActiveId(null);
        setBlockedCell(null);
    };

    const previewMove = (next: Columns) => {
        const issue = activeId ? issuesById.get(activeId) : undefined;

        if (issue && display.lanes === 'project') {
            const cell = Object.keys(next).find((key) =>
                next[key].some(({ id }) => id === issue.id),
            );

            // A card cannot change project: that would change its identifier.
            if (cell && parseCell(cell).lane !== issue.projectId) {
                setBlockedCell(cell);

                return;
            }
        }

        setBlockedCell(null);
        setPreview(next);
    };

    const commitMove = (value: Columns, meta: KanbanCommitMeta<Issue>) => {
        const cards = value[meta.overContainer] ?? [];
        const issue = cards[meta.overIndex];

        if (meta.kind !== 'item' || !issue) {
            return;
        }

        const { status, lane } = parseCell(meta.overContainer);
        const changes: IssueChanges = {
            board_position: positionBetween(
                cards[meta.overIndex - 1],
                cards[meta.overIndex + 1],
            ),
        };

        if (status !== issue.status) {
            changes.status = status;
        }

        if (display.lanes === 'assignee' && lane !== null) {
            const assigneeId = lane === 'none' ? null : Number(lane);

            if (assigneeId !== (issue.assignee?.id ?? null)) {
                changes.assignee_id = assigneeId;
            }
        }

        updateIssue(issue, changes);
    };

    const card = (issue: Issue) => (
        <BoardCard
            key={issue.id}
            issue={issue}
            display={display}
            isOpen={issue.id === openIssueId}
            onOpen={onOpenIssue}
        />
    );

    const collapseButton = (status: IssueStatus, label: string) => (
        <button
            type="button"
            aria-label={`Collapse the ${label} column`}
            className="ml-auto flex size-6 items-center justify-center hover:bg-background"
            onClick={() => toggleStatus(status)}
        >
            <ArrowLeftToLine className="size-3.5" />
        </button>
    );

    const statusColumn = (status: IssueStatus, label: string) => {
        const cell = cellId(status, null);
        const cards = columns[cell] ?? [];

        if (isCollapsed(status)) {
            return (
                <KanbanColumn
                    key={cell}
                    value={cell}
                    render={<button type="button" />}
                    aria-label={`Show the ${label} column`}
                    onClick={() => toggleStatus(status)}
                    className="flex w-10 shrink-0 flex-col items-center gap-2 bg-muted/40 py-3 text-xs hover:bg-muted"
                >
                    <IssueStatusIcon status={status} />
                    <span className="text-muted-foreground tabular-nums">
                        {cards.length}
                    </span>
                    <span className="font-semibold [writing-mode:vertical-rl]">
                        {label}
                    </span>
                </KanbanColumn>
            );
        }

        return (
            <KanbanColumn
                key={cell}
                value={cell}
                aria-label={label}
                style={{ width: columnWidth }}
                className="flex max-h-[calc(100svh-11rem)] shrink-0 flex-col bg-muted/40"
            >
                <header className="flex h-10 shrink-0 items-center gap-2 px-3 text-xs font-semibold">
                    <IssueStatusIcon status={status} />
                    {label}
                    <span className="font-normal text-muted-foreground">
                        {cards.length}
                    </span>
                    <button
                        type="button"
                        aria-label={`Create a ${label} issue`}
                        className="ml-auto flex size-6 items-center justify-center hover:bg-background"
                        onClick={() => openCreateIssue({ status, projectId })}
                    >
                        <Plus className="size-3.5" />
                    </button>
                    {collapseButton(status, label)}
                </header>
                <KanbanColumnContent
                    value={cell}
                    className="flex min-h-12 flex-col gap-2 overflow-y-auto px-2 pb-2"
                >
                    {cards.map(card)}
                </KanbanColumnContent>
            </KanbanColumn>
        );
    };

    const laneColumnHeader = (status: IssueStatus, label: string) => {
        const total = lanes.reduce(
            (count, lane) =>
                count + (columns[cellId(status, lane.key)]?.length ?? 0),
            0,
        );

        if (isCollapsed(status)) {
            return (
                <button
                    key={`head-${status}`}
                    type="button"
                    title={label}
                    aria-label={`Show the ${label} column`}
                    onClick={() => toggleStatus(status)}
                    className="sticky top-0 z-10 flex h-10 items-center justify-center gap-1 border-b bg-background text-xs text-muted-foreground hover:bg-muted"
                >
                    <IssueStatusIcon status={status} />
                    <span className="tabular-nums">{total}</span>
                </button>
            );
        }

        return (
            <div
                key={`head-${status}`}
                className="sticky top-0 z-10 flex h-10 items-center gap-2 border-b bg-background px-2 text-xs font-semibold"
            >
                <IssueStatusIcon status={status} />
                {label}
                <span className="font-normal text-muted-foreground">
                    {total}
                </span>
                {collapseButton(status, label)}
            </div>
        );
    };

    const laneCell = (lane: Lane, status: IssueStatus, label: string) => {
        const cell = cellId(status, lane.key);
        const cards = columns[cell] ?? [];

        if (isCollapsed(status)) {
            return (
                <KanbanColumn
                    key={cell}
                    value={cell}
                    title={`${lane.title}, ${label}`}
                    className="flex min-h-16 items-start justify-center bg-muted/40 py-2 text-xs text-muted-foreground tabular-nums"
                >
                    {cards.length > 0 ? cards.length : null}
                </KanbanColumn>
            );
        }

        return (
            <KanbanColumn
                key={cell}
                value={cell}
                aria-label={`${lane.title}, ${label}`}
                data-blocked={blockedCell === cell || undefined}
                className="group/cell flex min-h-16 flex-col gap-2 bg-muted/40 p-1.5 data-blocked:bg-destructive/10 data-blocked:outline data-blocked:outline-destructive/40 data-blocked:outline-dashed"
            >
                <KanbanColumnContent
                    value={cell}
                    className="flex flex-col gap-2"
                >
                    {cards.map(card)}
                </KanbanColumnContent>
                <button
                    type="button"
                    aria-label={`Create a ${label} issue in ${lane.title}`}
                    className="flex h-7 items-center gap-1.5 px-2 text-xs text-muted-foreground opacity-0 group-hover/cell:opacity-100 hover:bg-background hover:text-foreground focus-visible:opacity-100 pointer-coarse:opacity-100"
                    onClick={() =>
                        openCreateIssue({
                            status,
                            projectId: lane.projectId ?? projectId,
                            assigneeId: lane.assigneeId,
                        })
                    }
                >
                    <Plus className="size-3.5" />
                    Add
                </button>
            </KanbanColumn>
        );
    };

    return (
        <Kanban
            value={columns}
            onValueChange={previewMove}
            getItemValue={(issue: Issue) => issue.id}
            onValueCommit={commitMove}
            onDragStart={(event) => setActiveId(String(event.active.id))}
            onDragEnd={endDrag}
            onDragCancel={endDrag}
            restoreOnCancel
            className="flex min-h-0 flex-1 flex-col"
        >
            {display.lanes === 'none' ? (
                <KanbanBoard className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
                    {issueStatuses.map(({ value, label }) =>
                        statusColumn(value, label),
                    )}
                </KanbanBoard>
            ) : (
                <div className="min-h-0 flex-1 overflow-auto">
                    <KanbanBoard
                        className="grid w-max auto-rows-auto gap-x-2 gap-y-0 px-4 pb-4"
                        style={{
                            gridTemplateColumns: issueStatuses
                                .map(({ value }) =>
                                    isCollapsed(value)
                                        ? '2.75rem'
                                        : columnWidth,
                                )
                                .join(' '),
                        }}
                    >
                        {issueStatuses.map(({ value, label }) =>
                            laneColumnHeader(value, label),
                        )}
                        {lanes.map((lane) => {
                            const isLaneCollapsed =
                                display.collapsedLanes.includes(lane.key);

                            return (
                                <Fragment key={lane.key}>
                                    <LaneHeader
                                        lane={lane}
                                        issues={issues.filter(
                                            (issue) =>
                                                laneKeyOf(
                                                    issue,
                                                    display.lanes,
                                                ) === lane.key,
                                        )}
                                        isCollapsed={isLaneCollapsed}
                                        onToggle={() =>
                                            updateDisplay({
                                                collapsedLanes: toggled(
                                                    display.collapsedLanes,
                                                    lane.key,
                                                ),
                                            })
                                        }
                                    />
                                    {isLaneCollapsed
                                        ? null
                                        : issueStatuses.map(
                                              ({ value, label }) =>
                                                  laneCell(lane, value, label),
                                          )}
                                </Fragment>
                            );
                        })}
                    </KanbanBoard>
                </div>
            )}

            <KanbanOverlay>
                {({ value }) => {
                    const issue = issuesById.get(String(value));

                    return issue ? (
                        <IssueBoardCard
                            issue={issue}
                            display={display}
                            className="rotate-1 shadow-lg"
                        />
                    ) : null;
                }}
            </KanbanOverlay>
        </Kanban>
    );
}
