import { Link, useForm, usePage } from '@inertiajs/react';
import { CalendarDays, Tag, UserRound } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';
import InputError from '@/components/input-error';
import {
    IssueAssigneePicker,
    IssueDueDatePicker,
    IssueLabelPicker,
    IssuePriorityPicker,
    IssueProjectPicker,
    IssueStatusPicker,
} from '@/components/issue-pickers';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { MemberAvatar } from '@/components/member-avatar';
import { PropertyButton } from '@/components/property-button';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { Textarea } from '@/components/ui/textarea';
import type { CreateIssueDefaults } from '@/hooks/use-issue-tracker';
import { formatDueDate, priorityLabel, statusLabel } from '@/lib/issues';
import { store } from '@/routes/issues';
import { index as projectsIndex } from '@/routes/projects';
import type { IssuePriority, IssueStatus } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaults: CreateIssueDefaults;
};

type CreateIssueForm = {
    project_id: string;
    title: string;
    description: string;
    status: IssueStatus;
    priority: IssuePriority;
    assignee_id: number | null;
    due_date: string | null;
    label_ids: string[];
};

export function CreateIssueDialog({ open, onOpenChange, defaults }: Props) {
    const page = usePage();
    const team = page.props.currentTeam;
    const projects = page.props.workspace?.projects ?? [];
    const members = page.props.workspace?.members ?? [];
    const labels = page.props.workspace?.labels ?? [];

    const form = useForm<CreateIssueForm>({
        project_id: defaults.projectId ?? projects[0]?.id ?? '',
        title: '',
        description: '',
        status: defaults.status ?? 'backlog',
        priority: defaults.priority ?? 0,
        assignee_id: defaults.assigneeId ?? null,
        due_date: null,
        label_ids: [],
    });

    const project = projects.find(({ id }) => id === form.data.project_id);
    const assignee = members.find(({ id }) => id === form.data.assignee_id);
    const selectedLabels = labels.filter(({ id }) =>
        form.data.label_ids.includes(id),
    );

    const submit = (event: FormEvent | KeyboardEvent) => {
        event.preventDefault();

        if (!team || form.processing) {
            return;
        }

        form.post(store.url(team.slug), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 p-0 sm:max-w-2xl">
                {projects.length === 0 ? (
                    <div className="grid gap-4 p-6">
                        <DialogHeader>
                            <DialogTitle>Create a project first</DialogTitle>
                            <DialogDescription>
                                Issues belong to a project, and the project key
                                becomes the issue prefix, like DD-1.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                nativeButton={false}
                                render={
                                    <Link
                                        href={projectsIndex(team?.slug ?? '')}
                                    />
                                }
                                onClick={() => onOpenChange(false)}
                            >
                                Go to projects
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form
                        onSubmit={submit}
                        onKeyDown={(event) => {
                            if (
                                event.key === 'Enter' &&
                                (event.metaKey || event.ctrlKey)
                            ) {
                                submit(event);
                            }
                        }}
                    >
                        <DialogHeader className="flex-row items-center gap-2 px-4 pt-4 pr-14">
                            <IssueProjectPicker
                                value={form.data.project_id}
                                onChange={(projectId) =>
                                    form.setData('project_id', projectId)
                                }
                            >
                                <PropertyButton className="font-semibold">
                                    {project?.key ?? 'Project'}
                                </PropertyButton>
                            </IssueProjectPicker>
                            <DialogTitle className="text-xs">
                                New issue
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Create a new issue in {project?.name}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-2 px-4 py-4">
                            <input
                                autoFocus
                                aria-label="Issue title"
                                placeholder="Issue title"
                                value={form.data.title}
                                onChange={(event) =>
                                    form.setData('title', event.target.value)
                                }
                                className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
                            />
                            <InputError message={form.errors.title} />
                            <Textarea
                                aria-label="Issue description"
                                placeholder="Add description..."
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                                className="max-h-64 min-h-20 border-0 py-1"
                            />
                            <InputError message={form.errors.description} />
                        </div>

                        <div className="flex flex-wrap gap-1.5 px-4 pb-4">
                            <IssueStatusPicker
                                value={form.data.status}
                                onChange={(status) =>
                                    form.setData('status', status)
                                }
                            >
                                <PropertyButton>
                                    <IssueStatusIcon
                                        status={form.data.status}
                                    />
                                    {statusLabel(form.data.status)}
                                </PropertyButton>
                            </IssueStatusPicker>

                            <IssuePriorityPicker
                                value={form.data.priority}
                                onChange={(priority) =>
                                    form.setData('priority', priority)
                                }
                            >
                                <PropertyButton>
                                    <IssuePriorityIcon
                                        priority={form.data.priority}
                                    />
                                    {form.data.priority === 0
                                        ? 'Priority'
                                        : priorityLabel(form.data.priority)}
                                </PropertyButton>
                            </IssuePriorityPicker>

                            <IssueAssigneePicker
                                value={form.data.assignee_id}
                                onChange={(assigneeId) =>
                                    form.setData('assignee_id', assigneeId)
                                }
                            >
                                <PropertyButton>
                                    {assignee ? (
                                        <MemberAvatar
                                            name={assignee.name}
                                            className="size-4"
                                        />
                                    ) : (
                                        <UserRound />
                                    )}
                                    {assignee?.name ?? 'Assignee'}
                                </PropertyButton>
                            </IssueAssigneePicker>

                            <IssueLabelPicker
                                value={form.data.label_ids}
                                onChange={(labelIds) =>
                                    form.setData('label_ids', labelIds)
                                }
                            >
                                <PropertyButton>
                                    <Tag />
                                    {selectedLabels.length === 0
                                        ? 'Labels'
                                        : selectedLabels
                                              .map(({ name }) => name)
                                              .join(', ')}
                                </PropertyButton>
                            </IssueLabelPicker>

                            <IssueDueDatePicker
                                value={form.data.due_date}
                                onChange={(dueDate) =>
                                    form.setData('due_date', dueDate)
                                }
                            >
                                <PropertyButton>
                                    <CalendarDays />
                                    {form.data.due_date
                                        ? formatDueDate(form.data.due_date)
                                        : 'Due date'}
                                </PropertyButton>
                            </IssueDueDatePicker>
                        </div>

                        <div className="grid gap-1 px-4 empty:hidden">
                            <InputError message={form.errors.project_id} />
                            <InputError message={form.errors.status} />
                            <InputError message={form.errors.priority} />
                            <InputError message={form.errors.assignee_id} />
                            <InputError message={form.errors.due_date} />
                            <InputError message={form.errors.label_ids} />
                        </div>

                        <DialogFooter className="items-center border-t px-4 py-3">
                            <span className="mr-auto hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                                <Kbd>Ctrl</Kbd>
                                <Kbd>Enter</Kbd>
                                to create
                            </span>
                            <DialogClose
                                render={
                                    <Button variant="secondary" size="sm" />
                                }
                            >
                                Cancel
                            </DialogClose>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={form.processing}
                            >
                                Create issue
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
