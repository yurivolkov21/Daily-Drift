import { router } from '@inertiajs/react';
import { Check, Pencil, Smile, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { destroy, update } from '@/routes/labels';
import type { TeamLabel } from '@/types';
import { IconPicker } from './icon-picker';
import { LabelBadge } from './label-badge';

/**
 * The team settings' _Labels_ block (spec 0007): every label with its icon
 * and how many tasks use it. Owners and admins rename it, change its icon
 * or delete it; anyone creates labels from a task.
 */
export function TeamLabels({
    teamSlug,
    labels,
    canManage,
}: {
    teamSlug: string;
    labels: TeamLabel[];
    canManage: boolean;
}) {
    const [deleting, setDeleting] = useState<TeamLabel | null>(null);

    return (
        <div className="flex flex-col gap-1" data-test="team-labels">
            <h3 className="mb-0.5 text-[14.5px] font-bold">
                Labels{' '}
                <span className="font-medium text-muted-foreground">
                    {labels.length}
                </span>
            </h3>
            <p className="mb-1.5 text-[12.5px] text-muted-foreground">
                Shared by every project. Anyone creates a label from a task;
                {canManage
                    ? ' you can rename it, change its icon or delete it here.'
                    : ' owners and admins rename, change and delete them.'}
            </p>
            {labels.length === 0 ? (
                <p className="rounded-xl bg-muted px-4 py-5 text-center text-[13px] text-muted-foreground">
                    No labels yet. Open a task and use its Labels row to create
                    one.
                </p>
            ) : (
                <ul className="flex flex-col gap-1">
                    {labels.map((label) => (
                        <LabelRow
                            key={label.id}
                            teamSlug={teamSlug}
                            label={label}
                            canManage={canManage}
                            onDelete={() => setDeleting(label)}
                        />
                    ))}
                </ul>
            )}

            <AlertDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete the label “{deleting?.name}”?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleting?.taskCount
                                ? `It comes off ${deleting.taskCount === 1 ? '1 task' : `${deleting.taskCount} tasks`} in every project. This cannot be undone.`
                                : 'No task uses it. This cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                            data-test="label-delete-confirm"
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() =>
                                deleting &&
                                router.delete(
                                    destroy({
                                        current_team: teamSlug,
                                        label: deleting.id,
                                    }).url,
                                    {
                                        preserveScroll: true,
                                        onFinish: () => setDeleting(null),
                                    },
                                )
                            }
                        >
                            Delete label
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function LabelRow({
    teamSlug,
    label,
    canManage,
    onDelete,
}: {
    teamSlug: string;
    label: TeamLabel;
    canManage: boolean;
    onDelete: () => void;
}) {
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState(label.name);
    const [error, setError] = useState<string | null>(null);
    const [iconOpen, setIconOpen] = useState(false);
    const url = update({ current_team: teamSlug, label: label.id }).url;

    const save = (data: { name?: string; icon?: string }, done?: () => void) =>
        router.patch(url, data, {
            preserveScroll: true,
            onSuccess: () => {
                setError(null);
                done?.();
            },
            onError: (errors) => setError(errors.name ?? errors.icon ?? null),
        });

    return (
        <li className="flex flex-col gap-1 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60">
            <div className="flex flex-wrap items-center gap-2.5">
                {renaming ? (
                    <form
                        className="flex flex-1 items-center gap-1.5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            save({ name }, () => setRenaming(false));
                        }}
                    >
                        <Input
                            autoFocus
                            value={name}
                            maxLength={24}
                            onChange={(event) => setName(event.target.value)}
                            aria-label={`New name for ${label.name}`}
                            className="h-8 max-w-56"
                        />
                        <Button
                            type="submit"
                            size="icon-sm"
                            aria-label="Save the name"
                        >
                            <Check />
                        </Button>
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Cancel"
                            onClick={() => {
                                setRenaming(false);
                                setName(label.name);
                                setError(null);
                            }}
                        >
                            <X />
                        </Button>
                    </form>
                ) : (
                    <LabelBadge label={label} size="md" />
                )}
                <span className="text-[12.5px] text-muted-foreground">
                    {label.taskCount === 1
                        ? '1 task'
                        : `${label.taskCount} tasks`}
                </span>
                {canManage && !renaming && (
                    <span className="ml-auto flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRenaming(true)}
                            aria-label={`Rename ${label.name}`}
                        >
                            <Pencil />
                            Rename
                        </Button>
                        <Popover open={iconOpen} onOpenChange={setIconOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Change the icon of ${label.name}`}
                                >
                                    <Smile />
                                    Change icon
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="end"
                                className="w-80 rounded-2xl p-3"
                            >
                                <IconPicker
                                    value={label.icon}
                                    onChange={(icon) =>
                                        save({ icon }, () => setIconOpen(false))
                                    }
                                />
                            </PopoverContent>
                        </Popover>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            aria-label={`Delete ${label.name}`}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 />
                            Delete
                        </Button>
                    </span>
                )}
            </div>
            {error && (
                <p className="px-1 text-[12.5px] text-destructive">{error}</p>
            )}
        </li>
    );
}
