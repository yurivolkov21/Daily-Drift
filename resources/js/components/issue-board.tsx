import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { DragEvent } from 'react';
import { useState } from 'react';
import { IssueLabelChips } from '@/components/issue-label-chips';
import { IssuePriorityPicker } from '@/components/issue-pickers';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { MemberAvatar } from '@/components/member-avatar';
import { useIssueTracker } from '@/hooks/use-issue-tracker';
import { useUpdateIssue } from '@/hooks/use-update-issue';
import {
    formatDueDate,
    isOverdue,
    issueStatuses,
    priorityLabel,
} from '@/lib/issues';
import { cn } from '@/lib/utils';
import { show } from '@/routes/issues';
import type { Issue, IssueStatus } from '@/types';

type Props = {
    issues: Issue[];
    teamSlug: string;
    projectId?: string;
};

export function IssueBoard({ issues, teamSlug, projectId }: Props) {
    const { openCreateIssue } = useIssueTracker();
    const updateIssue = useUpdateIssue();
    const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
    const [dropStatus, setDropStatus] = useState<IssueStatus | null>(null);

    const endDrag = () => {
        setDraggedIssueId(null);
        setDropStatus(null);
    };

    const dropOn = (event: DragEvent, status: IssueStatus) => {
        event.preventDefault();

        const issue = issues.find(({ id }) => id === draggedIssueId);

        endDrag();

        if (issue && issue.status !== status) {
            updateIssue(issue, { status });
        }
    };

    return (
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
            {issueStatuses.map(({ value: status, label }) => {
                const columnIssues = issues.filter(
                    (issue) => issue.status === status,
                );

                return (
                    <section
                        key={status}
                        aria-label={label}
                        data-drop-target={dropStatus === status}
                        className="flex max-h-[calc(100svh-11rem)] w-72 shrink-0 flex-col bg-muted/40 ring-1 ring-transparent data-[drop-target=true]:bg-muted data-[drop-target=true]:ring-foreground/20"
                        onDragOver={(event) => {
                            if (draggedIssueId) {
                                event.preventDefault();
                                setDropStatus(status);
                            }
                        }}
                        onDragLeave={(event) => {
                            if (
                                !event.currentTarget.contains(
                                    event.relatedTarget as Node | null,
                                )
                            ) {
                                setDropStatus(null);
                            }
                        }}
                        onDrop={(event) => dropOn(event, status)}
                    >
                        <header className="flex h-10 shrink-0 items-center gap-2 px-3 text-xs font-semibold">
                            <IssueStatusIcon status={status} />
                            {label}
                            <span className="font-normal text-muted-foreground">
                                {columnIssues.length}
                            </span>
                            <button
                                type="button"
                                aria-label={`Create a ${label} issue`}
                                className="ml-auto flex size-6 items-center justify-center hover:bg-background"
                                onClick={() =>
                                    openCreateIssue({ status, projectId })
                                }
                            >
                                <Plus className="size-3.5" />
                            </button>
                        </header>

                        <div className="flex flex-col gap-2 overflow-y-auto px-2 pb-2">
                            {columnIssues.map((issue) => (
                                <article
                                    key={issue.id}
                                    draggable
                                    data-dragging={issue.id === draggedIssueId}
                                    className="relative grid cursor-grab gap-2 border bg-background p-3 text-sm hover:border-foreground/20 active:cursor-grabbing data-[dragging=true]:opacity-50"
                                    onDragStart={(event) => {
                                        event.dataTransfer.effectAllowed =
                                            'move';
                                        event.dataTransfer.setData(
                                            'text/plain',
                                            issue.identifier,
                                        );
                                        setDraggedIssueId(issue.id);
                                    }}
                                    onDragEnd={endDrag}
                                >
                                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span>{issue.identifier}</span>
                                        {issue.assignee ? (
                                            <MemberAvatar
                                                name={issue.assignee.name}
                                            />
                                        ) : null}
                                    </div>

                                    <Link
                                        href={show([
                                            teamSlug,
                                            issue.identifier,
                                        ])}
                                        draggable={false}
                                        className="line-clamp-2 after:absolute after:inset-0"
                                    >
                                        {issue.title}
                                    </Link>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <IssuePriorityPicker
                                            value={issue.priority}
                                            onChange={(priority) =>
                                                updateIssue(issue, {
                                                    priority,
                                                })
                                            }
                                        >
                                            <button
                                                type="button"
                                                aria-label={`Priority: ${priorityLabel(issue.priority)}`}
                                                className="relative z-10 flex size-5 items-center justify-center border hover:bg-muted"
                                            >
                                                <IssuePriorityIcon
                                                    priority={issue.priority}
                                                    className="size-3"
                                                />
                                            </button>
                                        </IssuePriorityPicker>
                                        {issue.dueDate ? (
                                            <span
                                                className={cn(
                                                    'inline-flex h-5 items-center border px-1.5 text-[0.7rem]',
                                                    isOverdue(issue)
                                                        ? 'text-destructive'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {formatDueDate(issue.dueDate)}
                                            </span>
                                        ) : null}
                                        <IssueLabelChips
                                            labelIds={issue.labelIds}
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
