import { Link } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    MessageSquare,
    Plus,
    UserRound,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Fragment, useState } from 'react';
import { IssueLabelChips } from '@/components/issue-label-chips';
import {
    IssueAssigneePicker,
    IssuePriorityPicker,
    IssueStatusPicker,
} from '@/components/issue-pickers';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { SubtaskChecklist } from '@/components/issue-subtasks';
import { MemberAvatar } from '@/components/member-avatar';
import { SubtaskProgress } from '@/components/subtask-progress';
import { useIssueTracker } from '@/hooks/use-issue-tracker';
import { useListDisplay } from '@/hooks/use-list-display';
import type { ListOrdering, ListProperty } from '@/hooks/use-list-display';
import { useUpdateIssue } from '@/hooks/use-update-issue';
import { toggled } from '@/lib/display-store';
import { isGroupCollapsed } from '@/lib/issue-list';
import type { IssueListGroup } from '@/lib/issue-list';
import {
    formatAge,
    formatDueDate,
    isOverdue,
    priorityLabel,
    statusLabel,
} from '@/lib/issues';
import { cn } from '@/lib/utils';
import { show } from '@/routes/issues';
import type { Issue } from '@/types';

type Props = {
    groups: IssueListGroup[];
    teamSlug: string;
    projectId?: string;
    selectedIssueId: string | null;
};

type ColumnKey = 'expand' | 'title' | 'status' | ListProperty;

type Column = {
    key: ColumnKey;
    label: string;
    width: number;
    ordering?: ListOrdering;
    ascending?: boolean;
    alignEnd?: boolean;
};

/**
 * Every column of the list in order, with its width in rem. The title takes
 * the spare room; below the total width the table scrolls sideways instead
 * of squeezing. An ascending column sorts from A to Z or soonest first.
 */
const allColumns: Column[] = [
    { key: 'expand', label: 'Sub-tasks', width: 1.5 },
    {
        key: 'identifier',
        label: 'ID',
        width: 4.5,
        ordering: 'identifier',
        ascending: true,
    },
    {
        key: 'title',
        label: 'Title',
        width: 14,
        ordering: 'title',
        ascending: true,
    },
    {
        key: 'status',
        label: 'Status',
        width: 7.5,
        ordering: 'status',
        ascending: true,
    },
    { key: 'priority', label: 'Priority', width: 6.5, ordering: 'priority' },
    {
        key: 'assignee',
        label: 'Assignee',
        width: 10,
        ordering: 'assignee',
        ascending: true,
    },
    { key: 'labels', label: 'Labels', width: 9 },
    {
        key: 'dueDate',
        label: 'Due',
        width: 4.5,
        ordering: 'dueDate',
        ascending: true,
        alignEnd: true,
    },
    { key: 'progress', label: 'Sub-tasks', width: 6.5, ordering: 'progress' },
    {
        key: 'comments',
        label: 'Comments',
        width: 3.5,
        ordering: 'comments',
        alignEnd: true,
    },
    {
        key: 'updated',
        label: 'Updated',
        width: 4.5,
        ordering: 'updated',
        alignEnd: true,
    },
];

const inlineControl =
    'relative z-10 flex size-6 shrink-0 items-center justify-center hover:bg-muted';

const cellControl =
    'relative z-10 -mx-1.5 flex h-7 max-w-full min-w-0 items-center gap-2 px-1.5 text-xs hover:bg-muted';

const emptyCell = <span className="text-xs text-muted-foreground">–</span>;

function GroupMark({ group }: { group: IssueListGroup }) {
    if (group.status) {
        return <IssueStatusIcon status={group.status} />;
    }

    if (group.priority !== undefined) {
        return <IssuePriorityIcon priority={group.priority} />;
    }

    if (group.project) {
        return (
            <span className="border px-1 text-[0.65rem] font-medium text-muted-foreground">
                {group.project.key}
            </span>
        );
    }

    if (group.assignee) {
        return <MemberAvatar name={group.assignee.name} />;
    }

    if (group.assignee === null) {
        return <UserRound className="size-3.5 text-muted-foreground" />;
    }

    return null;
}

/**
 * The issues as a table with sortable columns, grouped into collapsible
 * sections; a row opens into its sub-tasks, which can be ticked off in place.
 */
export function IssueList({
    groups,
    teamSlug,
    projectId,
    selectedIssueId,
}: Props) {
    const { openCreateIssue } = useIssueTracker();
    const updateIssue = useUpdateIssue();
    const [display, updateDisplay] = useListDisplay();
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const hidden: string[] = display.hiddenProperties;
    const columns = allColumns.filter((column) => !hidden.includes(column.key));
    const minWidth =
        columns.reduce((total, column) => total + column.width, 0) +
        (columns.length - 1) * 0.75 +
        2;
    const titleColumn = columns.findIndex(({ key }) => key === 'title') + 1;
    const expandable = groups
        .filter((group) => !isGroupCollapsed(group, groups, display))
        .flatMap((group) => group.issues)
        .filter((issue) => (issue.subtasksCount ?? 0) > 0);
    const allExpanded =
        expandable.length > 0 &&
        expandable.every((issue) => expandedIds.includes(issue.id));

    const sortBy = (ordering: ListOrdering) =>
        updateDisplay(
            display.ordering === ordering
                ? { reversed: !display.reversed }
                : { ordering, reversed: false },
        );

    const header = (column: Column): ReactNode => {
        if (column.key === 'expand') {
            return expandable.length > 0 ? (
                <button
                    type="button"
                    aria-label={
                        allExpanded
                            ? 'Hide all sub-tasks'
                            : 'Show all sub-tasks'
                    }
                    title={
                        allExpanded
                            ? 'Hide all sub-tasks'
                            : 'Show all sub-tasks'
                    }
                    className={inlineControl}
                    onClick={() =>
                        setExpandedIds(
                            allExpanded
                                ? []
                                : expandable.map((issue) => issue.id),
                        )
                    }
                >
                    {allExpanded ? (
                        <ChevronsDownUp className="size-3.5" />
                    ) : (
                        <ChevronsUpDown className="size-3.5" />
                    )}
                </button>
            ) : null;
        }

        const label =
            column.key === 'comments' ? (
                <>
                    <MessageSquare aria-hidden className="size-3.5" />
                    <span className="sr-only">{column.label}</span>
                </>
            ) : (
                <span className="truncate">{column.label}</span>
            );

        if (!column.ordering) {
            return <span className="flex items-center">{label}</span>;
        }

        const ordering = column.ordering;
        const isActive = display.ordering === ordering;
        const ascending = Boolean(column.ascending) !== display.reversed;

        return (
            <button
                type="button"
                onClick={() => sortBy(ordering)}
                className={cn(
                    '-mx-1.5 flex h-7 min-w-0 items-center gap-1 px-1.5 tracking-wider uppercase hover:bg-muted hover:text-foreground',
                    isActive && 'text-foreground',
                )}
            >
                {label}
                {isActive ? (
                    ascending ? (
                        <ArrowUp aria-hidden className="size-3 shrink-0" />
                    ) : (
                        <ArrowDown aria-hidden className="size-3 shrink-0" />
                    )
                ) : null}
            </button>
        );
    };

    const cell = (issue: Issue, key: ColumnKey): ReactNode => {
        switch (key) {
            case 'expand': {
                if ((issue.subtasksCount ?? 0) === 0) {
                    return null;
                }

                const isExpanded = expandedIds.includes(issue.id);

                return (
                    <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Hide' : 'Show'} the sub-tasks of ${issue.identifier}`}
                        className={inlineControl}
                        onClick={() =>
                            setExpandedIds((ids) => toggled(ids, issue.id))
                        }
                    >
                        <ChevronRight
                            className={cn(
                                'size-3.5 transition-transform',
                                isExpanded && 'rotate-90',
                            )}
                        />
                    </button>
                );
            }
            case 'identifier':
                return (
                    <span className="truncate text-xs text-muted-foreground">
                        {issue.identifier}
                    </span>
                );
            case 'title':
                return (
                    <Link
                        href={show([teamSlug, issue.identifier])}
                        className="min-w-0 truncate after:absolute after:inset-0"
                    >
                        {issue.title}
                    </Link>
                );
            case 'status':
                return (
                    <IssueStatusPicker
                        value={issue.status}
                        onChange={(status) => updateIssue(issue, { status })}
                    >
                        <button
                            type="button"
                            aria-label={`Status: ${statusLabel(issue.status)}`}
                            className={cellControl}
                        >
                            <IssueStatusIcon status={issue.status} />
                            <span className="truncate">
                                {statusLabel(issue.status)}
                            </span>
                        </button>
                    </IssueStatusPicker>
                );
            case 'priority':
                return (
                    <IssuePriorityPicker
                        value={issue.priority}
                        onChange={(priority) =>
                            updateIssue(issue, { priority })
                        }
                    >
                        <button
                            type="button"
                            aria-label={`Priority: ${priorityLabel(issue.priority)}`}
                            className={cellControl}
                        >
                            <IssuePriorityIcon priority={issue.priority} />
                            <span className="truncate">
                                {priorityLabel(issue.priority)}
                            </span>
                        </button>
                    </IssuePriorityPicker>
                );
            case 'assignee':
                return (
                    <IssueAssigneePicker
                        value={issue.assignee?.id ?? null}
                        onChange={(assigneeId) =>
                            updateIssue(issue, { assignee_id: assigneeId })
                        }
                    >
                        <button
                            type="button"
                            aria-label={
                                issue.assignee
                                    ? `Assigned to ${issue.assignee.name}`
                                    : 'Unassigned'
                            }
                            className={cellControl}
                        >
                            {issue.assignee ? (
                                <MemberAvatar name={issue.assignee.name} />
                            ) : (
                                <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span
                                className={cn(
                                    'truncate',
                                    !issue.assignee && 'text-muted-foreground',
                                )}
                            >
                                {issue.assignee?.name ?? 'Unassigned'}
                            </span>
                        </button>
                    </IssueAssigneePicker>
                );
            case 'labels':
                return (
                    <IssueLabelChips
                        labelIds={issue.labelIds}
                        max={2}
                        className="flex-nowrap overflow-hidden"
                    />
                );
            case 'dueDate':
                return issue.dueDate ? (
                    <span
                        className={cn(
                            'text-xs tabular-nums',
                            isOverdue(issue)
                                ? 'text-destructive'
                                : 'text-muted-foreground',
                        )}
                    >
                        {formatDueDate(issue.dueDate)}
                    </span>
                ) : (
                    emptyCell
                );
            case 'progress':
                return (issue.subtasksCount ?? 0) > 0 ? (
                    <SubtaskProgress
                        completed={issue.completedSubtasksCount ?? 0}
                        total={issue.subtasksCount ?? 0}
                        className="w-full"
                    />
                ) : (
                    emptyCell
                );
            case 'comments':
                return (issue.commentsCount ?? 0) > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <MessageSquare aria-hidden className="size-3" />
                        {issue.commentsCount}
                    </span>
                ) : (
                    emptyCell
                );
            case 'updated':
                return (
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {formatAge(issue.updatedAt)}
                    </span>
                );
        }
    };

    return (
        <div
            role="table"
            aria-label="Issues"
            className="flex flex-col"
            style={
                {
                    '--list-columns': columns
                        .map((column) =>
                            column.key === 'title'
                                ? `minmax(${column.width}rem, 1fr)`
                                : `${column.width}rem`,
                        )
                        .join(' '),
                    minWidth: `${minWidth}rem`,
                } as CSSProperties
            }
        >
            <div
                role="row"
                className="sticky top-0 z-30 grid h-9 grid-cols-(--list-columns) items-center gap-x-3 border-b bg-background px-4 text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase"
            >
                {columns.map((column) => {
                    const isActive = display.ordering === column.ordering;

                    return (
                        <div
                            key={column.key}
                            role="columnheader"
                            aria-sort={
                                isActive
                                    ? Boolean(column.ascending) !==
                                      display.reversed
                                        ? 'ascending'
                                        : 'descending'
                                    : undefined
                            }
                            className={cn(
                                'flex min-w-0',
                                column.alignEnd && 'justify-end',
                            )}
                        >
                            {header(column)}
                        </div>
                    );
                })}
            </div>

            {groups.map((group) => {
                const isCollapsed = isGroupCollapsed(group, groups, display);

                return (
                    <div key={group.key} role="rowgroup">
                        {display.grouping === 'none' ? null : (
                            <div
                                role="row"
                                className="sticky top-9 z-20 border-b bg-muted/80 backdrop-blur"
                            >
                                <div
                                    role="cell"
                                    aria-colspan={columns.length}
                                    className="flex h-9 items-center gap-2 px-4 text-xs font-semibold"
                                >
                                    <button
                                        type="button"
                                        aria-expanded={!isCollapsed}
                                        disabled={groups.length === 1}
                                        onClick={() =>
                                            updateDisplay({
                                                collapsedGroups: toggled(
                                                    display.collapsedGroups,
                                                    group.key,
                                                ),
                                            })
                                        }
                                        className="flex h-full min-w-0 items-center gap-2 text-left"
                                    >
                                        <ChevronRight
                                            className={cn(
                                                'size-3.5 shrink-0 text-muted-foreground transition-transform',
                                                !isCollapsed && 'rotate-90',
                                            )}
                                        />
                                        <GroupMark group={group} />
                                        <span className="truncate">
                                            {group.label}
                                        </span>
                                        <span className="font-normal text-muted-foreground">
                                            {group.issues.length}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Create an issue in ${group.label}`}
                                        className={cn(inlineControl, 'ml-auto')}
                                        onClick={() =>
                                            openCreateIssue({
                                                projectId,
                                                ...group.defaults,
                                            })
                                        }
                                    >
                                        <Plus className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {isCollapsed
                            ? null
                            : group.issues.map((issue) => (
                                  <Fragment key={issue.id}>
                                      <div
                                          role="row"
                                          data-issue-id={issue.id}
                                          data-selected={
                                              issue.id === selectedIssueId
                                          }
                                          className="relative grid h-10 scroll-mt-18 grid-cols-(--list-columns) items-center gap-x-3 border-b px-4 text-sm hover:bg-muted/40 data-[selected=true]:bg-muted"
                                      >
                                          {columns.map((column) => (
                                              <div
                                                  key={column.key}
                                                  role="cell"
                                                  className={cn(
                                                      'flex min-w-0 items-center',
                                                      column.alignEnd &&
                                                          'justify-end',
                                                  )}
                                              >
                                                  {cell(issue, column.key)}
                                              </div>
                                          ))}
                                      </div>
                                      {expandedIds.includes(issue.id) ? (
                                          <div
                                              role="row"
                                              className="grid grid-cols-(--list-columns) gap-x-3 border-b border-dashed bg-muted/20 px-4 py-2"
                                          >
                                              <div
                                                  role="cell"
                                                  aria-colspan={
                                                      columns.length -
                                                      titleColumn +
                                                      1
                                                  }
                                                  className="min-w-0"
                                                  style={{
                                                      gridColumn: `${titleColumn} / -1`,
                                                  }}
                                              >
                                                  <SubtaskChecklist
                                                      issueIdentifier={
                                                          issue.identifier
                                                      }
                                                      subtasks={
                                                          issue.subtasks ?? []
                                                      }
                                                      location="list"
                                                      className="max-w-xl"
                                                  />
                                              </div>
                                          </div>
                                      ) : null}
                                  </Fragment>
                              ))}
                    </div>
                );
            })}
        </div>
    );
}
