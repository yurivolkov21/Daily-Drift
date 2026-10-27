import { router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CirclePlus,
    Ellipsis,
    Pencil,
    Tag,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { IssuePriorityIcon } from '@/components/issue-priority-icon';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { formatFullTime, formatRelativeTime } from '@/lib/issue-activity';
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

export function CommentText({ body }: { body: string }) {
    return (
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
            {body}
        </p>
    );
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

    const submit = () => {
        if (form.data.body.trim() === '' || form.processing) {
            return;
        }

        form.post(store.url([teamSlug, issueIdentifier]), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => form.reset(),
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
            <Textarea
                aria-label="Leave a comment"
                placeholder="Leave a comment..."
                value={form.data.body}
                onChange={(event) => form.setData('body', event.target.value)}
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
                    Ctrl+Enter to send
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
    const form = useForm({ body: comment.body });

    const save = () => {
        form.patch(update.url([teamSlug, issueIdentifier, comment.id]), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: onDone,
        });
    };

    return (
        <div className="grid gap-2">
            <Textarea
                autoFocus
                aria-label="Edit comment"
                value={form.data.body}
                onChange={(event) => form.setData('body', event.target.value)}
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
