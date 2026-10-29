import {
    isDoneThisWeek,
    isDueThisWeek,
    isDueToday,
    isOverdue,
} from '@/lib/issues';
import type { DoneFilter, DueFilter, Issue, IssueFilters } from '@/types';

export type DateFilterOption<TValue extends string> = {
    value: TValue;
    label: string;
    /**
     * Whether the issue passes the filter on the reader's day.
     */
    test: (issue: Issue) => boolean;
    /**
     * What the empty list says when nothing passes.
     */
    empty: { title: string; description: string };
};

export const dueFilters: DateFilterOption<DueFilter>[] = [
    {
        value: 'overdue',
        label: 'Overdue',
        test: isOverdue,
        empty: {
            title: 'Nothing overdue',
            description: 'Every open issue with a due date is still on time.',
        },
    },
    {
        value: 'today',
        label: 'Due today',
        test: isDueToday,
        empty: {
            title: 'Nothing due today',
            description: 'No open issue is due today.',
        },
    },
    {
        value: 'week',
        label: 'Due this week',
        test: isDueThisWeek,
        empty: {
            title: 'Nothing due this week',
            description: 'No open issue is due between today and Sunday.',
        },
    },
    {
        value: 'none',
        label: 'No due date',
        test: (issue) => issue.dueDate === null,
        empty: {
            title: 'Every issue has a due date',
            description: 'Nothing here is undated.',
        },
    },
];

export const doneFilters: DateFilterOption<DoneFilter>[] = [
    {
        value: 'week',
        label: 'This week',
        test: isDoneThisWeek,
        empty: {
            title: 'Nothing done this week yet',
            description: 'Issues moved to Done since Monday show up here.',
        },
    },
];

export function activeDueFilter(
    filters: Pick<IssueFilters, 'due'>,
): DateFilterOption<DueFilter> | null {
    return dueFilters.find(({ value }) => value === filters.due) ?? null;
}

export function activeDoneFilter(
    filters: Pick<IssueFilters, 'done'>,
): DateFilterOption<DoneFilter> | null {
    return doneFilters.find(({ value }) => value === filters.done) ?? null;
}

/**
 * Keep the issues that pass the date filters on the reader's own day. The
 * server cannot know that day, so it sends a day to spare at each end.
 */
export function applyDateFilters(
    issues: Issue[],
    filters: Pick<IssueFilters, 'due' | 'done'>,
): Issue[] {
    const tests = [activeDueFilter(filters), activeDoneFilter(filters)].flatMap(
        (option) => (option ? [option.test] : []),
    );

    return tests.length === 0
        ? issues
        : issues.filter((issue) => tests.every((test) => test(issue)));
}
