import { router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { Plus, UserRound } from 'lucide-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { MemberAvatar } from '@/components/member-avatar';
import { PropertyPicker } from '@/components/property-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { issuePriorities, issueStatuses, labelColors } from '@/lib/issues';
import { store as storeLabel } from '@/routes/labels';
import type { IssuePriority, IssueStatus } from '@/types';

type PickerProps<TValue> = {
    value: TValue;
    onChange: (value: TValue) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactElement;
};

export function IssueStatusPicker({
    value,
    onChange,
    open,
    onOpenChange,
    children,
}: PickerProps<IssueStatus>) {
    return (
        <PropertyPicker
            trigger={children}
            placeholder="Change status..."
            options={issueStatuses.map((status) => ({
                value: status.value,
                label: status.label,
                icon: <IssueStatusIcon status={status.value} />,
            }))}
            selected={[value]}
            onSelect={onChange}
            open={open}
            onOpenChange={onOpenChange}
        />
    );
}

export function IssuePriorityPicker({
    value,
    onChange,
    open,
    onOpenChange,
    children,
}: PickerProps<IssuePriority>) {
    return (
        <PropertyPicker
            trigger={children}
            placeholder="Set priority..."
            options={issuePriorities.map((priority) => ({
                value: priority.value,
                label: priority.label,
                icon: <IssuePriorityIcon priority={priority.value} />,
            }))}
            selected={[value]}
            onSelect={onChange}
            open={open}
            onOpenChange={onOpenChange}
        />
    );
}

export function IssueAssigneePicker({
    value,
    onChange,
    open,
    onOpenChange,
    children,
}: PickerProps<number | null>) {
    const members = usePage().props.workspace?.members ?? [];

    return (
        <PropertyPicker
            trigger={children}
            placeholder="Assign to..."
            options={[
                {
                    value: null,
                    label: 'No assignee',
                    icon: <UserRound className="text-muted-foreground" />,
                },
                ...members.map((member) => ({
                    value: member.id,
                    label: member.name,
                    icon: (
                        <MemberAvatar name={member.name} className="size-4" />
                    ),
                })),
            ]}
            selected={[value]}
            onSelect={onChange}
            open={open}
            onOpenChange={onOpenChange}
        />
    );
}

export function IssueProjectPicker({
    value,
    onChange,
    open,
    onOpenChange,
    children,
}: PickerProps<string>) {
    const projects = usePage().props.workspace?.projects ?? [];

    return (
        <PropertyPicker
            trigger={children}
            placeholder="Move to project..."
            options={projects.map((project) => ({
                value: project.id,
                label: project.name,
                icon: (
                    <span className="w-9 shrink-0 text-[0.65rem] font-semibold text-muted-foreground">
                        {project.key}
                    </span>
                ),
            }))}
            selected={[value]}
            onSelect={onChange}
            open={open}
            onOpenChange={onOpenChange}
        />
    );
}

export function IssueLabelPicker({
    value,
    onChange,
    open,
    onOpenChange,
    children,
}: PickerProps<string[]>) {
    const page = usePage();
    const labels = page.props.workspace?.labels ?? [];

    const toggle = (labelId: string) => {
        onChange(
            value.includes(labelId)
                ? value.filter((id) => id !== labelId)
                : [...value, labelId],
        );
    };

    const createLabel = (name: string) => {
        router.post(
            storeLabel.url(page.props.currentTeam?.slug ?? ''),
            {
                name,
                color: labelColors[
                    Math.floor(Math.random() * labelColors.length)
                ],
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: (nextPage) => {
                    const label = nextPage.props.workspace?.labels.find(
                        (candidate) => candidate.name === name,
                    );

                    if (label) {
                        onChange([...value, label.id]);
                    }
                },
            },
        );
    };

    return (
        <PropertyPicker
            trigger={children}
            placeholder="Add labels..."
            multiple
            options={labels.map((label) => ({
                value: label.id,
                label: label.name,
                icon: (
                    <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                    />
                ),
            }))}
            selected={value}
            onSelect={toggle}
            open={open}
            onOpenChange={onOpenChange}
            renderExtra={(search, clearSearch) => {
                const name = search.trim();

                if (
                    name === '' ||
                    labels.some(
                        (label) =>
                            label.name.toLowerCase() === name.toLowerCase(),
                    )
                ) {
                    return null;
                }

                return (
                    <CommandGroup>
                        <CommandItem
                            value={`create-label:${name}`}
                            keywords={[name]}
                            onSelect={() => {
                                createLabel(name);
                                clearSearch();
                            }}
                        >
                            <Plus />
                            <span className="truncate">
                                Create label "{name}"
                            </span>
                        </CommandItem>
                    </CommandGroup>
                );
            }}
        />
    );
}

export function IssueDueDatePicker({
    value,
    onChange,
    open: controlledOpen,
    onOpenChange,
    children,
}: PickerProps<string | null>) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = onOpenChange ?? setUncontrolledOpen;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={children} />
            <PopoverContent align="start" className="w-auto gap-0 p-0">
                <Calendar
                    mode="single"
                    autoFocus
                    selected={value ? parseISO(value) : undefined}
                    onSelect={(date) => {
                        onChange(date ? format(date, 'yyyy-MM-dd') : null);
                        setOpen(false);
                    }}
                />
                {value ? (
                    <div className="border-t p-2">
                        <Button
                            variant="ghost"
                            size="xs"
                            className="w-full"
                            onClick={() => {
                                onChange(null);
                                setOpen(false);
                            }}
                        >
                            Clear due date
                        </Button>
                    </div>
                ) : null}
            </PopoverContent>
        </Popover>
    );
}
