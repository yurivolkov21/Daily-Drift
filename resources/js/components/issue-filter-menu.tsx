import { usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarClock,
    CalendarDays,
    CalendarX,
    ChevronRight,
    CircleCheck,
    CircleDashed,
    ListFilter,
    SignalHigh,
    Tag,
    TriangleAlert,
    UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { IssueLabel } from '@/components/issue-label-chips';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { MemberAvatar } from '@/components/member-avatar';
import { filterByLabel } from '@/components/property-picker';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    activeFilterProperties,
    doneFilters,
    dueFilters,
    filterProperties,
    filterValues,
    toggleFilterValue,
} from '@/lib/issue-filters';
import type {
    FilterProperty,
    FilterPropertyKey,
    FilterValue,
} from '@/lib/issue-filters';
import { issuePriorities, issueStatuses } from '@/lib/issues';
import { cn } from '@/lib/utils';
import type { DoneFilter, DueFilter, IssueFilters } from '@/types';

const dueIcons: Record<DueFilter, LucideIcon> = {
    overdue: TriangleAlert,
    today: CalendarClock,
    week: CalendarDays,
    none: CalendarX,
};

const doneIcons: Record<DoneFilter, LucideIcon> = {
    week: CircleCheck,
};

/**
 * The icon of a date filter; overdue reads as a warning.
 */
export function DateFilterIcon({
    due,
    done,
    className,
}: {
    due?: DueFilter;
    done?: DoneFilter;
    className?: string;
}) {
    const Icon = due ? dueIcons[due] : done ? doneIcons[done] : null;

    if (Icon === null) {
        return null;
    }

    return (
        <Icon
            className={cn(
                due === 'overdue'
                    ? 'text-destructive'
                    : 'text-muted-foreground',
                className,
            )}
        />
    );
}

const propertyIcons: Record<FilterPropertyKey, LucideIcon> = {
    status: CircleDashed,
    assignee: UserRound,
    priority: SignalHigh,
    label: Tag,
    due: CalendarDays,
    done: CircleCheck,
};

/**
 * The icon of a property of the Filter menu.
 */
export function FilterPropertyIcon({
    property,
    className,
}: {
    property: FilterPropertyKey;
    className?: string;
}) {
    const Icon = propertyIcons[property];

    return <Icon className={cn('text-muted-foreground', className)} />;
}

export type FilterOption = {
    value: FilterValue;
    label: string;
    icon?: ReactNode;
    display?: ReactNode;
};

/**
 * The values each property offers: the team's members and labels, and the
 * fixed lists of the rest.
 */
export function useFilterOptions(): Record<FilterPropertyKey, FilterOption[]> {
    const { auth, workspace } = usePage().props;
    const members = workspace?.members ?? [];
    const labels = workspace?.labels ?? [];

    return {
        status: issueStatuses.map((status) => ({
            value: status.value,
            label: status.label,
            icon: <IssueStatusIcon status={status.value} />,
        })),
        assignee: [
            {
                value: 'me',
                label: 'Me',
                icon: <MemberAvatar name={auth.user.name} className="size-4" />,
            },
            ...members
                .filter((member) => member.id !== auth.user.id)
                .map((member) => ({
                    value: member.id,
                    label: member.name,
                    icon: (
                        <MemberAvatar name={member.name} className="size-4" />
                    ),
                })),
            {
                value: 'none',
                label: 'No assignee',
                icon: <UserRound className="text-muted-foreground" />,
            },
        ],
        priority: issuePriorities.map((priority) => ({
            value: priority.value,
            label: priority.label,
            icon: <IssuePriorityIcon priority={priority.value} />,
        })),
        label: labels.map((label) => ({
            value: label.id,
            label: label.name,
            display: <IssueLabel name={label.name} color={label.color} />,
        })),
        due: dueFilters.map((option) => ({
            value: option.value,
            label: option.label,
            icon: <DateFilterIcon due={option.value} />,
        })),
        done: doneFilters.map((option) => ({
            value: option.value,
            label: option.label,
            icon: <DateFilterIcon done={option.value} />,
        })),
    };
}

type Props = {
    filters: IssueFilters;
    open: boolean;
    /**
     * The property the menu opens on, or null for the list of properties.
     */
    openAt: FilterPropertyKey | null;
    onOpenChange: (open: boolean) => void;
    onChange: (changes: Partial<IssueFilters>) => void;
};

/**
 * The Filter button: a menu in two levels, as Linear's. The first lists the
 * properties, with the count in force on each; one opens its values, ticked
 * when in force, which stay open for the properties taking several. Typing
 * on the first level searches every value at once.
 */
export function IssueFilterMenu({
    filters,
    open,
    openAt,
    onOpenChange,
    onChange,
}: Props) {
    const options = useFilterOptions();
    const inputRef = useRef<HTMLInputElement>(null);
    const [level, setLevel] = useState<FilterPropertyKey | null>(openAt);
    const [search, setSearch] = useState('');
    const [wasOpen, setWasOpen] = useState(open);

    // Each opening starts on the level asked for with a fresh search; the
    // reset happens on opening rather than closing, so the list does not
    // jump while the popover fades out.
    if (open !== wasOpen) {
        setWasOpen(open);

        if (open) {
            setLevel(openAt);
            setSearch('');
        }
    }

    const showLevel = (key: FilterPropertyKey | null) => {
        setLevel(key);
        setSearch('');
    };

    // Going back by button leaves the focus nowhere; typing should go on.
    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
        }
    }, [open, level]);

    const property =
        filterProperties.find((candidate) => candidate.key === level) ?? null;
    const count = activeFilterProperties(filters).length;

    const choose = (candidate: FilterProperty, value: FilterValue) => {
        onChange(toggleFilterValue(filters, candidate.key, value));

        if (candidate.single) {
            onOpenChange(false);
        }
    };

    const valueItems = (candidate: FilterProperty) => {
        const chosen = filterValues(filters, candidate.key);

        return options[candidate.key].map((option) => (
            <CommandItem
                key={String(option.value)}
                value={`${candidate.key}:${option.value}`}
                keywords={[option.label, candidate.label]}
                data-checked={chosen.includes(option.value)}
                onSelect={() => choose(candidate, option.value)}
            >
                {option.icon}
                {option.display ?? (
                    <span className="truncate">{option.label}</span>
                )}
            </CommandItem>
        ));
    };

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        size="xs"
                        data-test="filter-button"
                        aria-label={
                            count > 0 ? `Filter, ${count} in force` : 'Filter'
                        }
                    >
                        <ListFilter />
                        Filter
                        {count > 0 ? (
                            <span className="-mr-1 flex h-4 min-w-4 items-center justify-center bg-foreground px-1 text-[10px] leading-none text-background tabular-nums">
                                {count}
                            </span>
                        ) : null}
                    </Button>
                }
            />
            <PopoverContent
                align="start"
                className="w-64 gap-0 p-0"
                initialFocus={inputRef}
            >
                <Command
                    filter={filterByLabel}
                    className="outline-none"
                    onKeyDown={(event) => {
                        // Backspace on an empty search goes back a level.
                        if (
                            event.key === 'Backspace' &&
                            property !== null &&
                            search === ''
                        ) {
                            event.preventDefault();
                            showLevel(null);
                        }
                    }}
                >
                    {property ? (
                        <div className="flex items-center gap-1 border-b border-b-input px-1.5 py-1">
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Back to the properties"
                                onClick={() => showLevel(null)}
                            >
                                <ArrowLeft />
                            </Button>
                            <span className="flex min-w-0 items-center gap-2 text-xs font-semibold">
                                <FilterPropertyIcon
                                    property={property.key}
                                    className="size-3.5"
                                />
                                {property.label}
                            </span>
                            <span className="ml-auto text-[0.65rem] text-muted-foreground">
                                {property.single ? 'pick one' : 'any of'}
                            </span>
                        </div>
                    ) : null}
                    <CommandInput
                        ref={inputRef}
                        placeholder={property?.placeholder ?? 'Filter by...'}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>No results.</CommandEmpty>
                        {property ? (
                            <CommandGroup>{valueItems(property)}</CommandGroup>
                        ) : search.trim() === '' ? (
                            <CommandGroup>
                                {filterProperties.map((candidate) => {
                                    const chosen = filterValues(
                                        filters,
                                        candidate.key,
                                    ).length;

                                    return (
                                        <CommandItem
                                            key={candidate.key}
                                            value={`property:${candidate.key}`}
                                            keywords={[candidate.label]}
                                            onSelect={() =>
                                                showLevel(candidate.key)
                                            }
                                        >
                                            <FilterPropertyIcon
                                                property={candidate.key}
                                            />
                                            <span className="truncate">
                                                {candidate.label}
                                            </span>
                                            <CommandShortcut className="flex items-center gap-1.5 tracking-normal">
                                                {chosen > 0 ? (
                                                    <span className="flex h-4 min-w-4 items-center justify-center bg-foreground px-1 text-[10px] leading-none text-background tabular-nums">
                                                        {chosen}
                                                    </span>
                                                ) : null}
                                                <ChevronRight />
                                            </CommandShortcut>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        ) : (
                            filterProperties.map((candidate) => (
                                <CommandGroup
                                    key={candidate.key}
                                    heading={candidate.label}
                                >
                                    {valueItems(candidate)}
                                </CommandGroup>
                            ))
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
