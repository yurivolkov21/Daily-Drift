import { router, useHttp, usePage } from '@inertiajs/react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
    ArrowRight,
    CalendarDays,
    Check,
    ChevronDown,
    Flag,
    MessageSquare,
    Pencil,
    Plus,
    RotateCcw,
    Tag,
    Trash2,
    UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { MemberAvatar } from '@/components/member-avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dayIn, useLocalTime } from '@/hooks/use-local-time';
import { describeEvent, splitMentions } from '@/lib/activity';
import { cn } from '@/lib/utils';
import { destroy, store, update } from '@/routes/comments';
import { activity } from '@/routes/tasks';
import type { TaskActivity as Activity, TaskComment, TaskEvent } from '@/types';
import type { Member } from './assignee-field';

const EVENT_ICONS: Record<string, LucideIcon> = {
    'task.created': Plus,
    'task.renamed': Pencil,
    'task.described': Pencil,
    'task.moved': ArrowRight,
    'task.assigned': UserRound,
    'task.unassigned': UserRound,
    'task.priority_changed': Flag,
    'task.due_changed': CalendarDays,
    'task.completed': Check,
    'task.reopened': RotateCcw,
    'task.labeled': Tag,
    'task.unlabeled': Tag,
};

type Block =
    | { kind: 'comment'; comment: TaskComment }
    | { kind: 'changes'; key: number; events: TaskEvent[] };

const firstName = (name: string) => name.trim().split(/\s+/)[0];

/** The `@query` being typed at the end of the text, if any. */
function mentionQuery(text: string): string | null {
    const match = /(?:^|\s)@([^\s@]*(?: [^\s@]*)?)$/.exec(text);

    return match ? match[1].toLowerCase() : null;
}

/**
 * A task's comments with the changes folded between them (spec 0005, the
 * chosen round 5 wireframe), and a composer with `@` mentions. Everything is
 * loaded when the sheet opens.
 */
export function TaskActivity({
    teamSlug,
    taskId,
    members,
}: {
    teamSlug: string;
    taskId: number;
    members: Member[];
}) {
    const { submit } = useHttp();
    const { zone } = useLocalTime();
    const [data, setData] = useState<Activity | null>(null);
    const [failed, setFailed] = useState(false);
    const [open, setOpen] = useState<Record<number, boolean>>({});
    const [editing, setEditing] = useState<number | null>(null);
    const [focused, setFocused] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setData(
                (await submit(
                    activity({ current_team: teamSlug, task: taskId }),
                )) as Activity,
            );
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [submit, teamSlug, taskId]);

    useEffect(() => {
        void load();
    }, [load]);

    // Opened from a mention (spec 0006): scroll to the comment and
    // highlight it once, then drop `comment` from the address.
    useEffect(() => {
        if (!data) {
            return;
        }

        const id = commentFromUrl(taskId);

        if (id === null) {
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.delete('comment');
        window.history.replaceState(window.history.state, '', url);

        const element = document.querySelector(`[data-comment-id="${id}"]`);

        if (!element) {
            return;
        }

        element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setFocused(id);
        const timer = window.setTimeout(() => setFocused(null), 2600);

        return () => window.clearTimeout(timer);
    }, [data, taskId]);

    const blocks = useMemo<Block[]>(() => {
        if (!data) {
            return [];
        }

        const items = [
            ...data.comments.map((comment) => ({
                at: comment.createdAt,
                comment,
                event: null,
            })),
            ...data.events.map((event) => ({
                at: event.createdAt,
                comment: null,
                event,
            })),
        ].sort((a, b) => a.at.localeCompare(b.at));
        const result: Block[] = [];

        items.forEach(({ comment, event }) => {
            const last = result[result.length - 1];

            if (comment) {
                result.push({ kind: 'comment', comment });
            } else if (event && last?.kind === 'changes') {
                last.events.push(event);
            } else if (event) {
                result.push({
                    kind: 'changes',
                    key: event.id,
                    events: [event],
                });
            }
        });

        return result;
    }, [data]);

    const remove = (comment: TaskComment) =>
        router.visit(destroy({ current_team: teamSlug, comment: comment.id }), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => void load(),
        });

    return (
        <section
            aria-labelledby="task-activity"
            className="flex flex-col gap-3"
        >
            <h3
                id="task-activity"
                className="flex flex-wrap items-baseline gap-2 text-sm font-medium"
            >
                <MessageSquare className="size-4 self-center text-muted-foreground" />
                Comments
                {data && (
                    <>
                        <span className="font-sans font-normal text-muted-foreground">
                            {data.comments.length}
                        </span>
                        {data.events.length > 0 && (
                            <span className="font-sans text-xs font-normal text-muted-foreground">
                                {data.events.length}{' '}
                                {data.events.length === 1
                                    ? 'change'
                                    : 'changes'}
                                , folded between them
                            </span>
                        )}
                    </>
                )}
            </h3>

            {!data && !failed && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner /> Loading the history…
                </p>
            )}
            {failed && (
                <p role="alert" className="text-sm text-destructive-foreground">
                    The history could not be loaded.{' '}
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="font-semibold underline"
                    >
                        Try again
                    </button>
                </p>
            )}

            {data && (
                <>
                    {data.historyStartsAt && (
                        <p className="text-xs text-muted-foreground">
                            History starts on{' '}
                            {format(
                                parseISO(dayIn(data.historyStartsAt, zone)),
                                'd MMM yyyy',
                            )}
                            ; earlier changes were not recorded.
                        </p>
                    )}
                    <ol className="flex flex-col gap-3">
                        {blocks.map((block) =>
                            block.kind === 'comment' ? (
                                <CommentItem
                                    key={`c${block.comment.id}`}
                                    teamSlug={teamSlug}
                                    comment={block.comment}
                                    focused={focused === block.comment.id}
                                    members={members}
                                    editing={editing === block.comment.id}
                                    onEdit={(on) =>
                                        setEditing(on ? block.comment.id : null)
                                    }
                                    onSaved={() => {
                                        setEditing(null);
                                        void load();
                                    }}
                                    onDelete={() => remove(block.comment)}
                                />
                            ) : (
                                <Changes
                                    key={`e${block.key}`}
                                    events={block.events}
                                    zone={zone}
                                    open={open[block.key] ?? false}
                                    onToggle={() =>
                                        setOpen((current) => ({
                                            ...current,
                                            [block.key]: !current[block.key],
                                        }))
                                    }
                                />
                            ),
                        )}
                    </ol>
                    {data.canComment && (
                        <Composer
                            members={members}
                            label="Write a comment"
                            submitLabel="Comment"
                            onSubmit={(body, mentions, done) =>
                                router.visit(
                                    store({
                                        current_team: teamSlug,
                                        task: taskId,
                                    }),
                                    {
                                        data: { body, mentions },
                                        preserveScroll: true,
                                        preserveState: true,
                                        onSuccess: () => {
                                            done();
                                            void load();
                                        },
                                        onError: (errors) =>
                                            done(
                                                errors.body ??
                                                    errors['mentions.0'],
                                            ),
                                    },
                                )
                            }
                        />
                    )}
                </>
            )}
        </section>
    );
}

function Changes({
    events,
    zone,
    open,
    onToggle,
}: {
    events: TaskEvent[];
    zone: string;
    open: boolean;
    onToggle: () => void;
}) {
    const people = [
        ...new Set(
            events.map((event) =>
                event.actor ? firstName(event.actor.name) : 'Daily-Drift',
            ),
        ),
    ].join(', ');
    const when = (iso: string) => format(parseISO(dayIn(iso, zone)), 'd MMM');

    return (
        <li className="flex flex-col pl-9.5">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                data-test="changes-toggle"
                className="flex min-h-7 items-center gap-2 self-start rounded-full border border-dashed border-input bg-card pr-2.5 pl-2 text-[12.5px] font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ChevronDown
                    className={cn(
                        'size-3.5 transition-transform duration-300 ease-slide',
                        !open && '-rotate-90',
                    )}
                />
                {events.length} {events.length === 1 ? 'change' : 'changes'} ·{' '}
                {people} · {when(events[0].createdAt)}
            </button>
            <div
                inert={!open}
                className={cn(
                    'grid transition-[grid-template-rows] duration-400 ease-slide',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="min-h-0 overflow-hidden">
                    <ul className="flex flex-col gap-2.5 pt-2.5 pb-0.5">
                        {events.map((event) => {
                            const Icon = EVENT_ICONS[event.type] ?? Pencil;

                            return (
                                <li
                                    key={event.id}
                                    className="flex items-center gap-2.5 text-[12.5px] leading-snug text-muted-foreground"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-card"
                                    >
                                        <Icon className="size-[11px]" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        {event.actor && (
                                            <strong className="font-semibold text-foreground/80">
                                                {firstName(
                                                    event.actor.name,
                                                )}{' '}
                                            </strong>
                                        )}
                                        {describeEvent(event)}
                                    </span>
                                    <time
                                        dateTime={event.createdAt}
                                        className="shrink-0 text-xs"
                                    >
                                        {format(
                                            new Date(event.createdAt),
                                            'd MMM, HH:mm',
                                        )}
                                    </time>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </li>
    );
}

function CommentItem({
    teamSlug,
    comment,
    focused,
    members,
    editing,
    onEdit,
    onSaved,
    onDelete,
}: {
    teamSlug: string;
    comment: TaskComment;
    focused: boolean;
    members: Member[];
    editing: boolean;
    onEdit: (on: boolean) => void;
    onSaved: () => void;
    onDelete: () => void;
}) {
    const mentioned = members
        .filter((member) => comment.mentions.includes(member.id))
        .map((member) => member.name);

    return (
        <li
            data-test="comment"
            data-comment-id={comment.id}
            className="flex animate-pop scroll-mt-24 gap-2.5"
        >
            {comment.author ? (
                <MemberAvatar
                    id={comment.author.id}
                    name={comment.author.name}
                    className="size-7"
                />
            ) : (
                <span className="size-7 shrink-0 rounded-full bg-muted" />
            )}
            <div
                className={cn(
                    'group flex min-w-0 flex-1 flex-col gap-1 rounded-[4px_14px_14px_14px] bg-muted px-3 py-2.5 transition-shadow duration-500',
                    focused && 'shadow-[0_0_0_2px_var(--color-primary)]',
                )}
            >
                <div className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                    <strong>{comment.author?.name ?? 'Former member'}</strong>
                    <time
                        dateTime={comment.createdAt}
                        className="text-xs text-muted-foreground"
                    >
                        {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                        })}
                    </time>
                    {comment.edited && (
                        <span className="text-xs text-muted-foreground">
                            edited
                        </span>
                    )}
                    {!editing && (comment.canEdit || comment.canDelete) && (
                        <span className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                            {comment.canEdit && (
                                <button
                                    type="button"
                                    aria-label="Edit the comment"
                                    onClick={() => onEdit(true)}
                                    className="rounded-md p-1 text-muted-foreground outline-none hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Pencil className="size-3.5" />
                                </button>
                            )}
                            {comment.canDelete && (
                                <button
                                    type="button"
                                    aria-label="Delete the comment"
                                    onClick={onDelete}
                                    className="rounded-md p-1 text-muted-foreground outline-none hover:bg-card hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            )}
                        </span>
                    )}
                </div>
                {editing ? (
                    <Composer
                        members={members}
                        label="Edit the comment"
                        submitLabel="Save"
                        initial={comment.body}
                        bare
                        onCancel={() => onEdit(false)}
                        onSubmit={(body, mentions, done) =>
                            router.visit(
                                update({
                                    current_team: teamSlug,
                                    comment: comment.id,
                                }),
                                {
                                    data: { body, mentions },
                                    preserveScroll: true,
                                    preserveState: true,
                                    onSuccess: () => {
                                        done();
                                        onSaved();
                                    },
                                    onError: (errors) =>
                                        done(
                                            errors.body ?? errors['mentions.0'],
                                        ),
                                },
                            )
                        }
                    />
                ) : (
                    <p className="text-[13.5px] leading-normal break-words whitespace-pre-wrap">
                        {splitMentions(comment.body, mentioned).map(
                            (part, index) =>
                                part.mention ? (
                                    <span
                                        key={index}
                                        className="rounded-[5px] bg-primary/10 font-semibold text-primary"
                                    >
                                        {part.text}
                                    </span>
                                ) : (
                                    part.text
                                ),
                        )}
                    </p>
                )}
            </div>
        </li>
    );
}

/**
 * A comment box: typing `@` offers the team's members, and Ctrl/⌘ + Enter
 * sends. Only mentions still present in the text are sent.
 */
function Composer({
    members,
    label,
    submitLabel,
    initial = '',
    bare = false,
    onSubmit,
    onCancel,
}: {
    members: Member[];
    label: string;
    submitLabel: string;
    initial?: string;
    bare?: boolean;
    onSubmit: (
        body: string,
        mentions: number[],
        done: (error?: string) => void,
    ) => void;
    onCancel?: () => void;
}) {
    const { auth } = usePage().props;
    const [body, setBody] = useState(initial);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string>();
    const [picked, setPicked] = useState(0);
    const field = useRef<HTMLTextAreaElement>(null);

    const query = mentionQuery(body);
    const options =
        query === null
            ? []
            : members
                  .filter(
                      (member) =>
                          member.id !== auth.user.id &&
                          member.name.toLowerCase().includes(query),
                  )
                  .slice(0, 6);
    const focus = Math.min(picked, Math.max(0, options.length - 1));

    const mention = (member: Member) => {
        setBody(body.replace(/@[^@]*$/, `@${member.name} `));
        setPicked(0);
        field.current?.focus();
    };

    const send = () => {
        const text = body.trim();

        if (text === '' || sending) {
            return;
        }

        setSending(true);
        onSubmit(
            text,
            members
                .filter((member) => text.includes(`@${member.name}`))
                .map((member) => member.id),
            (problem) => {
                setSending(false);
                setError(problem);

                if (!problem) {
                    setBody('');
                }
            },
        );
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (options.length > 0 && event.key === 'ArrowDown') {
            event.preventDefault();
            setPicked((focus + 1) % options.length);
        } else if (options.length > 0 && event.key === 'ArrowUp') {
            event.preventDefault();
            setPicked((focus - 1 + options.length) % options.length);
        } else if (
            options.length > 0 &&
            (event.key === 'Enter' || event.key === 'Tab') &&
            !event.metaKey &&
            !event.ctrlKey
        ) {
            event.preventDefault();
            mention(options[focus]);
        } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            send();
        } else if (event.key === 'Escape' && onCancel) {
            event.stopPropagation();
            onCancel();
        }
    };

    return (
        <div className={cn('flex gap-2.5', !bare && 'pt-1')}>
            {!bare && (
                <MemberAvatar
                    id={auth.user.id}
                    name={auth.user.name}
                    className="size-7"
                />
            )}
            <div className="relative flex min-w-0 flex-1 flex-col gap-2">
                {options.length > 0 && (
                    <ul
                        role="listbox"
                        aria-label="Mention someone"
                        className="absolute bottom-full left-0 z-10 mb-1 flex w-60 animate-pop flex-col gap-0.5 rounded-[14px] border bg-popover p-1.5 shadow-[0_20px_44px_-18px_rgb(23_21_59/0.4)]"
                    >
                        {options.map((member, index) => (
                            <li
                                key={member.id}
                                role="option"
                                aria-selected={index === focus}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    mention(member);
                                }}
                                className={cn(
                                    'flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-[13.5px] font-semibold',
                                    index === focus && 'bg-secondary',
                                )}
                            >
                                <MemberAvatar
                                    id={member.id}
                                    name={member.name}
                                />
                                {member.name}
                            </li>
                        ))}
                    </ul>
                )}
                <Textarea
                    ref={field}
                    aria-label={label}
                    placeholder="Write a comment. Type @ to mention someone."
                    value={body}
                    maxLength={5000}
                    rows={2}
                    data-test="comment-field"
                    onChange={(event) => {
                        setBody(event.target.value);
                        setPicked(0);
                    }}
                    onKeyDown={onKeyDown}
                    className="min-h-0 resize-none rounded-xl bg-card text-[13.5px] md:text-[13.5px]"
                />
                <InputError message={error} />
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] text-muted-foreground">
                        Ctrl + Enter to send
                    </span>
                    <span className="flex gap-2">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="button"
                            size="sm"
                            disabled={body.trim() === '' || sending}
                            onClick={send}
                            data-test="comment-send"
                            className="rounded-[10px]"
                        >
                            {sending && <Spinner />}
                            {submitLabel}
                        </Button>
                    </span>
                </div>
            </div>
        </div>
    );
}

/** The comment to scroll to, when the address names this task and one. */
function commentFromUrl(taskId: number): number | null {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('comment'));

    return Number(params.get('task')) === taskId &&
        Number.isInteger(id) &&
        id > 0
        ? id
        : null;
}
