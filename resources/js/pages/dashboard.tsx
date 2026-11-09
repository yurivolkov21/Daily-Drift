import { Head, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { AlarmClock, CalendarClock, CheckCheck, ListTodo } from 'lucide-react';
import { useState } from 'react';
import {
    ActivityCard,
    DueTodayCard,
    GreetingCard,
    ProjectsCard,
    StatCard,
} from '@/components/dashboard/cards';
import { FocusCard } from '@/components/dashboard/focus-card';
import { ThroughputChart } from '@/components/dashboard/throughput-chart';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { teamCrumb } from '@/lib/breadcrumbs';
import { PRIORITY_NAMES, PRIORITIES } from '@/lib/tasks';
import { dashboard } from '@/routes';
import type { DashboardData, DashboardInvitation, FocusGroup } from '@/types';

type Props = {
    pendingInvitations?: DashboardInvitation[];
    dashboard: DashboardData | null;
};

const TONES = {
    indigo: {
        tile: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
        bar: 'bg-indigo-500',
        text: 'text-indigo-600',
    },
    amber: {
        tile: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        bar: 'bg-amber-500',
        text: 'text-amber-700',
    },
    red: {
        tile: 'bg-red-500/10 text-red-700 dark:text-red-300',
        bar: 'bg-red-500',
        text: 'text-red-700',
    },
    green: {
        tile: 'bg-green-500/10 text-green-700 dark:text-green-300',
        bar: 'bg-green-500',
        text: 'text-green-700',
    },
};

export default function Dashboard({
    pendingInvitations = [],
    dashboard: data,
}: Props) {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? '';
    const [showInvitations, setShowInvitations] = useState(
        pendingInvitations.length > 0,
    );
    const [group, setGroup] = useState<FocusGroup>('overdue');

    const showGroup = (next: FocusGroup) => {
        setGroup(next);
        document
            .getElementById('my-focus')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <>
            <Head title="Dashboard" />
            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />

            {data ? (
                <div className="flex flex-col gap-3.5">
                    <section className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                        <GreetingCard data={data} onShow={showGroup} />
                        <DueTodayCard
                            teamSlug={teamSlug}
                            tasks={data.dueToday.items}
                            total={data.dueToday.total}
                            onMore={() => showGroup('today')}
                        />
                    </section>

                    <section
                        aria-label="Key numbers"
                        className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4"
                    >
                        <StatCard
                            label="Open tasks"
                            value={data.stats.open.value}
                            icon={ListTodo}
                            tone={TONES.indigo}
                            series={data.stats.open.series}
                            delay={220}
                            context={
                                <>
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                                        {signed(data.stats.open.sinceMonday)}
                                    </span>{' '}
                                    since Monday
                                </>
                            }
                        />
                        <StatCard
                            label="Due today"
                            value={data.stats.dueToday.value}
                            icon={CalendarClock}
                            tone={TONES.amber}
                            series={data.stats.dueToday.series}
                            delay={280}
                            context={priorityLine(
                                data.stats.dueToday.byPriority,
                            )}
                        />
                        <StatCard
                            label="Overdue"
                            value={data.stats.overdue.value}
                            icon={AlarmClock}
                            tone={TONES.red}
                            series={data.stats.overdue.series}
                            delay={340}
                            context={
                                data.stats.overdue.value === 0 ? (
                                    'All caught up'
                                ) : (
                                    <>
                                        <span className="font-semibold text-red-700 dark:text-red-300">
                                            {data.stats.overdue.projects}{' '}
                                            {data.stats.overdue.projects === 1
                                                ? 'project'
                                                : 'projects'}
                                        </span>
                                        {data.stats.overdue.oldestOn &&
                                            ` · oldest ${format(parseISO(data.stats.overdue.oldestOn), 'd MMM')}`}
                                    </>
                                )
                            }
                        />
                        <StatCard
                            label="Done in 7 days"
                            value={data.stats.done.value}
                            icon={CheckCheck}
                            tone={TONES.green}
                            series={data.stats.done.series}
                            delay={400}
                            context={doneLine(
                                data.stats.done.value,
                                data.stats.done.previous,
                            )}
                        />
                    </section>

                    <section className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                        <ThroughputChart throughput={data.throughput} />
                        <ProjectsCard
                            teamSlug={teamSlug}
                            projects={data.projects}
                        />
                    </section>

                    <section className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                        <FocusCard
                            teamSlug={teamSlug}
                            focus={data.focus}
                            group={group}
                            onGroupChange={setGroup}
                        />
                        <ActivityCard />
                    </section>
                </div>
            ) : (
                <p className="rounded-card bg-card p-8 text-center text-sm text-muted-foreground">
                    Join or create a team to see its dashboard.
                </p>
            )}
        </>
    );
}

function signed(value: number): string {
    return value > 0 ? `+${value}` : String(value);
}

function priorityLine(
    byPriority: DashboardData['stats']['dueToday']['byPriority'],
): string {
    const parts = [...PRIORITY_NAMES]
        .reverse()
        .filter((priority) => priority !== 'none' && byPriority[priority] > 0)
        .map(
            (priority) =>
                `${byPriority[priority]} ${PRIORITIES[priority].label.toLowerCase()}`,
        );

    return parts.length > 0 ? parts.join(' · ') : 'Nothing urgent today';
}

function doneLine(value: number, previous: number) {
    if (previous === 0) {
        return value === 0
            ? 'Nothing finished yet'
            : 'More than the 7 days before';
    }

    const change = Math.round(((value - previous) / previous) * 100);

    return (
        <>
            <span
                className={
                    change >= 0
                        ? 'font-semibold text-green-700 dark:text-green-300'
                        : 'font-semibold text-red-700 dark:text-red-300'
                }
            >
                {change >= 0 ? '+' : ''}
                {change}%
            </span>{' '}
            vs the 7 days before
        </>
    );
}

Dashboard.layout = (props: {
    currentTeam?: { name: string; slug: string } | null;
}) => ({
    breadcrumbs: [
        ...teamCrumb(props.currentTeam),
        {
            title: 'Dashboard',
            href: props.currentTeam ? dashboard(props.currentTeam.slug) : '/',
        },
    ],
});
