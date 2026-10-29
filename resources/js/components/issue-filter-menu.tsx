import {
    CalendarClock,
    CalendarDays,
    CalendarX,
    CircleCheck,
    ListFilter,
    TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PropertyPicker } from '@/components/property-picker';
import type { PropertyOption } from '@/components/property-picker';
import { Button } from '@/components/ui/button';
import {
    activeDoneFilter,
    activeDueFilter,
    doneFilters,
    dueFilters,
} from '@/lib/issue-filters';
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

type Props = {
    filters: IssueFilters;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (changes: Partial<IssueFilters>) => void;
};

/**
 * The Filter button: a menu of the date filters in two groups, counting the
 * ones in force on the button. Choosing one again drops it.
 */
export function IssueFilterMenu({
    filters,
    open,
    onOpenChange,
    onChange,
}: Props) {
    const options: PropertyOption<string>[] = [
        ...dueFilters.map((option) => ({
            value: `due:${option.value}`,
            label: option.label,
            group: 'Due date',
            icon: <DateFilterIcon due={option.value} />,
        })),
        ...doneFilters.map((option) => ({
            value: `done:${option.value}`,
            label: option.label,
            group: 'Completed',
            icon: <DateFilterIcon done={option.value} />,
        })),
    ];
    const due = activeDueFilter(filters);
    const done = activeDoneFilter(filters);
    const selected = [
        ...(due ? [`due:${due.value}`] : []),
        ...(done ? [`done:${done.value}`] : []),
    ];

    return (
        <PropertyPicker
            trigger={
                <Button
                    variant="outline"
                    size="xs"
                    data-test="filter-button"
                    aria-label={
                        selected.length > 0
                            ? `Filter, ${selected.length} in force`
                            : 'Filter'
                    }
                >
                    <ListFilter />
                    Filter
                    {selected.length > 0 ? (
                        <span className="-mr-1 flex h-4 min-w-4 items-center justify-center bg-foreground px-1 text-[10px] leading-none text-background tabular-nums">
                            {selected.length}
                        </span>
                    ) : null}
                </Button>
            }
            options={options}
            selected={selected}
            onSelect={(value) => {
                const chosenDue = dueFilters.find(
                    (option) => `due:${option.value}` === value,
                );
                const chosenDone = doneFilters.find(
                    (option) => `done:${option.value}` === value,
                );

                if (chosenDue) {
                    onChange({
                        due:
                            filters.due === chosenDue.value
                                ? null
                                : chosenDue.value,
                    });
                } else if (chosenDone) {
                    onChange({
                        done:
                            filters.done === chosenDone.value
                                ? null
                                : chosenDone.value,
                    });
                }
            }}
            placeholder="Find a filter..."
            searchable={false}
            open={open}
            onOpenChange={onOpenChange}
            contentClassName="w-52"
        />
    );
}
