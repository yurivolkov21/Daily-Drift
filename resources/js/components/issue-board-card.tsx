import { CalendarDays, MessageSquare, UserRound } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import { IssueLabelChips } from '@/components/issue-label-chips';
import { IssuePriorityPicker } from '@/components/issue-pickers';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { MemberAvatar } from '@/components/member-avatar';
import { SubtaskProgress } from '@/components/subtask-progress';
import type { BoardDisplay, BoardProperty } from '@/hooks/use-board-display';
import { useUpdateIssue } from '@/hooks/use-update-issue';
import { formatDueDate, isOverdue, priorityLabel } from '@/lib/issues';
import { cn } from '@/lib/utils';
import type { Issue } from '@/types';

type Props = {
    issue: Issue;
    display: BoardDisplay;
    className?: string;
};

const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();

/**
 * Keep presses on a control inside a card from opening or dragging the card.
 */
const keepInsideCard = {
    onClick: stopPropagation,
    onKeyDown: stopPropagation,
    onMouseDown: stopPropagation,
    onTouchStart: stopPropagation,
};

function PriorityControl({
    issue,
    withLabel = false,
}: {
    issue: Issue;
    withLabel?: boolean;
}) {
    const updateIssue = useUpdateIssue();

    return (
        <span {...keepInsideCard} className="contents">
            <IssuePriorityPicker
                value={issue.priority}
                onChange={(priority) => updateIssue(issue, { priority })}
            >
                <button
                    type="button"
                    aria-label={`Priority: ${priorityLabel(issue.priority)}`}
                    className="flex h-5 items-center gap-1 border px-1 text-[0.7rem] text-muted-foreground hover:bg-muted"
                >
                    <IssuePriorityIcon
                        priority={issue.priority}
                        className="size-3"
                    />
                    {withLabel ? priorityLabel(issue.priority) : null}
                </button>
            </IssuePriorityPicker>
        </span>
    );
}

function CompactCard({
    issue,
    shows,
    className,
}: {
    issue: Issue;
    shows: (property: BoardProperty) => boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid gap-2 border bg-background p-3 text-sm transition-colors group-hover/card:border-foreground/20',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{issue.identifier}</span>
                {shows('assignee') && issue.assignee ? (
                    <MemberAvatar name={issue.assignee.name} />
                ) : null}
            </div>
            <p className="line-clamp-2">{issue.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 empty:hidden">
                {shows('priority') ? <PriorityControl issue={issue} /> : null}
                {shows('dueDate') && issue.dueDate ? (
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
                {shows('labels') ? (
                    <IssueLabelChips labelIds={issue.labelIds} />
                ) : null}
            </div>
            {shows('progress') ? (
                <SubtaskProgress
                    completed={issue.completedSubtasksCount ?? 0}
                    total={issue.subtasksCount ?? 0}
                />
            ) : null}
        </div>
    );
}

function DetailedCard({
    issue,
    shows,
    className,
}: {
    issue: Issue;
    shows: (property: BoardProperty) => boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid gap-2.5 border bg-background p-3 text-sm shadow-xs transition-colors group-hover/card:border-foreground/20',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                    {issue.identifier}
                </span>
                {shows('priority') ? (
                    <PriorityControl issue={issue} withLabel />
                ) : null}
            </div>
            <p className="line-clamp-2 font-medium">{issue.title}</p>
            {issue.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                    {issue.description}
                </p>
            ) : null}
            {shows('labels') && (issue.labelIds ?? []).length > 0 ? (
                <IssueLabelChips labelIds={issue.labelIds} />
            ) : null}
            {shows('progress') ? (
                <SubtaskProgress
                    completed={issue.completedSubtasksCount ?? 0}
                    total={issue.subtasksCount ?? 0}
                />
            ) : null}
            <div className="flex min-h-6 items-center justify-between gap-2 border-t pt-2.5 text-xs text-muted-foreground">
                {shows('assignee') ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                        {issue.assignee ? (
                            <MemberAvatar name={issue.assignee.name} />
                        ) : (
                            <UserRound className="size-4" />
                        )}
                        <span className="truncate">
                            {issue.assignee?.name ?? 'Unassigned'}
                        </span>
                    </span>
                ) : (
                    <span />
                )}
                <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    {shows('dueDate') && issue.dueDate ? (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1',
                                isOverdue(issue) && 'text-destructive',
                            )}
                        >
                            <CalendarDays className="size-3" />
                            {formatDueDate(issue.dueDate)}
                        </span>
                    ) : null}
                    {issue.commentsCount ? (
                        <span
                            className="inline-flex items-center gap-1"
                            title={`${issue.commentsCount} comments`}
                        >
                            <MessageSquare className="size-3" />
                            {issue.commentsCount}
                        </span>
                    ) : null}
                </span>
            </div>
        </div>
    );
}

/**
 * An issue card on the board, compact or detailed as the board's display options say.
 */
export function IssueBoardCard({ issue, display, className }: Props) {
    const shows = (property: BoardProperty) =>
        !display.hiddenProperties.includes(property);

    return display.density === 'detailed' ? (
        <DetailedCard issue={issue} shows={shows} className={className} />
    ) : (
        <CompactCard issue={issue} shows={shows} className={className} />
    );
}
