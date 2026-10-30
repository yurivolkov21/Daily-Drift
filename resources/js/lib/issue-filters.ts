import {
    isDoneThisWeek,
    isDueThisWeek,
    isDueToday,
    isOverdue,
} from '@/lib/issues';
import type {
    AssigneeFilter,
    DoneFilter,
    DueFilter,
    Issue,
    IssueFilters,
    IssuePriority,
    IssueStatus,
} from '@/types';

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

export type FilterPropertyKey = keyof Omit<IssueFilters, 'project'>;

/**
 * A value a filter takes: a status, a priority, a member id, "me" or
 * "none", a label id, or a date filter.
 */
export type FilterValue = string | number;

export type FilterProperty = {
    key: FilterPropertyKey;
    label: string;
    /**
     * Whether the property takes one value; choosing it again drops it.
     */
    single: boolean;
    /**
     * How the chip reads before one value, and before several.
     */
    operator: string;
    operatorMany: string;
    placeholder: string;
};

/**
 * The properties of the Filter menu, in its order.
 */
export const filterProperties: FilterProperty[] = [
    {
        key: 'status',
        label: 'Status',
        single: false,
        operator: 'is',
        operatorMany: 'is any of',
        placeholder: 'Find a status...',
    },
    {
        key: 'assignee',
        label: 'Assignee',
        single: false,
        operator: 'is',
        operatorMany: 'is any of',
        placeholder: 'Find a member...',
    },
    {
        key: 'priority',
        label: 'Priority',
        single: false,
        operator: 'is',
        operatorMany: 'is any of',
        placeholder: 'Find a priority...',
    },
    {
        key: 'label',
        label: 'Labels',
        single: false,
        operator: 'includes',
        operatorMany: 'includes any of',
        placeholder: 'Find a label...',
    },
    {
        key: 'due',
        label: 'Due date',
        single: true,
        operator: 'is',
        operatorMany: 'is',
        placeholder: 'Find a due date...',
    },
    {
        key: 'done',
        label: 'Completed',
        single: true,
        operator: 'is',
        operatorMany: 'is',
        placeholder: 'Find a period...',
    },
];

/**
 * The values of the property in force, as a list for every kind.
 */
export function filterValues(
    filters: IssueFilters,
    key: FilterPropertyKey,
): FilterValue[] {
    const value = filters[key];

    return Array.isArray(value) ? value : value === null ? [] : [value];
}

function toggled<TValue>(list: TValue[], value: TValue): TValue[] {
    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
}

/**
 * The change that chooses the value, or drops it when it is chosen already.
 */
export function toggleFilterValue(
    filters: IssueFilters,
    key: FilterPropertyKey,
    value: FilterValue,
): Partial<IssueFilters> {
    switch (key) {
        case 'status':
            return { status: toggled(filters.status, value as IssueStatus) };
        case 'assignee':
            return {
                assignee: toggled(filters.assignee, value as AssigneeFilter),
            };
        case 'priority':
            return {
                priority: toggled(filters.priority, value as IssuePriority),
            };
        case 'label':
            return { label: toggled(filters.label, value as string) };
        case 'due':
            return { due: filters.due === value ? null : (value as DueFilter) };
        case 'done':
            return {
                done: filters.done === value ? null : (value as DoneFilter),
            };
    }
}

/**
 * The change that drops the property's filter.
 */
export function droppedFilter(key: FilterPropertyKey): Partial<IssueFilters> {
    switch (key) {
        case 'status':
            return { status: [] };
        case 'assignee':
            return { assignee: [] };
        case 'priority':
            return { priority: [] };
        case 'label':
            return { label: [] };
        case 'due':
            return { due: null };
        case 'done':
            return { done: null };
    }
}

/**
 * Whether the assignee filter is the "My issues" scope: the reader alone.
 */
export function isMyIssuesScope(filters: Pick<IssueFilters, 'assignee'>) {
    return filters.assignee.length === 1 && filters.assignee[0] === 'me';
}

/**
 * The properties with a value in force. The "My issues" scope has its own
 * button, so it is not one of them.
 */
export function activeFilterProperties(
    filters: IssueFilters,
): FilterProperty[] {
    return filterProperties.filter(
        (property) =>
            filterValues(filters, property.key).length > 0 &&
            !(property.key === 'assignee' && isMyIssuesScope(filters)),
    );
}

/**
 * The change that drops every filter in force, keeping the project and the
 * "My issues" scope.
 */
export function clearedFilters(
    filters: Pick<IssueFilters, 'assignee'>,
): Partial<IssueFilters> {
    return {
        assignee: isMyIssuesScope(filters) ? ['me'] : [],
        status: [],
        priority: [],
        label: [],
        due: null,
        done: null,
    };
}

/**
 * The filters as the page's URL names them: one parameter per property,
 * the values of a list joined with commas.
 */
export function issueFilterQuery(
    filters: IssueFilters,
): Record<FilterPropertyKey | 'project', string | null> {
    const list = (values: FilterValue[]) =>
        values.length > 0 ? values.join(',') : null;

    return {
        project: filters.project,
        assignee: list(filters.assignee),
        status: list(filters.status),
        priority: list(filters.priority),
        label: list(filters.label),
        due: filters.due,
        done: filters.done,
    };
}
