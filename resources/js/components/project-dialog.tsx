import { useForm, usePage } from '@inertiajs/react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { IssueDueDatePicker } from '@/components/issue-pickers';
import { ProjectAppearancePicker } from '@/components/project-appearance-picker';
import {
    projectStatusOptions,
    useLeadOptions,
} from '@/components/project-parts';
import { SelectMenu } from '@/components/select-menu';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { suggestProjectKey } from '@/lib/issues';
import { projectIconComponent } from '@/lib/project-icons';
import { formatTargetDate } from '@/lib/projects';
import { cn } from '@/lib/utils';
import { store, update } from '@/routes/projects';
import type { ProjectStatus, ProjectSummary } from '@/types';

type ProjectForm = {
    name: string;
    key: string;
    description: string;
    icon: string;
    color: string;
    status: ProjectStatus;
    lead_id: number | null;
    target_date: string | null;
};

export type ProjectDialogDefaults = { status?: ProjectStatus };

/**
 * Creates or edits a project. The header follows shadcnspace dialog-07: a
 * dotted field with the project's icon in nested frames, which opens the
 * icon and color picker.
 */
export function ProjectDialog({
    project = null,
    defaults = {},
    open,
    onOpenChange,
}: {
    project?: ProjectSummary | null;
    defaults?: ProjectDialogDefaults;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';
    const leadOptions = useLeadOptions();
    const [keyEdited, setKeyEdited] = useState(project !== null);
    const form = useForm<ProjectForm>({
        name: project?.name ?? '',
        key: project?.key ?? '',
        description: project?.description ?? '',
        icon: project?.icon ?? 'rocket',
        color: project?.color ?? '#5e6ad2',
        status: project?.status ?? defaults.status ?? 'planned',
        lead_id: project?.leadId ?? null,
        target_date: project?.targetDate ?? null,
    });
    const Glyph = projectIconComponent(form.data.icon);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (project) {
            form.patch(update.url([teamSlug, project.id]), options);
        } else {
            form.post(store.url(teamSlug), options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-md"
            >
                <div className="relative h-52 shrink-0 overflow-hidden bg-background bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[16px_16px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--background)_10%,transparent_70%)]" />
                    <DialogClose
                        render={
                            <Button
                                variant="secondary"
                                size="icon-sm"
                                className="absolute top-3 right-3 z-10"
                            />
                        }
                    >
                        <X />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <ProjectAppearancePicker
                            value={{
                                icon: form.data.icon,
                                color: form.data.color,
                            }}
                            onChange={(appearance) =>
                                form.setData((data) => ({
                                    ...data,
                                    ...appearance,
                                }))
                            }
                        >
                            <button
                                type="button"
                                aria-label="Change the icon and color"
                                data-test="project-appearance"
                                className="flex shrink-0 cursor-pointer items-center justify-center border bg-background p-3 transition-colors outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 data-popup-open:border-ring"
                            >
                                <span
                                    className="flex shrink-0 items-center justify-center border bg-background p-5"
                                    style={{ color: form.data.color }}
                                >
                                    <Glyph className="size-8" />
                                </span>
                            </button>
                        </ProjectAppearancePicker>
                        <div className="flex max-w-[calc(100%-2rem)] items-center gap-2 bg-background px-1 text-sm">
                            <span
                                className={cn(
                                    'truncate font-semibold',
                                    !form.data.name && 'text-muted-foreground',
                                )}
                            >
                                {form.data.name || 'Untitled project'}
                            </span>
                            <span className="shrink-0 border px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                                {form.data.key || 'KEY'}-1
                            </span>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={submit}
                    className="flex flex-col gap-5 px-6 pt-5 pb-6"
                >
                    <DialogHeader className="items-center text-center">
                        <DialogTitle className="text-2xl">
                            {project ? 'Edit project' : 'New project'}
                        </DialogTitle>
                        <DialogDescription className="text-base">
                            Click the icon to change it. The key starts every
                            issue number.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                        <div className="grid gap-2">
                            <Label htmlFor="project-name">Name</Label>
                            <Input
                                id="project-name"
                                data-test="project-name"
                                placeholder="Daily Drift"
                                value={form.data.name}
                                aria-invalid={Boolean(form.errors.name)}
                                onChange={(event) => {
                                    const name = event.target.value;

                                    form.setData((data) => ({
                                        ...data,
                                        name,
                                        key: keyEdited
                                            ? data.key
                                            : suggestProjectKey(name),
                                    }));
                                }}
                                autoFocus
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="project-key">Key</Label>
                            <Input
                                id="project-key"
                                data-test="project-key"
                                placeholder="DD"
                                maxLength={5}
                                className="uppercase"
                                value={form.data.key}
                                aria-invalid={Boolean(form.errors.key)}
                                onChange={(event) => {
                                    setKeyEdited(true);
                                    form.setData(
                                        'key',
                                        event.target.value.toUpperCase(),
                                    );
                                }}
                                required
                            />
                        </div>
                    </div>
                    <InputError message={form.errors.name} className="-mt-3" />
                    <InputError message={form.errors.key} className="-mt-3" />

                    <div className="grid gap-2">
                        <Label htmlFor="project-description">Description</Label>
                        <Textarea
                            id="project-description"
                            placeholder="What is this project about?"
                            className="min-h-20"
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                        />
                        <InputError message={form.errors.description} />
                    </div>

                    <div
                        role="group"
                        aria-label="Properties"
                        className="flex flex-wrap items-center gap-2"
                    >
                        <SelectMenu
                            size="sm"
                            label="Status"
                            value={form.data.status}
                            options={projectStatusOptions(project !== null)}
                            onChange={(status) =>
                                form.setData('status', status)
                            }
                        />
                        <SelectMenu
                            size="sm"
                            label="Lead"
                            value={form.data.lead_id}
                            options={leadOptions}
                            onChange={(leadId) =>
                                form.setData('lead_id', leadId)
                            }
                        />
                        <IssueDueDatePicker
                            value={form.data.target_date}
                            onChange={(date) =>
                                form.setData('target_date', date)
                            }
                            clearLabel="Clear target date"
                        >
                            <button
                                type="button"
                                aria-label="Target date"
                                className="flex h-7 max-w-60 min-w-0 items-center gap-2 border border-input bg-muted/50 px-2 text-left text-xs transition-[color,background-color,border-color,box-shadow] outline-none hover:bg-muted focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/20 data-popup-open:border-ring data-popup-open:bg-background [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3.5"
                            >
                                <CalendarDays
                                    className={cn(
                                        !form.data.target_date &&
                                            'text-muted-foreground',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'truncate',
                                        !form.data.target_date &&
                                            'text-muted-foreground',
                                    )}
                                >
                                    {form.data.target_date
                                        ? formatTargetDate(
                                              form.data.target_date,
                                          )
                                        : 'No target date'}
                                </span>
                                <ChevronDown className="ml-auto text-muted-foreground" />
                            </button>
                        </IssueDueDatePicker>
                    </div>
                    <InputError
                        message={
                            form.errors.icon ??
                            form.errors.color ??
                            form.errors.status ??
                            form.errors.lead_id ??
                            form.errors.target_date
                        }
                        className="-mt-3"
                    />

                    <div className="flex w-full flex-col gap-2 pt-1">
                        <Button
                            type="submit"
                            data-test="project-submit"
                            className="w-full"
                            disabled={form.processing}
                        >
                            {project ? 'Save' : 'Create project'}
                        </Button>
                        <DialogClose
                            render={
                                <Button variant="ghost" className="w-full" />
                            }
                        >
                            Not now
                        </DialogClose>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
