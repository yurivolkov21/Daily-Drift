import {
    AlarmClock,
    CalendarClock,
    CalendarDays,
    CalendarX,
    Check,
    ChevronDown,
    Flag,
    Search,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { MemberAvatar } from '@/components/member-avatar';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import type { BoardFilters, DueFilter } from '@/lib/board-filters';
import { dueKind, filtersOn, NO_FILTERS } from '@/lib/board-filters';
import { labelIcon } from '@/lib/label-icons';
import { PRIORITIES, PRIORITY_NAMES } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import type { Priority, Task, TeamLabel } from '@/types';

type Member = { id: number; name: string };

type Option<T> = {
    value: T;
    label: string;
    icon: ReactNode;
    count: number;
};

const DUE: { value: DueFilter; label: string; icon: ReactNode }[] = [
    {
        value: 'overdue',
        label: 'Overdue',
        icon: <AlarmClock className="text-red-600" />,
    },
    {
        value: 'today',
        label: 'Today',
        icon: <CalendarClock className="text-amber-600" />,
    },
    {
        value: 'week',
        label: 'Next 7 days',
        icon: <CalendarDays className="text-muted-foreground" />,
    },
    {
        value: 'none',
        label: 'No due date',
        icon: <CalendarX className="text-muted-foreground" />,
    },
];

/**
 * The board's filter bar (spec 0007, round 7): a text field and one button
 * per filter, each with a checklist and counts. Choices inside a filter
 * widen the result; different filters narrow it.
 */
export function FilterBar({
    filters,
    onChange,
    tasks,
    labels,
    members,
    me,
    today,
    shown,
    leading,
    noun = 'card',
}: {
    filters: BoardFilters;
    onChange: (filters: BoardFilters) => void;
    /** Every task of the board, for the counts. */
    tasks: Task[];
    labels: TeamLabel[];
    members: Member[];
    me: number;
    today: string;
    /** How many cards pass the filters. */
    shown: number;
    /** Shown first in the row: the view switch (spec 0008). */
    leading?: ReactNode;
    /** What the result counts: cards on the board, tasks in the other views. */
    noun?: 'card' | 'task';
}) {
    const toggle = <K extends 'labels' | 'assignee' | 'due' | 'priority'>(
        key: K,
        value: BoardFilters[K][number],
    ) => {
        const current = filters[key] as BoardFilters[K][number][];

        onChange({
            ...filters,
            [key]: current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value],
        });
    };
    const clear = (key: 'labels' | 'assignee' | 'due' | 'priority') =>
        onChange({ ...filters, [key]: [] });
    const count = (pass: (task: Task) => boolean) => tasks.filter(pass).length;

    const labelOptions: Option<number>[] = labels.map((label) => {
        const Icon = labelIcon(label.icon);

        return {
            value: label.id,
            label: label.name,
            icon: <Icon className="text-muted-foreground" />,
            count: count((task) => task.labelIds.includes(label.id)),
        };
    });
    const others = members.filter((member) => member.id !== me);
    const meMember = members.find((member) => member.id === me);
    const assigneeOptions: Option<'me' | 'none' | number>[] = [
        ...(meMember
            ? [
                  {
                      value: 'me' as const,
                      label: 'Me',
                      icon: (
                          <MemberAvatar
                              id={meMember.id}
                              name={meMember.name}
                              className="size-5 text-[8px]"
                          />
                      ),
                      count: count((task) => task.assigneeId === me),
                  },
              ]
            : []),
        ...others.map((member) => ({
            value: member.id,
            label: member.name,
            icon: (
                <MemberAvatar
                    id={member.id}
                    name={member.name}
                    className="size-5 text-[8px]"
                />
            ),
            count: count((task) => task.assigneeId === member.id),
        })),
        {
            value: 'none' as const,
            label: 'Unassigned',
            icon: (
                <span className="size-5 rounded-full border-2 border-dashed border-input" />
            ),
            count: count((task) => task.assigneeId === null),
        },
    ];
    const dueOptions: Option<DueFilter>[] = DUE.map((option) => ({
        ...option,
        count: count((task) => dueKind(task, today) === option.value),
    }));
    const priorityOptions: Option<Priority>[] = [...PRIORITY_NAMES]
        .reverse()
        .map((priority) => ({
            value: priority,
            label:
                priority === 'none'
                    ? 'No priority'
                    : PRIORITIES[priority].label,
            icon: <Flag className={PRIORITIES[priority].flag} />,
            count: count((task) => task.priority === priority),
        }));

    return (
        <div
            className="flex w-full basis-full flex-wrap items-center gap-2"
            data-test="filter-bar"
        >
            {leading && (
                <>
                    {leading}
                    <span
                        aria-hidden="true"
                        className="mx-0.5 hidden h-6 w-px bg-border sm:block"
                    />
                </>
            )}
            <label className="flex h-10 min-w-48 flex-[0_1_260px] items-center gap-2 rounded-xl border bg-secondary/50 px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
                <Search className="size-4 shrink-0" aria-hidden="true" />
                <input
                    value={filters.q}
                    onChange={(event) =>
                        onChange({ ...filters, q: event.target.value })
                    }
                    placeholder={`Filter ${noun}s`}
                    aria-label={`Filter ${noun}s by title`}
                    data-test="filter-text"
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {filters.q !== '' && (
                    <button
                        type="button"
                        aria-label="Clear the text"
                        onClick={() => onChange({ ...filters, q: '' })}
                        className="rounded p-0.5 hover:text-foreground"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </label>
            <FilterButton
                name="Labels"
                options={labelOptions}
                chosen={filters.labels}
                onToggle={(value) => toggle('labels', value)}
                onClear={() => clear('labels')}
                empty="No labels yet. Add them from a task."
            />
            <FilterButton
                name="Assignee"
                options={assigneeOptions}
                chosen={filters.assignee}
                onToggle={(value) => toggle('assignee', value)}
                onClear={() => clear('assignee')}
            />
            <FilterButton
                name="Due"
                options={dueOptions}
                chosen={filters.due}
                onToggle={(value) => toggle('due', value)}
                onClear={() => clear('due')}
            />
            <FilterButton
                name="Priority"
                options={priorityOptions}
                chosen={filters.priority}
                onToggle={(value) => toggle('priority', value)}
                onClear={() => clear('priority')}
            />
            <span className="ml-auto flex items-center gap-3 text-[13px] text-muted-foreground">
                <span data-test="filter-result">
                    {shown} of {tasks.length}{' '}
                    {tasks.length === 1 ? noun : `${noun}s`}
                </span>
                {filtersOn(filters) && (
                    <button
                        type="button"
                        onClick={() => onChange(NO_FILTERS)}
                        className="rounded-md px-1.5 py-1 font-semibold text-primary hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        Clear filters
                    </button>
                )}
            </span>
        </div>
    );
}

function FilterButton<T extends string | number>({
    name,
    options,
    chosen,
    onToggle,
    onClear,
    empty,
}: {
    name: string;
    options: Option<T>[];
    chosen: T[];
    onToggle: (value: T) => void;
    onClear: () => void;
    empty?: string;
}) {
    const [open, setOpen] = useState(false);
    const active = chosen.length;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    data-test={`filter-${name.toLowerCase()}`}
                    className={cn(
                        'inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[13.5px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        active > 0
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'bg-card hover:bg-secondary',
                    )}
                >
                    {name}
                    {active > 0 && (
                        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground tabular-nums">
                            {active}
                        </span>
                    )}
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 rounded-2xl p-1.5">
                {options.length === 0 ? (
                    <p className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                        {empty}
                    </p>
                ) : (
                    <ul
                        role="listbox"
                        aria-multiselectable="true"
                        aria-label={name}
                        className="flex thin-scrollbar max-h-72 flex-col gap-px overflow-y-auto"
                    >
                        {options.map((option) => {
                            const on = chosen.includes(option.value);

                            return (
                                <li key={String(option.value)}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={on}
                                        onClick={() => onToggle(option.value)}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none [&_svg]:size-4"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border',
                                                on
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-input',
                                            )}
                                        >
                                            {on && (
                                                <Check className="size-3!" />
                                            )}
                                        </span>
                                        <span
                                            aria-hidden="true"
                                            className="flex shrink-0 items-center"
                                        >
                                            {option.icon}
                                        </span>
                                        <span className="flex-1 truncate font-medium">
                                            {option.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {option.count}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <div className="mt-1 flex justify-between border-t px-1 pt-1.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={active === 0}
                        onClick={onClear}
                    >
                        Clear
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-primary"
                        onClick={() => setOpen(false)}
                    >
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
