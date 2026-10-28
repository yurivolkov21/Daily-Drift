import { router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CirclePlus,
    Ellipsis,
    Pencil,
    Tag,
    UserRound,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { MentionTextarea } from '@/components/mention-textarea';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatFullTime, formatRelativeTime } from '@/lib/issue-activity';
import type { Mention } from '@/lib/mentions';
import { readMentions, splitMentions, writeMentions } from '@/lib/mentions';
import { cn } from '@/lib/utils';
import { destroy, store, update } from '@/routes/issues/comments';
import type { IssueActivity, IssueComment } from '@/types';

export function RelativeTime({
    value,
    className,
}: {
    value: string;
    className?: string;
}) {
    return (
        <time
            dateTime={value}
            title={formatFullTime(value)}
            className={cn('text-muted-foreground', className)}
        >
            {formatRelativeTime(value)}
        </time>
    );
}

export function ActivityIcon({
    activity,
    className,
}: {
    activity: IssueActivity;
    className?: string;
}) {
    const iconClass = cn('size-3.5 text-muted-foreground', className);

    switch (activity.type) {
        case 'status_changed':
            return (
                <IssueStatusIcon
                    status={activity.properties.to}
                    className={className}
                />
            );
        case 'priority_changed':
            return (
                <IssuePriorityIcon
                    priority={activity.properties.to}
                    className={className}
                />
            );
        case 'assignee_changed':
            return <UserRound className={iconClass} />;
        case 'labels_changed':
            return <Tag className={iconClass} />;
        case 'due_date_changed':
            return <CalendarDays className={iconClass} />;
        case 'created':
            return <CirclePlus className={iconClass} />;
        default:
            return <Pencil className={iconClass} />;
    }
}

/**
 * Whether the signed in user wrote the comment and may edit or delete it.
 */
function useIsOwnComment(comment: IssueComment): boolean {
    return usePage().props.auth.user.id === comment.author?.id;
}

/**
 * A comment's text, with the people it mentions as chips. A mention of the
 * reader stands out more.
 */
export function CommentText({ body }: { body: string }) {
    const userId = usePage().props.auth.user.id;

    return (
        <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground">
            {splitMentions(body).map((part, index) =>
                typeof part === 'string' ? (
                    <Fragment key={index}>{part}</Fragment>
                ) : (
                    <span
                        key={index}
                        className={cn(
                            'px-0.5 font-medium',
                            part.id === userId
                                ? 'bg-primary/40'
                                : 'bg-primary/15',
                        )}
                    >
                        @{part.name}
                    </span>
                ),
            )}
        </p>
    );
}

/**
 * Keep the people a comment box mentions, once each.
 */
function useMentions(initial: Mention[] = []) {
    const [mentions, setMentions] = useState(initial);

    const addMention = (mention: Mention) =>
        setMentions((list) =>
            list.some(({ id }) => id === mention.id)
                ? list
                : [...list, mention],
        );

    return { mentions, addMention, clearMentions: () => setMentions([]) };
}

export function CommentComposer({
    issueIdentifier,
    className,
}: {
    issueIdentifier: string;
    className?: string;
}) {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';
    const form = useForm({ body: '' });
    const { mentions, addMention, clearMentions } = useMentions();

    const submit = () => {
        if (form.data.body.trim() === '' || form.processing) {
            return;
        }

        form.transform((data) => ({
            ...data,
            body: writeMentions(data.body, mentions),
        }));
        form.post(store.url([teamSlug, issueIdentifier]), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                form.reset();
                clearMentions();
            },
        });
    };

    return (
        <form
            className={cn('grid gap-2', className)}
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <MentionTextarea
                aria-label="Leave a comment"
                placeholder="Leave a comment... Type @ to mention someone."
                value={form.data.body}
                onValueChange={(body) => form.setData('body', body)}
                onMention={addMention}
                onKeyDown={(event) => {
                    if (
                        event.key === 'Enter' &&
                        (event.metaKey || event.ctrlKey)
                    ) {
                        event.preventDefault();
                        submit();
                    }
                }}
                className="min-h-20 border px-3"
            />
            <InputError message={form.errors.body} />
            <div className="flex items-center justify-end gap-3">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                    @ to mention · Ctrl+Enter to send
                </span>
                <Button
                    type="submit"
                    size="sm"
                    data-test="comment-submit"
                    disabled={form.processing || form.data.body.trim() === ''}
                >
                    Comment
                </Button>
            </div>
        </form>
    );
}

export function CommentEditor({
    comment,
    issueIdentifier,
    onDone,
}: {
    comment: IssueComment;
    issueIdentifier: string;
    onDone: () => void;
}) {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';
    const [initial] = useState(() => readMentions(comment.body));
    const form = useForm({ body: initial.text });
    const { mentions, addMention } = useMentions(initial.mentions);

    const save = () => {
        form.transform((data) => ({
            ...data,
            body: writeMentions(data.body, mentions),
        }));
        form.patch(update.url([teamSlug, issueIdentifier, comment.id]), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: onDone,
        });
    };

    return (
        <div className="grid gap-2">
            <MentionTextarea
                autoFocus
                aria-label="Edit comment"
                value={form.data.body}
                onValueChange={(body) => form.setData('body', body)}
                onMention={addMention}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        onDone();
                    }

                    if (
                        event.key === 'Enter' &&
                        (event.metaKey || event.ctrlKey)
                    ) {
                        event.preventDefault();
                        save();
                    }
                }}
                className="min-h-16 border px-3"
            />
            <InputError message={form.errors.body} />
            <div className="flex justify-end gap-2">
                <Button variant="secondary" size="xs" onClick={onDone}>
                    Cancel
                </Button>
                <Button
                    size="xs"
                    disabled={form.processing || form.data.body.trim() === ''}
                    onClick={save}
                >
                    Save
                </Button>
            </div>
        </div>
    );
}

export function CommentMenu({
    comment,
    issueIdentifier,
    onEdit,
}: {
    comment: IssueComment;
    issueIdentifier: string;
    onEdit: () => void;
}) {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const isOwnComment = useIsOwnComment(comment);

    if (!isOwnComment) {
        return null;
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Comment actions"
                        />
                    }
                >
                    <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                        Edit comment
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setConfirmingDelete(true)}
                    >
                        Delete comment
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
                open={confirmingDelete}
                onOpenChange={setConfirmingDelete}
                title="Delete this comment?"
                description="The comment will be removed for everyone in the team."
                confirmLabel="Delete comment"
                onConfirm={() =>
                    router.delete(
                        destroy.url([teamSlug, issueIdentifier, comment.id]),
                        {
                            preserveScroll: true,
                            preserveState: true,
                            onSuccess: () => setConfirmingDelete(false),
                        },
                    )
                }
            />
        </>
    );
}
