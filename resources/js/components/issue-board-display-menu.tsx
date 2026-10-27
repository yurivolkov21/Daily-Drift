import { SlidersHorizontal } from 'lucide-react';
import {
    DisplayOptionGroup,
    DisplayPropertyToggles,
} from '@/components/display-options';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useBoardDisplay } from '@/hooks/use-board-display';
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
                <DisplayOptionGroup
                    label="Card density"
                    options={densities}
                    value={display.density}
                    onChange={(density) => updateDisplay({ density })}
                />
                <DisplayOptionGroup
                    label="Swimlanes"
                    options={laneOptions}
                    value={display.lanes}
                    onChange={(lanes) => updateDisplay({ lanes })}
                />
                <DisplayPropertyToggles
                    label="Show on cards"
                    options={cardProperties}
                    hidden={display.hiddenProperties}
                    onChange={(hiddenProperties) =>
                        updateDisplay({ hiddenProperties })
                    }
                />
                <p className="text-xs text-muted-foreground">
                    Collapse a column with the arrow in its header, or a
                    swimlane by clicking its name.
                </p>
            </PopoverContent>
        </Popover>
    );
}
