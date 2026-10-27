import { format, isBefore, parseISO, startOfToday } from 'date-fns';
import type { Issue, IssuePriority, IssueStatus } from '@/types';

export const issueStatuses: { value: IssueStatus; label: string }[] = [
    { value: 'backlog', label: 'Backlog' },
    { value: 'todo', label: 'Todo' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'in_review', label: 'In Review' },
    { value: 'done', label: 'Done' },
    { value: 'canceled', label: 'Canceled' },
];

/**
 * The order of status groups in the list view: work in flight first.
 */
export const listStatusOrder: IssueStatus[] = [
    'in_progress',
    'in_review',
    'todo',
    'backlog',
    'done',
    'canceled',
];

export const issuePriorities: { value: IssuePriority; label: string }[] = [
    { value: 0, label: 'No priority' },
    { value: 4, label: 'Urgent' },
    { value: 3, label: 'High' },
    { value: 2, label: 'Medium' },
    { value: 1, label: 'Low' },
];

export const labelColors = [
    '#eb5757',
    '#f2994a',
    '#f2c94c',
    '#4cb782',
    '#26b5ce',
    '#5e6ad2',
    '#bb87fc',
    '#95a2b3',
];

/**
 * Group issues by status in list order, leaving out empty groups.
 */
export function groupIssuesByStatus(
    issues: Issue[],
): { status: IssueStatus; issues: Issue[] }[] {
    return listStatusOrder
        .map((status) => ({
            status,
            issues: issues.filter((issue) => issue.status === status),
        }))
        .filter((group) => group.issues.length > 0);
}

export function statusLabel(status: IssueStatus): string {
    return issueStatuses.find((option) => option.value === status)?.label ?? '';
}

export function priorityLabel(priority: IssuePriority): string {
    return (
        issuePriorities.find((option) => option.value === priority)?.label ?? ''
    );
}

export function isClosedStatus(status: IssueStatus): boolean {
    return status === 'done' || status === 'canceled';
}

export function formatDueDate(dueDate: string): string {
    return format(parseISO(dueDate), 'MMM d');
}

export function isOverdue(issue: Pick<Issue, 'dueDate' | 'status'>): boolean {
    return (
        issue.dueDate !== null &&
        !isClosedStatus(issue.status) &&
        isBefore(parseISO(issue.dueDate), startOfToday())
    );
}

/**
 * Suggest a project key from its name, e.g. "Daily Drift" becomes "DD".
 */
export function suggestProjectKey(name: string): string {
    const words = name
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, '')
        .split(' ')
        .filter(Boolean);

    const key =
        words.length > 1
            ? words.map((word) => word[0]).join('')
            : (words[0] ?? '').slice(0, 3);

    return key.replace(/^[0-9]+/, '').slice(0, 5);
}
