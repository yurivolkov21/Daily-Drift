import { Form, Head, router, usePage } from '@inertiajs/react';
import { Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { IssueLabel } from '@/components/issue-label-chips';
import { LabelColorPicker } from '@/components/label-color-picker';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { labelColors } from '@/lib/issues';
import { destroy, index, store, update } from '@/routes/labels';
import type { IssueLabelSummary } from '@/types';

type Props = {
    labels: IssueLabelSummary[];
};

export default function LabelsSettings({ labels }: Props) {
    const team = usePage().props.currentTeam;
    const teamSlug = team?.slug ?? '';
    const [newColor, setNewColor] = useState(labelColors[0]);
    const [editedLabel, setEditedLabel] = useState<IssueLabelSummary | null>(
        null,
    );
    const [editedColor, setEditedColor] = useState(labelColors[0]);
    const [deletedLabel, setDeletedLabel] = useState<IssueLabelSummary | null>(
        null,
    );

    const startEditing = (label: IssueLabelSummary) => {
        setEditedLabel(label);
        setEditedColor(label.color);
    };

    return (
        <>
            <Head title="Labels" />

            <h1 className="sr-only">Labels</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Labels"
                    description={`Labels are shared by every project in ${team?.name ?? 'your team'}.`}
                />

                <Form
                    {...store.form(teamSlug)}
                    options={{ preserveScroll: true }}
                    resetOnSuccess={['name']}
                    className="grid gap-2"
                >
                    {({ errors, processing }) => (
                        <>
                            <Label htmlFor="new-label-name">New label</Label>
                            <div className="flex gap-2">
                                <LabelColorPicker
                                    value={newColor}
                                    onChange={setNewColor}
                                />
                                <input
                                    type="hidden"
                                    name="color"
                                    value={newColor}
                                />
                                <Input
                                    id="new-label-name"
                                    name="name"
                                    data-test="label-name"
                                    placeholder="Performance"
                                    required
                                />
                                <Button type="submit" disabled={processing}>
                                    Add
                                </Button>
                            </div>
                            <InputError message={errors.name} />
                            <InputError message={errors.color} />
                        </>
                    )}
                </Form>

                {labels.length === 0 ? (
                    <p className="border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No labels yet. Add one to tag issues across projects.
                    </p>
                ) : (
                    <div role="list" className="divide-y border">
                        {labels.map((label) =>
                            editedLabel?.id === label.id ? (
                                <Form
                                    key={label.id}
                                    {...update.form([teamSlug, label.id])}
                                    options={{ preserveScroll: true }}
                                    onSuccess={() => setEditedLabel(null)}
                                    role="listitem"
                                    className="grid gap-2 px-3.5 py-3"
                                >
                                    {({ errors, processing }) => (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <LabelColorPicker
                                                    value={editedColor}
                                                    onChange={setEditedColor}
                                                    className="size-8"
                                                />
                                                <input
                                                    type="hidden"
                                                    name="color"
                                                    value={editedColor}
                                                />
                                                <Input
                                                    name="name"
                                                    aria-label="Label name"
                                                    defaultValue={label.name}
                                                    className="h-8"
                                                    autoFocus
                                                    required
                                                />
                                                <Button
                                                    type="submit"
                                                    size="xs"
                                                    disabled={processing}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() =>
                                                        setEditedLabel(null)
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                            <InputError message={errors.name} />
                                        </>
                                    )}
                                </Form>
                            ) : (
                                <div
                                    key={label.id}
                                    role="listitem"
                                    data-test="label-row"
                                    className="flex items-center gap-3 px-3.5 py-3 text-sm"
                                >
                                    <span className="min-w-0 flex-1">
                                        <IssueLabel
                                            name={label.name}
                                            color={label.color}
                                        />
                                    </span>
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {label.issuesCount}{' '}
                                        {label.issuesCount === 1
                                            ? 'issue'
                                            : 'issues'}
                                    </span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    aria-label={`Actions for ${label.name}`}
                                                />
                                            }
                                        >
                                            <Ellipsis />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    startEditing(label)
                                                }
                                            >
                                                Edit label
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() =>
                                                    setDeletedLabel(label)
                                                }
                                            >
                                                Delete label
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={deletedLabel !== null}
                onOpenChange={(open) => !open && setDeletedLabel(null)}
                title={`Delete label ${deletedLabel?.name ?? ''}?`}
                description="The label will be removed from every issue that uses it."
                confirmLabel="Delete label"
                onConfirm={() => {
                    if (deletedLabel) {
                        router.delete(
                            destroy.url([teamSlug, deletedLabel.id]),
                            {
                                preserveScroll: true,
                                onSuccess: () => setDeletedLabel(null),
                            },
                        );
                    }
                }}
            />
        </>
    );
}

LabelsSettings.layout = {
    breadcrumbs: [
        {
            title: 'Labels',
            href: index(),
        },
    ],
};
