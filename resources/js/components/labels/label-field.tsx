import { router } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { labelIcon, suggestLabelIcon } from '@/lib/label-icons';
import { cn } from '@/lib/utils';
import { store as storeLabel } from '@/routes/labels';
import { update as updateTaskLabels } from '@/routes/tasks/labels';
import type { Task } from '@/types';
import { IconPicker } from './icon-picker';
import { LabelBadge, useTeamLabels } from './label-badge';

export const MAX_LABELS = 5;

/**
 * The task sheet's _Labels_ row (spec 0007, round 7): the task's labels as
 * badges, and a menu with a search field and a checkbox per label. Each
 * tick saves at once. Typing a new name offers to create it with an icon.
 */
export function LabelField({
    teamSlug,
    task,
    disabled = false,
}: {
    teamSlug: string;
    task: Task;
    disabled?: boolean;
}) {
    const { labels, byId } = useTeamLabels();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const [icon, setIcon] = useState('tag');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const current = task.labelIds.flatMap((id) => byId.get(id) ?? []);
    const name = query.trim();
    const shown = labels.filter((label) =>
        label.name.toLowerCase().includes(name.toLowerCase()),
    );
    const exact = labels.some(
        (label) => label.name.toLowerCase() === name.toLowerCase(),
    );
    const full = task.labelIds.length >= MAX_LABELS;

    const reset = () => {
        setQuery('');
        setCreating(false);
        setError(null);
    };

    const toggle = (id: number) => {
        const on = task.labelIds.includes(id);

        if (!on && full) {
            return;
        }

        router.put(
            updateTaskLabels({ current_team: teamSlug, task: task.id }).url,
            {
                labels: on
                    ? task.labelIds.filter((other) => other !== id)
                    : [...task.labelIds, id],
            },
            { preserveScroll: true, preserveState: true },
        );
    };

    const startCreate = () => {
        setIcon(suggestLabelIcon(name));
        setError(null);
        setCreating(true);
    };

    const create = () => {
        setSaving(true);
        router.post(
            storeLabel({ current_team: teamSlug }).url,
            { name, icon, task_id: task.id },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: reset,
                onError: (errors) =>
                    setError(
                        errors.name ??
                            errors.icon ??
                            'Could not create the label.',
                    ),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 px-3">
            {current.map((label) => (
                <LabelBadge key={label.id} label={label} size="md" />
            ))}
            {disabled ? (
                current.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                        No labels
                    </span>
                )
            ) : (
                <Popover
                    open={open}
                    onOpenChange={(next) => {
                        setOpen(next);

                        if (!next) {
                            reset();
                        }
                    }}
                >
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            data-test="label-field"
                            aria-label="Edit labels"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-input px-2 text-[12.5px] font-semibold text-primary transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <Plus className="size-3.5" aria-hidden="true" />
                            {current.length === 0 ? 'Add label' : 'Add'}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="end"
                        collisionPadding={16}
                        className="w-80 rounded-2xl p-1.5"
                    >
                        {creating ? (
                            <div className="flex animate-pop flex-col gap-2.5 p-1.5">
                                <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                                    New label
                                    <LabelBadge
                                        label={{ id: 0, name, icon }}
                                        size="md"
                                    />
                                </div>
                                <IconPicker value={icon} onChange={setIcon} />
                                {error && (
                                    <p className="text-[12.5px] text-destructive">
                                        {error}
                                    </p>
                                )}
                                <div className="flex items-center justify-between border-t pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCreating(false)}
                                    >
                                        <ChevronLeft aria-hidden="true" />
                                        Back
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={saving}
                                        onClick={create}
                                        data-test="label-create"
                                    >
                                        Create and add
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Command shouldFilter={false}>
                                <CommandInput
                                    value={query}
                                    onValueChange={(value) =>
                                        setQuery(value.slice(0, 24))
                                    }
                                    placeholder="Search or create a label"
                                />
                                <CommandList className="max-h-72">
                                    {shown.length > 0 && (
                                        <CommandGroup>
                                            {shown.map((label) => {
                                                const Icon = labelIcon(
                                                    label.icon,
                                                );
                                                const on =
                                                    task.labelIds.includes(
                                                        label.id,
                                                    );

                                                return (
                                                    <CommandItem
                                                        key={label.id}
                                                        value={`label-${label.id}`}
                                                        disabled={!on && full}
                                                        onSelect={() =>
                                                            toggle(label.id)
                                                        }
                                                        className="gap-2.5 py-1.5"
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
                                                                <Check className="size-3 text-primary-foreground" />
                                                            )}
                                                        </span>
                                                        <span
                                                            aria-hidden="true"
                                                            className="flex size-6.5 shrink-0 items-center justify-center rounded-lg border text-foreground/75"
                                                        >
                                                            <Icon className="size-3.5" />
                                                        </span>
                                                        <span className="flex-1 truncate font-semibold">
                                                            {label.name}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {label.taskCount ===
                                                            1
                                                                ? '1 task'
                                                                : `${label.taskCount} tasks`}
                                                        </span>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    )}
                                    {name !== '' && !exact && (
                                        <CommandGroup className="border-t">
                                            <CommandItem
                                                value="create-label"
                                                onSelect={startCreate}
                                                className="gap-2.5"
                                                data-test="label-create-start"
                                            >
                                                <Plus
                                                    className="size-4 text-primary"
                                                    aria-hidden="true"
                                                />
                                                <span className="flex-1 truncate">
                                                    Create{' '}
                                                    <strong>“{name}”</strong>
                                                </span>
                                                <span className="inline-flex items-center text-xs text-muted-foreground">
                                                    Pick an icon
                                                    <ChevronRight
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            </CommandItem>
                                        </CommandGroup>
                                    )}
                                    {shown.length === 0 && name === '' && (
                                        <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                                            No labels yet. Type a name to create
                                            one.
                                        </p>
                                    )}
                                </CommandList>
                                <p className="flex justify-between border-t px-2.5 pt-2 pb-1 text-[11.5px] text-muted-foreground">
                                    <span>
                                        {task.labelIds.length} of {MAX_LABELS}{' '}
                                        on this task
                                    </span>
                                    {full && (
                                        <span>Remove one to add another</span>
                                    )}
                                </p>
                            </Command>
                        )}
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
