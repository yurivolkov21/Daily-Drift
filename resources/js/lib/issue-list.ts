import type { CreateIssueDefaults } from '@/hooks/use-issue-tracker';
import type {
    ListDisplay,
    ListGrouping,
    ListOrdering,
} from '@/hooks/use-list-display';
import { listStatusOrder, priorityLabel, statusLabel } from '@/lib/issues';
import type {
    Issue,
    IssuePriority,
    IssueStatus,
    IssueUser,
    Project,
} from '@/types';

export type IssueListGroup = {
    key: string;
    label: string;
    issues: Issue[];
    defaults: CreateIssueDefaults;
    status?: IssueStatus;
    assignee?: IssueUser | null;
    project?: Project;
    priority?: IssuePriority;
};

const priorityGroupOrder: IssuePriority[] = [4, 3, 2, 1, 0];

const newestFirst = (a: Issue, b: Issue) =>
    b.createdAt.localeCompare(a.createdAt);

/**
 * Compare two optional values, keeping the missing ones last.
 */
function missingLast<T>(
    a: T | null | undefined,
    b: T | null | undefined,
    compare: (a: T, b: T) => number,
): number {
    if (a == null || b == null) {
        return Number(a == null) - Number(b == null);
    }

    return compare(a, b);
}

const doneShare = (issue: Issue): number | null =>
    issue.subtasksCount
        ? (issue.completedSubtasksCount ?? 0) / issue.subtasksCount
        : null;

/**
 * Each ordering in its natural direction: most urgent, soonest due, most
 * recent and most done first, names from A to Z.
 */
const comparators: Record<ListOrdering, (a: Issue, b: Issue) => number> = {
    priority: (a, b) => b.priority - a.priority || newestFirst(a, b),
    dueDate: (a, b) =>
        missingLast(a.dueDate, b.dueDate, (first, second) =>
            first.localeCompare(second),
        ) || b.priority - a.priority,
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    created: newestFirst,
    identifier: (a, b) =>
        a.identifier.localeCompare(b.identifier, undefined, { numeric: true }),
    title: (a, b) =>
        a.title.localeCompare(b.title, undefined, { numeric: true }),
    status: (a, b) =>
        listStatusOrder.indexOf(a.status) - listStatusOrder.indexOf(b.status) ||
        b.priority - a.priority,
    assignee: (a, b) =>
        missingLast(a.assignee, b.assignee, (first, second) =>
            first.name.localeCompare(second.name),
        ),
    progress: (a, b) =>
        missingLast(
            doneShare(a),
            doneShare(b),
            (first, second) => second - first,
        ),
    comments: (a, b) => (b.commentsCount ?? 0) - (a.commentsCount ?? 0),
};

function groupsFor(
    issues: Issue[],
    grouping: ListGrouping,
    projects: Project[],
): IssueListGroup[] {
    switch (grouping) {
        case 'status':
            return listStatusOrder.map((status) => ({
                key: `status:${status}`,
                label: statusLabel(status),
                status,
                defaults: { status },
                issues: issues.filter((issue) => issue.status === status),
            }));
        case 'assignee': {
            const assignees = [
                ...new Map(
                    issues.flatMap((issue) =>
                        issue.assignee
                            ? [[issue.assignee.id, issue.assignee] as const]
                            : [],
                    ),
                ).values(),
            ].sort((a, b) => a.name.localeCompare(b.name));

            return [
                ...assignees.map((assignee) => ({
                    key: `assignee:${assignee.id}`,
                    label: assignee.name,
                    assignee,
                    defaults: { assigneeId: assignee.id },
                    issues: issues.filter(
                        (issue) => issue.assignee?.id === assignee.id,
                    ),
                })),
                {
                    key: 'assignee:none',
                    label: 'Unassigned',
                    assignee: null,
                    defaults: { assigneeId: null },
                    issues: issues.filter((issue) => !issue.assignee),
                },
            ];
        }
        case 'project':
            return projects.map((project) => ({
                key: `project:${project.key}`,
                label: project.name,
                project,
                defaults: { projectId: project.id },
                issues: issues.filter(
                    (issue) => issue.projectId === project.id,
                ),
            }));
        case 'priority':
            return priorityGroupOrder.map((priority) => ({
                key: `priority:${priority}`,
                label: priorityLabel(priority),
                priority,
                defaults: { priority },
                issues: issues.filter((issue) => issue.priority === priority),
            }));
        default:
            return [{ key: 'all', label: 'All issues', defaults: {}, issues }];
    }
}

/**
 * Sort the issues and split them into the list's groups, leaving out empty
 * groups.
 */
export function arrangeIssueList(
    issues: Issue[],
    display: Pick<ListDisplay, 'grouping' | 'ordering' | 'reversed'>,
    projects: Project[],
): IssueListGroup[] {
    const compare = comparators[display.ordering];
    const sorted = [...issues].sort((a, b) =>
        display.reversed ? compare(b, a) : compare(a, b),
    );

    return groupsFor(sorted, display.grouping, projects).filter(
        (group) => group.issues.length > 0,
    );
}
