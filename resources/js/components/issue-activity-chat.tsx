import { useState } from 'react';
import {
    ActivityIcon,
    CommentComposer,
    CommentEditor,
    CommentMenu,
    CommentText,
    RelativeTime,
    useIsOwnComment,
} from '@/components/issue-activity-parts';
import { MemberAvatar } from '@/components/member-avatar';
import { Bubble, BubbleContent, BubbleGroup } from '@/components/ui/bubble';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker';
import {
    Message,
    MessageAvatar,
    MessageContent,
    MessageHeader,
} from '@/components/ui/message';
import { describeActivity } from '@/lib/issue-activity';
import type { IssueComment, IssueTimelineEntry } from '@/types';

type Props = {
    entries: IssueTimelineEntry[];
    issueIdentifier: string;
};

function ChatComment({
    comment,
    issueIdentifier,
}: {
    comment: IssueComment;
    issueIdentifier: string;
}) {
    const [editing, setEditing] = useState(false);
    const isOwnComment = useIsOwnComment(comment);

    return (
        <Message align={isOwnComment ? 'end' : 'start'}>
            <MessageAvatar className="size-7 self-start bg-transparent">
                <MemberAvatar
                    name={comment.author?.name ?? '?'}
                    className="size-7"
                />
            </MessageAvatar>
            <MessageContent>
                <MessageHeader className="gap-2 px-0 tracking-normal normal-case group-data-[align=end]/message:flex-row-reverse">
                    <span className="text-foreground">
                        {comment.author?.name ?? 'Former member'}
                    </span>
                    <RelativeTime value={comment.createdAt} />
                    <CommentMenu
                        comment={comment}
                        issueIdentifier={issueIdentifier}
                        onEdit={() => setEditing(true)}
                    />
                </MessageHeader>
                <Bubble
                    variant={isOwnComment ? 'tinted' : 'muted'}
                    align={isOwnComment ? 'end' : 'start'}
                    className={editing ? 'w-full max-w-full' : undefined}
                >
                    <BubbleContent className={editing ? 'w-full' : undefined}>
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
 * Sample C: a chat thread of shadcn Bubbles, with changes shown as Markers.
 */
export function IssueActivityChat({ entries, issueIdentifier }: Props) {
    return (
        <div className="grid gap-6">
            <BubbleGroup className="gap-4">
                {entries.map((entry) =>
                    entry.kind === 'comment' ? (
                        <ChatComment
                            key={entry.id}
                            comment={entry.comment}
                            issueIdentifier={issueIdentifier}
                        />
                    ) : (
                        <Marker
                            key={entry.id}
                            className="justify-center text-center tracking-normal normal-case"
                        >
                            <MarkerIcon>
                                <ActivityIcon activity={entry.activity} />
                            </MarkerIcon>
                            <MarkerContent>
                                <span className="text-foreground">
                                    {entry.activity.actor?.name ?? 'Someone'}
                                </span>{' '}
                                {describeActivity(entry.activity)} ·{' '}
                                <RelativeTime
                                    value={entry.activity.createdAt}
                                />
                            </MarkerContent>
                        </Marker>
                    ),
                )}
            </BubbleGroup>
            <CommentComposer issueIdentifier={issueIdentifier} />
        </div>
    );
}
