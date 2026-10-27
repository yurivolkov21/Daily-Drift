import { Link } from '@inertiajs/react';
import { Plus, UserRound } from 'lucide-react';
import { IssueLabelChips } from '@/components/issue-label-chips';
import {
    IssueAssigneePicker,
    IssuePriorityPicker,
    IssueStatusPicker,
} from '@/components/issue-pickers';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { MemberAvatar } from '@/components/member-avatar';
import { useIssueTracker } from '@/hooks/use-issue-tracker';
import { useUpdateIssue } from '@/hooks/use-update-issue';
import {
    formatDueDate,
    groupIssuesByStatus,
    isOverdue,
    priorityLabel,
    statusLabel,
} from '@/lib/issues';
import { cn } from '@/lib/utils';
import { show } from '@/routes/issues';
import type { Issue } from '@/types';

type Props = {
    issues: Issue[];
    teamSlug: string;
    projectId?: string;
    selectedIssueId: string | null;
};

const inlineControl =
    'relative z-10 flex size-6 shrink-0 items-center justify-center hover:bg-muted';

export function IssueList({
    issues,
    teamSlug,
    projectId,
    selectedIssueId,
}: Props) {
    const { openCreateIssue } = useIssueTracker();
    const updateIssue = useUpdateIssue();

    return (
        <div className="flex flex-col">
            {groupIssuesByStatus(issues).map((group) => (
                <section key={group.status}>
                    <header className="sticky top-0 z-20 flex h-9 items-center gap-2 border-b bg-muted/80 px-4 text-xs font-semibold backdrop-blur">
                        <IssueStatusIcon status={group.status} />
                        {statusLabel(group.status)}
                        <span className="font-normal text-muted-foreground">
                            {group.issues.length}
                        </span>
                        <button
                            type="button"
                            aria-label={`Create a ${statusLabel(group.status)} issue`}
                            className={cn(inlineControl, 'ml-auto')}
                            onClick={() =>
                                openCreateIssue({
                                    status: group.status,
                                    projectId,
                                })
                            }
                        >
                            <Plus className="size-3.5" />
                        </button>
                    </header>

                    {group.issues.map((issue) => (
                        <div
                            key={issue.id}
                            data-issue-id={issue.id}
                            data-selected={issue.id === selectedIssueId}
                            className="relative flex h-11 scroll-mt-9 items-center gap-2 border-b px-4 text-sm hover:bg-muted/40 data-[selected=true]:bg-muted"
                        >
                            <IssuePriorityPicker
                                value={issue.priority}
                                onChange={(priority) =>
                                    updateIssue(issue, { priority })
                                }
                            >
                                <button
                                    type="button"
                                    aria-label={`Priority: ${priorityLabel(issue.priority)}`}
                                    className={inlineControl}
                                >
                                    <IssuePriorityIcon
                                        priority={issue.priority}
                                    />
                                </button>
                            </IssuePriorityPicker>

                            <span className="w-16 shrink-0 text-xs text-muted-foreground">
                                {issue.identifier}
                            </span>

                            <IssueStatusPicker
                                value={issue.status}
                                onChange={(status) =>
                                    updateIssue(issue, { status })
                                }
                            >
                                <button
                                    type="button"
                                    aria-label={`Status: ${statusLabel(issue.status)}`}
                                    className={inlineControl}
                                >
                                    <IssueStatusIcon status={issue.status} />
                                </button>
                            </IssueStatusPicker>

                            <Link
                                href={show([teamSlug, issue.identifier])}
                                className="min-w-0 flex-1 truncate after:absolute after:inset-0"
                            >
                                {issue.title}
                            </Link>

                            <IssueLabelChips
                                labelIds={issue.labelIds}
                                className="hidden flex-nowrap md:flex"
                            />

                            {issue.dueDate ? (
                                <span
                                    className={cn(
                                        'hidden shrink-0 text-xs sm:inline',
                                        isOverdue(issue)
                                            ? 'text-destructive'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {formatDueDate(issue.dueDate)}
                                </span>
                            ) : null}

                            <IssueAssigneePicker
                                value={issue.assignee?.id ?? null}
                                onChange={(assigneeId) =>
                                    updateIssue(issue, {
                                        assignee_id: assigneeId,
                                    })
                                }
                            >
                                <button
                                    type="button"
                                    aria-label={
                                        issue.assignee
                                            ? `Assigned to ${issue.assignee.name}`
                                            : 'Unassigned'
                                    }
                                    className={inlineControl}
                                >
                                    {issue.assignee ? (
                                        <MemberAvatar
                                            name={issue.assignee.name}
                                        />
                                    ) : (
                                        <UserRound className="size-3.5 text-muted-foreground" />
                                    )}
                                </button>
                            </IssueAssigneePicker>
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );
}
