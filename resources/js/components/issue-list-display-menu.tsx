import {
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    SlidersHorizontal,
} from 'lucide-react';
import {
    DisplayPropertyToggles,
    DisplaySelect,
} from '@/components/display-options';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useListDisplay } from '@/hooks/use-list-display';
import type {
    ListGrouping,
    ListOrdering,
    ListProperty,
} from '@/hooks/use-list-display';

const groupings: { value: ListGrouping; label: string }[] = [
    { value: 'status', label: 'Status' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'project', label: 'Project' },
    { value: 'priority', label: 'Priority' },
    { value: 'none', label: 'No grouping' },
];

const orderings: { value: ListOrdering; label: string }[] = [
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due date' },
    { value: 'updated', label: 'Last updated' },
    { value: 'created', label: 'Created' },
    { value: 'identifier', label: 'ID' },
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'progress', label: 'Sub-tasks done' },
    { value: 'comments', label: 'Comments' },
];

const listProperties: { value: ListProperty; label: string }[] = [
    { value: 'identifier', label: 'ID' },
    { value: 'priority', label: 'Priority' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'labels', label: 'Labels' },
    { value: 'dueDate', label: 'Due date' },
    { value: 'progress', label: 'Sub-tasks' },
    { value: 'comments', label: 'Comments' },
    { value: 'updated', label: 'Updated' },
];

/**
 * The list's display options: grouping, ordering and the columns shown.
 */
export function IssueListDisplayMenu() {
    const [display, updateDisplay] = useListDisplay();

    return (
        <Popover>
            <PopoverTrigger render={<Button variant="outline" size="xs" />}>
                <SlidersHorizontal />
                Display
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <DisplaySelect
                    id="list-grouping"
                    label="Grouping"
                    options={groupings}
                    value={display.grouping}
                    onChange={(grouping) => updateDisplay({ grouping })}
                    className="w-full"
                />
                <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                        <DisplaySelect
                            id="list-ordering"
                            label="Ordering"
                            options={orderings}
                            value={display.ordering}
                            onChange={(ordering) =>
                                updateDisplay({ ordering, reversed: false })
                            }
                            className="w-full"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-pressed={display.reversed}
                        aria-label="Reverse the order"
                        title="Reverse the order"
                        onClick={() =>
                            updateDisplay({ reversed: !display.reversed })
                        }
                    >
                        {display.reversed ? (
                            <ArrowUpNarrowWide />
                        ) : (
                            <ArrowDownWideNarrow />
                        )}
                    </Button>
                </div>
                <DisplayPropertyToggles
                    label="Columns"
                    options={listProperties}
                    hidden={display.hiddenProperties}
                    onChange={(hiddenProperties) =>
                        updateDisplay({ hiddenProperties })
                    }
                />
                <p className="text-xs text-muted-foreground">
                    Click a column title to sort by it, or a group's name to
                    collapse it.
                </p>
            </PopoverContent>
        </Popover>
    );
}
