import {
    differenceInMinutes,
    endOfWeek,
    format,
    isBefore,
    isToday,
    parseISO,
    startOfToday,
    startOfWeek,
} from 'date-fns';
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

/**
 * Near black or white, whichever reads better on a label's color.
 */
export function labelTextColor(color: string): string {
    const [red, green, blue] = [1, 3, 5].map(
        (start) => parseInt(color.slice(start, start + 2), 16) / 255,
    );

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.6
        ? '#1a1a1a'
        : '#ffffff';
}

export function formatDueDate(dueDate: string): string {
    return format(parseISO(dueDate), 'MMM d');
}

/**
 * A short age such as "5m", "3h" or "2d", or the date once it is a month old.
 */
export function formatAge(timestamp: string): string {
    const date = parseISO(timestamp);
    const minutes = differenceInMinutes(new Date(), date);

    if (minutes < 1) {
        return 'now';
    }

    if (minutes < 60) {
        return `${minutes}m`;
    }

    if (minutes < 60 * 24) {
        return `${Math.floor(minutes / 60)}h`;
    }

    if (minutes < 60 * 24 * 30) {
        return `${Math.floor(minutes / (60 * 24))}d`;
    }

    return format(date, 'MMM d');
}

/**
 * Weeks run from Monday to Sunday.
 */
export const weekOptions = { weekStartsOn: 1 } as const;

export function isOverdue(issue: Pick<Issue, 'dueDate' | 'status'>): boolean {
    return (
        issue.dueDate !== null &&
        !isClosedStatus(issue.status) &&
        isBefore(parseISO(issue.dueDate), startOfToday())
    );
}

export function isDueToday(issue: Pick<Issue, 'dueDate' | 'status'>): boolean {
    return (
        issue.dueDate !== null &&
        !isClosedStatus(issue.status) &&
        isToday(parseISO(issue.dueDate))
    );
}

/**
 * Whether the open issue is due between today and Sunday.
 */
export function isDueThisWeek(
    issue: Pick<Issue, 'dueDate' | 'status'>,
): boolean {
    if (issue.dueDate === null || isClosedStatus(issue.status)) {
        return false;
    }

    const dueDate = parseISO(issue.dueDate);
    const today = startOfToday();

    return dueDate >= today && dueDate <= endOfWeek(today, weekOptions);
}

/**
 * Whether the issue was done since Monday.
 */
export function isDoneThisWeek(
    issue: Pick<Issue, 'completedAt' | 'status'>,
): boolean {
    return (
        issue.status === 'done' &&
        issue.completedAt != null &&
        parseISO(issue.completedAt) >= startOfWeek(startOfToday(), weekOptions)
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

/**
 * A git branch name that links work to the issue, such as
 * "dd-12-fix-the-login-redirect-loop" for DD-12. Accents are dropped, so a
 * Vietnamese title gives "dd-12-sua-loi-dang-nhap".
 */
export function branchName(identifier: string, title: string): string {
    const slug = title
        .toLowerCase()
        .replace(/đ/g, 'd')
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
        .replace(/-+$/, '');

    return slug
        ? `${identifier.toLowerCase()}-${slug}`
        : identifier.toLowerCase();
}
