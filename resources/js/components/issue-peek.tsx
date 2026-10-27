import { Link, usePage } from '@inertiajs/react';
import { CalendarDays, UserRound } from 'lucide-react';
import { IssueLabelChips } from '@/components/issue-label-chips';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { IssueSubtasks } from '@/components/issue-subtasks';
import { MemberAvatar } from '@/components/member-avatar';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    formatDueDate,
    isOverdue,
    priorityLabel,
    statusLabel,
} from '@/lib/issues';
import { cn } from '@/lib/utils';
import { show } from '@/routes/issues';
import type { IssuePeek as IssuePeekData } from '@/types';

/**
 * A quick view of a board card's issue, with its sub-tasks to tick off.
 */
export function IssuePeek({
    peek,
    teamSlug,
    onClose,
}: {
    peek: IssuePeekData | null;
    teamSlug: string;
    onClose: () => void;
}) {
    const projects = usePage().props.workspace?.projects ?? [];
    const issue = peek?.issue;
    const project = projects.find(({ id }) => id === issue?.projectId);

    return (
        <Sheet
            open={peek !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <SheetContent className="w-full gap-0 sm:max-w-md">
                {peek && issue ? (
                    <>
                        <SheetHeader className="border-b pr-14">
                            <SheetDescription>
                                {issue.identifier}
                                {project ? ` · ${project.name}` : ''}
                            </SheetDescription>
                            <SheetTitle className="text-base leading-snug tracking-normal normal-case">
                                {issue.title}
                            </SheetTitle>
                        </SheetHeader>

                        <div className="grid flex-1 scroll-fade-y content-start gap-6 overflow-y-auto p-4">
                            <dl className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-2.5 text-xs">
                                <dt className="text-muted-foreground">
                                    Status
                                </dt>
                                <dd className="flex items-center gap-2">
                                    <IssueStatusIcon status={issue.status} />
                                    {statusLabel(issue.status)}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Priority
                                </dt>
                                <dd className="flex items-center gap-2">
                                    <IssuePriorityIcon
                                        priority={issue.priority}
                                    />
                                    {priorityLabel(issue.priority)}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Assignee
                                </dt>
                                <dd className="flex min-w-0 items-center gap-2">
                                    {issue.assignee ? (
                                        <MemberAvatar
                                            name={issue.assignee.name}
                                            className="size-4"
                                        />
                                    ) : (
                                        <UserRound className="size-4" />
                                    )}
                                    <span className="truncate">
                                        {issue.assignee?.name ?? 'Unassigned'}
                                    </span>
                                </dd>
                                <dt className="text-muted-foreground">
                                    Labels
                                </dt>
                                <dd>
                                    {(issue.labelIds ?? []).length > 0 ? (
                                        <IssueLabelChips
                                            labelIds={issue.labelIds}
                                        />
                                    ) : (
                                        <span className="text-muted-foreground">
                                            No labels
                                        </span>
                                    )}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Due date
                                </dt>
                                <dd
                                    className={cn(
                                        'flex items-center gap-2',
                                        isOverdue(issue) && 'text-destructive',
                                    )}
                                >
                                    <CalendarDays className="size-3.5" />
                                    {issue.dueDate
                                        ? formatDueDate(issue.dueDate)
                                        : 'No due date'}
                                </dd>
                            </dl>

                            {issue.description ? (
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                    {issue.description}
                                </p>
                            ) : null}

                            <IssueSubtasks
                                issueIdentifier={issue.identifier}
                                subtasks={peek.subtasks}
                                inPeek
                                className="mt-0 border-t-0 pt-0"
                            />
                        </div>

                        <SheetFooter className="border-t">
                            <Button
                                nativeButton={false}
                                render={
                                    <Link
                                        href={show([
                                            teamSlug,
                                            issue.identifier,
                                        ])}
                                    />
                                }
                            >
                                Open issue
                            </Button>
                        </SheetFooter>
                    </>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
