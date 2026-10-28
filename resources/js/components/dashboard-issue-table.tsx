import { Link, usePage } from '@inertiajs/react';
import { CalendarDays, TriangleAlert, UserRound } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { IssueLabelChips } from '@/components/issue-label-chips';
import { IssueStatusPicker } from '@/components/issue-pickers';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { MemberAvatar } from '@/components/member-avatar';
import { ProjectGlyph } from '@/components/project-icon';
import { useUpdateIssue } from '@/hooks/use-update-issue';
import { daysUntilDue, formatDueDay } from '@/lib/dashboard';
import {
    formatDueDate,
    isClosedStatus,
    isOverdue,
    priorityLabel,
    statusLabel,
} from '@/lib/issues';
import { cn } from '@/lib/utils';
import { show } from '@/routes/issues';
import type { Issue } from '@/types';

export type IssueTableColumn =
    | 'priority'
    | 'identifier'
    | 'status'
    | 'title'
    | 'assignee'
    | 'labels'
    | 'dueDate'
    | 'project';

/**
 * Widths of the table that the column comes in at, narrowest first.
 */
type Tier = 'sm' | 'lg' | '2xl';

const tiers: Tier[] = ['sm', 'lg', '2xl'];

/**
 * Full class names, so Tailwind finds them.
 */
const shownFrom: Record<Tier, string> = {
    sm: 'hidden @sm/table:flex',
    lg: 'hidden @lg/table:flex',
    '2xl': 'hidden @2xl/table:flex',
};

/**
 * Every column with its width. The title takes the spare room, and the
 * columns with a tier only come in once the table is that wide.
 */
const columnSpecs: Record<
    IssueTableColumn,
    { label: string; width: string; iconOnly?: boolean; from?: Tier }
> = {
    priority: { label: 'Priority', width: '1rem', iconOnly: true },
    identifier: { label: 'ID', width: '3.75rem', from: 'lg' },
    status: { label: 'Status', width: '1.25rem', iconOnly: true },
    title: { label: 'Title', width: 'minmax(0,1fr)' },
    assignee: { label: 'Assignee', width: '1.25rem', iconOnly: true },
    labels: { label: 'Labels', width: '6rem', from: '2xl' },
    dueDate: { label: 'Due', width: '5.25rem' },
    project: { label: 'Project', width: '1rem', iconOnly: true, from: 'sm' },
};

function gridColumns(columns: IssueTableColumn[], tier: number): string {
    return columns
        .filter((column) => {
            const from = columnSpecs[column].from;

            return from === undefined || tiers.indexOf(from) <= tier;
        })
        .map((column) => columnSpecs[column].width)
        .join(' ');
}

const rowGrid =
    'grid grid-cols-(--table-columns) items-center gap-x-3 px-4 @sm/table:grid-cols-(--table-columns-sm) @lg/table:grid-cols-(--table-columns-lg) @2xl/table:grid-cols-(--table-columns-2xl)';

const emptyCell = <span className="text-xs text-muted-foreground">–</span>;

function DueDay({ issue }: { issue: Issue }) {
    if (issue.dueDate === null) {
        return emptyCell;
    }

    const days = daysUntilDue(issue.dueDate);
    const late = isOverdue(issue);
    const dueToday = days === 0 && !isClosedStatus(issue.status);

    return (
        <span
            title={
                late
                    ? `Due ${formatDueDate(issue.dueDate)}, ${-days} ${days === -1 ? 'day' : 'days'} late`
                    : `Due ${formatDueDate(issue.dueDate)}`
            }
            className={cn(
                'inline-flex items-center gap-1 text-xs whitespace-nowrap tabular-nums',
                late
                    ? 'text-destructive'
                    : dueToday
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
            )}
        >
            {late ? (
                <TriangleAlert className="size-3.5 shrink-0" />
            ) : (
                <CalendarDays className="size-3.5 shrink-0" />
            )}
            {formatDueDay(issue.dueDate)}
        </span>
    );
}

/**
 * Issues as a compact version of the Issues page's list: a grid with a set
 * width per column, so the columns line up from row to row and only the
 * title stretches. On a narrow table the labels, ID and project drop out.
 */
export function DashboardIssueTable({
    issues,
    columns,
    label,
    header = true,
}: {
    issues: Issue[];
    columns: IssueTableColumn[];
    label: string;
    header?: boolean;
}) {
    const page = usePage();
    const teamSlug = page.props.currentTeam?.slug ?? '';
    const projects = page.props.workspace?.projects ?? [];
    const updateIssue = useUpdateIssue();

    const cellClass = (column: IssueTableColumn) => {
        const from = columnSpecs[column].from;

        return cn('min-w-0 items-center', from ? shownFrom[from] : 'flex');
    };

    const cell = (issue: Issue, column: IssueTableColumn): ReactNode => {
        switch (column) {
            case 'priority':
                return (
                    <span title={priorityLabel(issue.priority)}>
                        <IssuePriorityIcon priority={issue.priority} />
                    </span>
                );
            case 'identifier':
                return (
                    <span className="truncate text-xs text-muted-foreground tabular-nums">
                        {issue.identifier}
                    </span>
                );
            case 'status':
                return (
                    <IssueStatusPicker
                        value={issue.status}
                        onChange={(status) => updateIssue(issue, { status })}
                    >
                        <button
                            type="button"
                            aria-label={`${issue.identifier} is ${statusLabel(issue.status)}. Change status`}
                            className="relative z-10 -m-1 flex size-6 shrink-0 items-center justify-center outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 data-popup-open:bg-muted"
                        >
                            <IssueStatusIcon status={issue.status} />
                        </button>
                    </IssueStatusPicker>
                );
            case 'title':
                return (
                    <Link
                        href={show([teamSlug, issue.identifier])}
                        title={issue.title}
                        className="min-w-0 truncate outline-none after:absolute after:inset-0 focus-visible:underline"
                    >
                        {issue.title}
                    </Link>
                );
            case 'assignee':
                return issue.assignee ? (
                    <span title={issue.assignee.name}>
                        <MemberAvatar name={issue.assignee.name} />
                    </span>
                ) : (
                    <span
                        title="Unassigned"
                        className="flex size-5 items-center justify-center rounded-full border border-dashed text-muted-foreground"
                    >
                        <UserRound className="size-3" />
                    </span>
                );
            case 'labels':
                return (
                    <IssueLabelChips
                        labelIds={issue.labelIds}
                        max={1}
                        className="flex-nowrap overflow-hidden"
                    />
                );
            case 'dueDate':
                return <DueDay issue={issue} />;
            case 'project': {
                const project = projects.find(
                    ({ id }) => id === issue.projectId,
                );

                return project ? (
                    <span title={project.name} className="flex">
                        <ProjectGlyph project={project} className="size-3.5" />
                    </span>
                ) : null;
            }
        }
    };

    return (
        <div
            role="table"
            aria-label={label}
            className="@container/table flex flex-col"
            style={
                {
                    '--table-columns': gridColumns(columns, -1),
                    '--table-columns-sm': gridColumns(columns, 0),
                    '--table-columns-lg': gridColumns(columns, 1),
                    '--table-columns-2xl': gridColumns(columns, 2),
                } as CSSProperties
            }
        >
            {header ? (
                <div
                    role="row"
                    className={cn(
                        rowGrid,
                        'h-9 border-b text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase',
                    )}
                >
                    {columns.map((column) => (
                        <div
                            key={column}
                            role="columnheader"
                            className={cellClass(column)}
                        >
                            <span
                                className={
                                    columnSpecs[column].iconOnly
                                        ? 'sr-only'
                                        : 'truncate'
                                }
                            >
                                {columnSpecs[column].label}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
            {issues.map((issue) => (
                <div
                    key={issue.id}
                    role="row"
                    className={cn(
                        rowGrid,
                        'relative h-10 border-b text-sm last:border-b-0 hover:bg-muted/40',
                    )}
                >
                    {columns.map((column) => (
                        <div
                            key={column}
                            role="cell"
                            className={cellClass(column)}
                        >
                            {cell(issue, column)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
