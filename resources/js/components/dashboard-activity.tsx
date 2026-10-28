import { Link, usePage } from '@inertiajs/react';
import { Fragment } from 'react';
import { ActivityIcon } from '@/components/issue-activity-parts';
import { MemberAvatar } from '@/components/member-avatar';
import { describeFeedEntry, feedActor, feedDay } from '@/lib/dashboard';
import { formatFullTime } from '@/lib/issue-activity';
import { formatAge } from '@/lib/issues';
import { readMentions } from '@/lib/mentions';
import { show } from '@/routes/issues';
import type { DashboardActivityEntry } from '@/types';

/**
 * The team's latest changes and comments on a line like the issue page's
 * timeline, with a heading for each day. A comment links to its place on the
 * issue page.
 */
export function ActivityFeed({
    entries,
}: {
    entries: DashboardActivityEntry[];
}) {
    const page = usePage();
    const teamSlug = page.props.currentTeam?.slug ?? '';
    const userId = page.props.auth.user.id;
    const days = entries.map((entry) => feedDay(entry.createdAt));

    return (
        <ol className="flex flex-col px-4 py-2">
            {entries.map((entry, index) => {
                const actor = feedActor(entry);
                const { before, after } = describeFeedEntry(entry, userId);
                const href =
                    show.url([teamSlug, entry.issue.identifier]) +
                    (entry.kind === 'comment'
                        ? `#comment-${entry.comment.id}`
                        : '');

                return (
                    <Fragment key={entry.id}>
                        {days[index] !== days[index - 1] ? (
                            <li className="pt-2 pb-1 text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
                                {days[index]}
                            </li>
                        ) : null}
                        <li className="relative flex gap-3 pb-4">
                            {days[index] === days[index + 1] ? (
                                <span
                                    aria-hidden="true"
                                    className="absolute top-7 bottom-1 left-3 w-px bg-border"
                                />
                            ) : null}
                            <span className="relative flex size-6 shrink-0 items-center justify-center">
                                {entry.kind === 'comment' ? (
                                    <MemberAvatar
                                        name={actor}
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
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
                                <p className="flex min-w-0 items-baseline gap-2 text-sm">
                                    <span className="min-w-0 flex-1">
                                        <span className="font-medium">
                                            {actor}
                                        </span>{' '}
                                        {before}{' '}
                                        <Link
                                            href={href}
                                            className="font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                                        >
                                            {entry.issue.identifier}
                                        </Link>
                                        {after ? ` ${after}` : null}
                                    </span>
                                    <time
                                        dateTime={entry.createdAt}
                                        title={formatFullTime(entry.createdAt)}
                                        className="shrink-0 text-xs text-muted-foreground tabular-nums"
                                    >
                                        {formatAge(entry.createdAt)}
                                    </time>
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {entry.issue.title}
                                </p>
                                {entry.kind === 'comment' ? (
                                    <p className="line-clamp-2 border-l-2 pl-2 text-xs leading-relaxed text-foreground/80">
                                        {readMentions(entry.comment.body).text}
                                    </p>
                                ) : null}
                            </div>
                        </li>
                    </Fragment>
                );
            })}
        </ol>
    );
}
