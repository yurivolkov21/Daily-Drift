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
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
    Message,
    MessageAvatar,
    MessageContent,
    MessageHeader,
} from '@/components/ui/message';
import {
    Trace,
    TraceCollapsible,
    TraceCollapsibleContent,
    TraceCollapsibleTrigger,
    TraceDescription,
    TraceIcon,
    TraceLine,
    TraceTitle,
} from '@/components/ui/trace';
import { describeActivity } from '@/lib/issue-activity';
import type { IssueActivity, IssueComment, IssueTimelineEntry } from '@/types';

type Props = {
    entries: IssueTimelineEntry[];
    issueIdentifier: string;
};

type Run =
    | { kind: 'comment'; id: string; comment: IssueComment }
    | { kind: 'activities'; id: string; activities: IssueActivity[] };

/**
 * Collapse back to back changes into one run so a busy issue stays short.
 */
function toRuns(entries: IssueTimelineEntry[]): Run[] {
    return entries.reduce<Run[]>((runs, entry) => {
        const lastRun = runs[runs.length - 1];

        if (entry.kind === 'comment') {
            return [
                ...runs,
                { kind: 'comment', id: entry.id, comment: entry.comment },
            ];
        }

        if (lastRun?.kind === 'activities') {
            return [
                ...runs.slice(0, -1),
                {
                    ...lastRun,
                    activities: [...lastRun.activities, entry.activity],
                },
            ];
        }

        return [
            ...runs,
            { kind: 'activities', id: entry.id, activities: [entry.activity] },
        ];
    }, []);
}

function ActivityLine({ activity }: { activity: IssueActivity }) {
    return (
        <TraceLine>
            <TraceIcon>
                <ActivityIcon activity={activity} />
            </TraceIcon>
            <TraceTitle className="whitespace-normal">
                <span className="text-foreground">
                    {activity.actor?.name ?? 'Someone'}
                </span>{' '}
                {describeActivity(activity)}{' '}
                <TraceDescription>
                    <RelativeTime value={activity.createdAt} />
                </TraceDescription>
            </TraceTitle>
        </TraceLine>
    );
}

function ThreadComment({
    comment,
    issueIdentifier,
}: {
    comment: IssueComment;
    issueIdentifier: string;
}) {
    const [editing, setEditing] = useState(false);

    return (
        <Message>
            <MessageAvatar className="size-8 self-start bg-transparent">
                <MemberAvatar
                    name={comment.author?.name ?? '?'}
                    className="size-8"
                />
            </MessageAvatar>
            <MessageContent>
                <MessageHeader className="gap-2 px-0 tracking-normal normal-case">
                    <span className="text-foreground">
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
                </MessageHeader>
                <Bubble variant="outline" className="max-w-full">
                    <BubbleContent className="w-full">
                        {editing ? (
                            <CommentEditor
                                comment={comment}
                                issueIdentifier={issueIdentifier}
                                onDone={() => setEditing(false)}
                            />
                        ) : (
                            <CommentText body={comment.body} />
                        )}
                    </BubbleContent>
                </Bubble>
            </MessageContent>
        </Message>
    );
}

/**
 * Sample B: shadcn Message for comments and Trace for runs of changes.
 */
export function IssueActivityThread({ entries, issueIdentifier }: Props) {
    return (
        <div className="grid gap-5">
            {toRuns(entries).map((run) => {
                if (run.kind === 'comment') {
                    return (
                        <ThreadComment
                            key={run.id}
                            comment={run.comment}
                            issueIdentifier={issueIdentifier}
                        />
                    );
                }

                const earlier = run.activities.slice(0, -2);
                const latest = run.activities.slice(-2);

                return (
                    <Trace key={run.id}>
                        {earlier.length > 1 ? (
                            <TraceCollapsible>
                                <TraceCollapsibleTrigger>
                                    <TraceLine>
                                        <TraceTitle>
                                            {earlier.length} earlier changes
                                        </TraceTitle>
                                    </TraceLine>
                                </TraceCollapsibleTrigger>
                                <TraceCollapsibleContent className="grid gap-3">
                                    {earlier.map((activity) => (
                                        <ActivityLine
                                            key={activity.id}
                                            activity={activity}
                                        />
                                    ))}
                                </TraceCollapsibleContent>
                            </TraceCollapsible>
                        ) : (
                            earlier.map((activity) => (
                                <ActivityLine
                                    key={activity.id}
                                    activity={activity}
                                />
                            ))
                        )}
                        {latest.map((activity) => (
                            <ActivityLine
                                key={activity.id}
                                activity={activity}
                            />
                        ))}
                    </Trace>
                );
            })}
            <CommentComposer issueIdentifier={issueIdentifier} />
        </div>
    );
}
