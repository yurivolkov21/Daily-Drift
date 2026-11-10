import { Link, router } from '@inertiajs/react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { History } from 'lucide-react';
import { Card, CardTitle } from '@/components/dashboard/cards';
import { MemberAvatar } from '@/components/member-avatar';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { dayIn, useLocalTime } from '@/hooks/use-local-time';
import { feedPhrase } from '@/lib/activity';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { show as showProject } from '@/routes/projects';
import type { FeedFilter, FeedItem, TeamFeed } from '@/types';

const FILTERS: { value: FeedFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'comments', label: 'Comments' },
    { value: 'completed', label: 'Completed' },
];

/**
 * The team's latest events, grouped by the viewer's day (spec 0005, the
 * chosen round 5 wireframe). The filter reloads only this card.
 */
export function ActivityCard({
    teamSlug,
    feed,
}: {
    teamSlug: string;
    feed: TeamFeed;
}) {
    const { today, zone } = useLocalTime();

    const pick = (filter: FeedFilter) =>
        router.get(
            dashboard(teamSlug).url,
            filter === 'all' ? {} : { activity: filter },
            {
                only: ['activity'],
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );

    const dayLabel = (day: string): string => {
        const ago = differenceInCalendarDays(parseISO(today), parseISO(day));

        if (ago <= 0) {
            return 'Today';
        }

        return ago === 1 ? 'Yesterday' : format(parseISO(day), 'EEE d MMM');
    };

    const days: { day: string; items: FeedItem[] }[] = [];

    feed.items.forEach((item) => {
        const day = dayIn(item.createdAt, zone);
        const last = days[days.length - 1];

        if (last?.day === day) {
            last.items.push(item);
        } else {
            days.push({ day, items: [item] });
        }
    });

    return (
        <Card delay={500}>
            <CardTitle
                aside={
                    <SegmentedTabs
                        label="Show"
                        options={FILTERS}
                        value={feed.filter}
                        onChange={pick}
                    />
                }
            >
                Activity
            </CardTitle>
            {days.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-6 text-center">
                    <History className="size-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        {feed.filter === 'all'
                            ? 'What your team does on its boards will show here.'
                            : 'Nothing of that kind lately.'}
                    </p>
                </div>
            ) : (
                <div
                    key={feed.filter}
                    className="flex animate-pop flex-col gap-2.5"
                >
                    {days.map(({ day, items }) => (
                        <section key={day} className="flex flex-col gap-0.5">
                            <h3 className="mb-1 flex items-center gap-2.5 font-sans text-[11.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                                {dayLabel(day)}
                                <span
                                    aria-hidden="true"
                                    className="h-px flex-1 bg-border/70"
                                />
                            </h3>
                            <ul className="flex flex-col gap-0.5">
                                {items.map((item) => (
                                    <Row
                                        key={item.id}
                                        teamSlug={teamSlug}
                                        item={item}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </Card>
    );
}

function Row({ teamSlug, item }: { teamSlug: string; item: FeedItem }) {
    const { verb, tail } = feedPhrase(item);
    const title = item.task?.title ?? String(item.properties.title ?? 'a task');

    return (
        <li
            data-test="feed-row"
            className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-muted/70"
        >
            {item.actor ? (
                <MemberAvatar
                    id={item.actor.id}
                    name={item.actor.name}
                    className="size-[30px]"
                />
            ) : (
                <span className="size-[30px] shrink-0 rounded-full bg-muted" />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[13.5px] leading-snug">
                    <strong>{item.actor?.name ?? 'Someone'}</strong>{' '}
                    <span className="text-muted-foreground">{verb}</span>{' '}
                    {item.task ? (
                        <Link
                            href={`${showProject({ current_team: teamSlug, project: item.project.id }).url}?task=${item.task.id}`}
                            className="font-semibold text-foreground no-underline hover:text-primary"
                        >
                            {title}
                        </Link>
                    ) : (
                        <span className="font-semibold text-muted-foreground line-through">
                            {title}
                        </span>
                    )}{' '}
                    <span className="text-muted-foreground">{tail}</span>
                </span>
                {item.quote && (
                    <span className="self-start rounded-[4px_10px_10px_10px] bg-muted px-2.5 py-1.5 text-[12.5px] text-foreground/80">
                        “{item.quote}”
                    </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                        className={cn(
                            'size-[7px] shrink-0 rounded-[2px]',
                            HUES[item.project.color].dot,
                        )}
                    />
                    <span className="truncate">{item.project.name}</span>·
                    <time dateTime={item.createdAt} className="shrink-0">
                        {format(new Date(item.createdAt), 'HH:mm')}
                    </time>
                </span>
            </span>
        </li>
    );
}
