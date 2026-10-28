import { router } from '@inertiajs/react';
import { Ellipsis } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    ActivityIcon,
    CommentComposer,
    CommentEditor,
    CommentMenu,
    CommentText,
    RelativeTime,
} from '@/components/issue-activity-parts';
import { MemberAvatar } from '@/components/member-avatar';
import {
    Timeline,
    TimelineContent,
    TimelineHeader,
    TimelineIndicator,
    TimelineItem,
    TimelineSeparator,
} from '@/components/ui/timeline';
import {
    describeActivity,
    filterTimeline,
    foldChangeRuns,
} from '@/lib/issue-activity';
import type {
    IssueActivityFilter,
    IssueComment,
    IssueTimelineEntry,
    IssueTimelineRow,
} from '@/types';

type Props = {
    entries: IssueTimelineEntry[];
    issueIdentifier: string;
    filter: IssueActivityFilter;
};

const emptyMessages: Record<IssueActivityFilter, string> = {
    all: 'No activity yet.',
    comments: 'No comments yet.',
    history: 'No changes yet.',
};

function TimelineComment({
    comment,
    issueIdentifier,
}: {
    comment: IssueComment;
    issueIdentifier: string;
}) {
    const [editing, setEditing] = useState(false);
    const [flash, setFlash] = useState(0);

    // A notification links to #comment-<id>: bring that comment into view and
    // light it up once the page is there.
    useEffect(() => {
        const highlightIfLinked = () => {
            if (window.location.hash === `#comment-${comment.id}`) {
                document
                    .getElementById(`comment-${comment.id}`)
                    ?.scrollIntoView({ block: 'center' });
                setFlash((count) => count + 1);
            }
        };

        highlightIfLinked();

        return router.on('navigate', highlightIfLinked);
    }, [comment.id]);

    return (
        <div
            id={`comment-${comment.id}`}
            className="relative grid scroll-mt-4 gap-2 border bg-background p-3"
        >
            {flash > 0 ? (
                <span
                    key={flash}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 motion-safe:animate-highlight"
                />
            ) : null}
            <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-foreground">
                    {comment.author?.name ?? 'Former member'}
                </span>
                <RelativeTime value={comment.createdAt} />
                <span className="ml-auto">
                    <CommentMenu
                        comment={comment}
                        issueIdentifier={issueIdentifier}
                        onEdit={() => setEditing(true)}
                    />
                </span>
            </div>
            {editing ? (
                <CommentEditor
                    comment={comment}
                    issueIdentifier={issueIdentifier}
                    onDone={() => setEditing(false)}
                />
            ) : (
                <CommentText body={comment.body} />
            )}
        </div>
    );
}

function RowIndicator({ row }: { row: IssueTimelineRow }) {
    if (row.kind === 'comment') {
        return (
            <MemberAvatar
                name={row.comment.author?.name ?? '?'}
                className="size-6"
            />
        );
    }

    return (
        <span className="flex size-6 items-center justify-center rounded-full border bg-background">
            {row.kind === 'activity' ? (
                <ActivityIcon activity={row.activity} className="size-3" />
            ) : (
                <Ellipsis className="size-3" />
            )}
        </span>
    );
}

/**
 * Comments and changes on one vertical timeline, built on the ReUI Timeline
 * component. With every entry shown, long runs of changes fold behind a row
 * that expands them.
 */
export function IssueActivityTimeline({
    entries,
    issueIdentifier,
    filter,
}: Props) {
    const [expandedRunIds, setExpandedRunIds] = useState<ReadonlySet<string>>(
        () => new Set(),
    );
    const visibleEntries = filterTimeline(entries, filter);
    const rows =
        filter === 'all'
            ? foldChangeRuns(visibleEntries, expandedRunIds)
            : visibleEntries;

    return (
        <div className="grid gap-6">
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {emptyMessages[filter]}
                </p>
            ) : (
                <Timeline value={rows.length}>
                    {rows.map((row, index) => (
                        <TimelineItem
                            key={row.id}
                            step={index + 1}
                            className="group-data-[orientation=vertical]/timeline:ms-10"
                        >
                            <TimelineHeader>
                                <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.75rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
                                <TimelineIndicator className="flex size-6 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-7">
                                    <RowIndicator row={row} />
                                </TimelineIndicator>
                            </TimelineHeader>
                            <TimelineContent className="min-h-6 pt-0.5">
                                {row.kind === 'comment' ? (
                                    <TimelineComment
                                        comment={row.comment}
                                        issueIdentifier={issueIdentifier}
                                    />
                                ) : row.kind === 'activity' ? (
                                    <p className="text-sm">
                                        <span className="font-medium text-foreground">
                                            {row.activity.actor?.name ??
                                                'Someone'}
                                        </span>{' '}
                                        {describeActivity(row.activity)} ·{' '}
                                        <RelativeTime
                                            value={row.activity.createdAt}
                                        />
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        className="text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline"
                                        onClick={() =>
                                            setExpandedRunIds((runIds) =>
                                                new Set(runIds).add(row.runId),
                                            )
                                        }
                                    >
                                        Show {row.count} earlier changes
                                    </button>
                                )}
                            </TimelineContent>
                        </TimelineItem>
                    ))}
                </Timeline>
            )}
            {filter !== 'history' ? (
                <CommentComposer issueIdentifier={issueIdentifier} />
            ) : null}
        </div>
    );
}
