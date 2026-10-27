import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { toggled, useBoardDisplay } from '@/hooks/use-board-display';
import type {
    BoardDensity,
    BoardLanes,
    BoardProperty,
} from '@/hooks/use-board-display';

const densities: { value: BoardDensity; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'detailed', label: 'Detailed' },
];

const laneOptions: { value: BoardLanes; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'project', label: 'Project' },
    { value: 'assignee', label: 'Assignee' },
];

const cardProperties: { value: BoardProperty; label: string }[] = [
    { value: 'priority', label: 'Priority' },
    { value: 'labels', label: 'Labels' },
    { value: 'dueDate', label: 'Due date' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'progress', label: 'Sub-tasks' },
];

function OptionGroup<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div role="group" aria-label={label} className="flex border">
                {options.map((option) => (
                    <Button
                        key={option.value}
                        size="xs"
                        variant={value === option.value ? 'secondary' : 'ghost'}
                        aria-pressed={value === option.value}
                        onClick={() => onChange(option.value)}
                        className="flex-1"
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

/**
 * The board's display options: card density, swimlanes and what cards show.
 */
export function IssueBoardDisplayMenu() {
    const [display, updateDisplay] = useBoardDisplay();

    return (
        <Popover>
            <PopoverTrigger render={<Button variant="outline" size="xs" />}>
                <SlidersHorizontal />
                Display
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
                <OptionGroup
                    label="Card density"
                    options={densities}
                    value={display.density}
                    onChange={(density) => updateDisplay({ density })}
                />
                <OptionGroup
                    label="Swimlanes"
                    options={laneOptions}
                    value={display.lanes}
                    onChange={(lanes) => updateDisplay({ lanes })}
                />
                <div className="grid gap-2">
                    <span className="text-xs text-muted-foreground">
                        Show on cards
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {cardProperties.map((property) => {
                            const isShown = !display.hiddenProperties.includes(
                                property.value,
                            );

                            return (
                                <Button
                                    key={property.value}
                                    size="xs"
                                    variant={isShown ? 'secondary' : 'outline'}
                                    aria-pressed={isShown}
                                    onClick={() =>
                                        updateDisplay({
                                            hiddenProperties: toggled(
                                                display.hiddenProperties,
                                                property.value,
                                            ),
                                        })
                                    }
                                >
                                    {property.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Collapse a column with the arrow in its header, or a
                    swimlane by clicking its name.
                </p>
            </PopoverContent>
        </Popover>
    );
}
