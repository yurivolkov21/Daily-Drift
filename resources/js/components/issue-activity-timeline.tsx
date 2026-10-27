import { useState } from 'react';
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
import { describeActivity } from '@/lib/issue-activity';
import type { IssueComment, IssueTimelineEntry } from '@/types';

type Props = {
    entries: IssueTimelineEntry[];
    issueIdentifier: string;
};

function TimelineComment({
    comment,
    issueIdentifier,
}: {
    comment: IssueComment;
    issueIdentifier: string;
}) {
    const [editing, setEditing] = useState(false);

    return (
        <div className="grid gap-2 border bg-background p-3">
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

/**
 * Sample A: one vertical timeline built on the ReUI Timeline component.
 */
export function IssueActivityTimeline({ entries, issueIdentifier }: Props) {
    return (
        <div className="grid gap-6">
            <Timeline defaultValue={entries.length}>
                {entries.map((entry, index) => (
                    <TimelineItem
                        key={entry.id}
                        step={index + 1}
                        className="group-data-[orientation=vertical]/timeline:ms-10"
                    >
                        <TimelineHeader>
                            <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.75rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
                            <TimelineIndicator className="flex size-6 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-7">
                                {entry.kind === 'comment' ? (
                                    <MemberAvatar
                                        name={entry.comment.author?.name ?? '?'}
                                        className="size-6"
                                    />
                                ) : (
                                    <span className="flex size-6 items-center justify-center rounded-full border bg-background">
                                        <ActivityIcon
                                            activity={entry.activity}
                                            className="size-3"
                                        />
                                    </span>
                                )}
                            </TimelineIndicator>
                        </TimelineHeader>
                        <TimelineContent className="min-h-6 pt-0.5">
                            {entry.kind === 'comment' ? (
                                <TimelineComment
                                    comment={entry.comment}
                                    issueIdentifier={issueIdentifier}
                                />
                            ) : (
                                <p className="text-sm">
                                    <span className="font-medium text-foreground">
                                        {entry.activity.actor?.name ??
                                            'Someone'}
                                    </span>{' '}
                                    {describeActivity(entry.activity)} ·{' '}
                                    <RelativeTime
                                        value={entry.activity.createdAt}
                                    />
                                </p>
                            )}
                        </TimelineContent>
                    </TimelineItem>
                ))}
            </Timeline>
            <CommentComposer issueIdentifier={issueIdentifier} />
        </div>
    );
}
