import { Head, router, usePage } from '@inertiajs/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { CalendarDays, Copy, Tag, Trash2, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { IssueActivityTimeline } from '@/components/issue-activity-timeline';
import { IssueLabelChips } from '@/components/issue-label-chips';
import {
    IssueAssigneePicker,
    IssueDueDatePicker,
    IssueLabelPicker,
    IssuePriorityPicker,
    IssueStatusPicker,
} from '@/components/issue-pickers';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { IssueSubtasks } from '@/components/issue-subtasks';
import { MemberAvatar } from '@/components/member-avatar';
import { PropertyButton } from '@/components/property-button';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { usePaletteActions } from '@/hooks/use-issue-tracker';
import { useUpdateIssue } from '@/hooks/use-update-issue';
import { buildTimeline } from '@/lib/issue-activity';
import {
    formatDueDate,
    isOverdue,
    priorityLabel,
    statusLabel,
} from '@/lib/issues';
import { cn } from '@/lib/utils';
import { destroy, index, show } from '@/routes/issues';
import type {
    Issue,
    IssueActivity,
    IssueActivityFilter,
    IssueComment,
    IssueSubtask,
} from '@/types';

type Props = {
    issue: Issue;
    comments: IssueComment[];
    activities: IssueActivity[];
    subtasks: IssueSubtask[];
};

type Picker = 'status' | 'priority' | 'assignee' | 'labels' | 'dueDate';

const activityFilters: { value: IssueActivityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'comments', label: 'Comments' },
    { value: 'history', label: 'History' },
];

function PropertyRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[6rem_1fr] items-center gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="min-w-0">{children}</div>
        </div>
    );
}

export default function IssueShow({
    issue,
    comments,
    activities,
    subtasks,
}: Props) {
    const page = usePage();
    const updateIssue = useUpdateIssue();
    const teamSlug = page.props.currentTeam?.slug ?? '';
    const project = page.props.workspace?.projects.find(
        ({ id }) => id === issue.projectId,
    );
    const currentUser = page.props.auth.user;
    const [openPicker, setOpenPicker] = useState<Picker | null>(null);
    const [title, setTitle] = useState(issue.title);
    const [description, setDescription] = useState(issue.description ?? '');
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activityFilter, setActivityFilter] =
        useState<IssueActivityFilter>('all');
    const timeline = buildTimeline(comments, activities);

    const pickerState = (picker: Picker) => ({
        open: openPicker === picker,
        onOpenChange: (open: boolean) => setOpenPicker(open ? picker : null),
    });

    const saveTitle = () => {
        const trimmedTitle = title.trim();

        if (trimmedTitle === '') {
            setTitle(issue.title);

            return;
        }

        if (trimmedTitle !== issue.title) {
            updateIssue(issue, { title: trimmedTitle });
        }
    };

    const saveDescription = () => {
        if (description !== (issue.description ?? '')) {
            updateIssue(issue, { description: description || null });
        }
    };

    const assignToMe = () =>
        updateIssue(issue, { assignee_id: currentUser.id });

    const copyIdentifier = () => {
        void navigator.clipboard.writeText(issue.identifier);
        toast.success(`Copied ${issue.identifier}`);
    };

    const deleteIssue = () => {
        router.delete(destroy.url([teamSlug, issue.identifier]), {
            onStart: () => setDeleting(true),
            onFinish: () => setDeleting(false),
        });
    };

    useHotkeys([
        { keys: 's', handler: () => setOpenPicker('status') },
        { keys: 'p', handler: () => setOpenPicker('priority') },
        { keys: 'a', handler: () => setOpenPicker('assignee') },
        { keys: 'l', handler: () => setOpenPicker('labels') },
        { keys: 'd', handler: () => setOpenPicker('dueDate') },
        { keys: 'i', handler: assignToMe },
    ]);

    usePaletteActions([
        {
            id: 'status',
            label: 'Change status...',
            icon: <IssueStatusIcon status={issue.status} />,
            shortcut: 'S',
            onSelect: () => setOpenPicker('status'),
        },
        {
            id: 'priority',
            label: 'Change priority...',
            icon: <IssuePriorityIcon priority={issue.priority} />,
            shortcut: 'P',
            onSelect: () => setOpenPicker('priority'),
        },
        {
            id: 'assignee',
            label: 'Assign to...',
            icon: <UserRound />,
            shortcut: 'A',
            onSelect: () => setOpenPicker('assignee'),
        },
        {
            id: 'assign-to-me',
            label: 'Assign to me',
            icon: <UserRound />,
            shortcut: 'I',
            onSelect: assignToMe,
        },
        {
            id: 'labels',
            label: 'Change labels...',
            icon: <Tag />,
            shortcut: 'L',
            onSelect: () => setOpenPicker('labels'),
        },
        {
            id: 'due-date',
            label: 'Set due date...',
            icon: <CalendarDays />,
            shortcut: 'D',
            onSelect: () => setOpenPicker('dueDate'),
        },
        {
            id: 'copy-identifier',
            label: `Copy ${issue.identifier}`,
            icon: <Copy />,
            onSelect: copyIdentifier,
        },
        {
            id: 'delete',
            label: 'Delete issue...',
            icon: <Trash2 />,
            onSelect: () => setConfirmingDelete(true),
        },
    ]);

    return (
        <>
            <Head title={`${issue.identifier} ${issue.title}`} />

            <div className="flex flex-1 flex-col lg:flex-row">
                <div className="flex min-w-0 flex-1 flex-col gap-4 p-6 lg:p-10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{project?.name}</span>
                        <span>/</span>
                        <button
                            type="button"
                            className="hover:text-foreground"
                            onClick={copyIdentifier}
                        >
                            {issue.identifier}
                        </button>
                    </div>

                    <Textarea
                        aria-label="Issue title"
                        rows={1}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                event.currentTarget.blur();
                            }
                        }}
                        className="-mx-2 min-h-0 w-[calc(100%+1rem)] border-transparent bg-transparent px-2 py-1 text-2xl font-semibold hover:border-input hover:bg-muted/50 md:text-2xl"
                    />

                    <Textarea
                        aria-label="Issue description"
                        placeholder="Add description..."
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        onBlur={saveDescription}
                        className="min-h-40 text-sm leading-relaxed"
                    />

                    <IssueSubtasks
                        issueIdentifier={issue.identifier}
                        subtasks={subtasks}
                    />

                    <section
                        aria-labelledby="issue-activity-heading"
                        className="mt-6 grid gap-5 border-t pt-6"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2
                                id="issue-activity-heading"
                                className="text-xs font-semibold tracking-wider uppercase"
                            >
                                Activity
                            </h2>
                            <div
                                role="group"
                                aria-label="Show in activity"
                                className="flex border"
                            >
                                {activityFilters.map((option) => (
                                    <Button
                                        key={option.value}
                                        size="xs"
                                        variant={
                                            activityFilter === option.value
                                                ? 'secondary'
                                                : 'ghost'
                                        }
                                        aria-pressed={
                                            activityFilter === option.value
                                        }
                                        onClick={() =>
                                            setActivityFilter(option.value)
                                        }
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <IssueActivityTimeline
                            entries={timeline}
                            issueIdentifier={issue.identifier}
                            filter={activityFilter}
                        />
                    </section>
                </div>

                <aside className="grid w-full content-start gap-3 border-t p-6 lg:w-80 lg:border-t-0 lg:border-l">
                    <PropertyRow label="Status">
                        <IssueStatusPicker
                            value={issue.status}
                            onChange={(status) =>
                                updateIssue(issue, { status })
                            }
                            {...pickerState('status')}
                        >
                            <PropertyButton
                                variant="ghost"
                                data-test="issue-status"
                                className="w-full"
                            >
                                <IssueStatusIcon status={issue.status} />
                                {statusLabel(issue.status)}
                            </PropertyButton>
                        </IssueStatusPicker>
                    </PropertyRow>

                    <PropertyRow label="Priority">
                        <IssuePriorityPicker
                            value={issue.priority}
                            onChange={(priority) =>
                                updateIssue(issue, { priority })
                            }
                            {...pickerState('priority')}
                        >
                            <PropertyButton variant="ghost" className="w-full">
                                <IssuePriorityIcon priority={issue.priority} />
                                {priorityLabel(issue.priority)}
                            </PropertyButton>
                        </IssuePriorityPicker>
                    </PropertyRow>

                    <PropertyRow label="Assignee">
                        <IssueAssigneePicker
                            value={issue.assignee?.id ?? null}
                            onChange={(assigneeId) =>
                                updateIssue(issue, { assignee_id: assigneeId })
                            }
                            {...pickerState('assignee')}
                        >
                            <PropertyButton
                                variant="ghost"
                                data-test="issue-assignee"
                                className="w-full"
                            >
                                {issue.assignee ? (
                                    <MemberAvatar
                                        name={issue.assignee.name}
                                        className="size-4"
                                    />
                                ) : (
                                    <UserRound />
                                )}
                                <span className="truncate">
                                    {issue.assignee?.name ?? 'Unassigned'}
                                </span>
                            </PropertyButton>
                        </IssueAssigneePicker>
                    </PropertyRow>

                    <PropertyRow label="Labels">
                        <IssueLabelPicker
                            value={issue.labelIds ?? []}
                            onChange={(labelIds) =>
                                updateIssue(issue, { label_ids: labelIds })
                            }
                            {...pickerState('labels')}
                        >
                            <PropertyButton
                                variant="ghost"
                                className="h-auto min-h-7 w-full flex-wrap py-1"
                            >
                                {(issue.labelIds ?? []).length > 0 ? (
                                    <IssueLabelChips
                                        labelIds={issue.labelIds}
                                    />
                                ) : (
                                    <>
                                        <Tag />
                                        Add labels
                                    </>
                                )}
                            </PropertyButton>
                        </IssueLabelPicker>
                    </PropertyRow>

                    <PropertyRow label="Due date">
                        <IssueDueDatePicker
                            value={issue.dueDate}
                            onChange={(dueDate) =>
                                updateIssue(issue, { due_date: dueDate })
                            }
                            {...pickerState('dueDate')}
                        >
                            <PropertyButton
                                variant="ghost"
                                className={cn(
                                    'w-full',
                                    isOverdue(issue) && 'text-destructive',
                                )}
                            >
                                <CalendarDays />
                                {issue.dueDate
                                    ? formatDueDate(issue.dueDate)
                                    : 'No due date'}
                            </PropertyButton>
                        </IssueDueDatePicker>
                    </PropertyRow>

                    <PropertyRow label="Project">
                        <span className="px-2 text-xs">
                            {project ? `${project.key} · ${project.name}` : ''}
                        </span>
                    </PropertyRow>

                    <PropertyRow label="Created">
                        <span className="px-2 text-xs text-muted-foreground">
                            {issue.creator?.name ?? 'Someone'},{' '}
                            {formatDistanceToNow(parseISO(issue.createdAt), {
                                addSuffix: true,
                            })}
                        </span>
                    </PropertyRow>

                    <Button
                        variant="ghost"
                        size="xs"
                        data-test="delete-issue-button"
                        className="mt-4 justify-start text-destructive"
                        onClick={() => setConfirmingDelete(true)}
                    >
                        <Trash2 />
                        Delete issue
                    </Button>
                </aside>
            </div>

            <ConfirmDialog
                open={confirmingDelete}
                onOpenChange={setConfirmingDelete}
                title={`Delete ${issue.identifier}?`}
                description="The issue and its labels will be removed for everyone in the team. This cannot be undone."
                confirmLabel="Delete issue"
                processing={deleting}
                onConfirm={deleteIssue}
            />
        </>
    );
}

IssueShow.layout = (props: {
    currentTeam?: { slug: string } | null;
    issue: Issue;
}) => ({
    breadcrumbs: [
        {
            title: 'Issues',
            href: index(props.currentTeam?.slug ?? ''),
        },
        {
            title: props.issue.identifier,
            href: show([props.currentTeam?.slug ?? '', props.issue.identifier]),
        },
    ],
});
