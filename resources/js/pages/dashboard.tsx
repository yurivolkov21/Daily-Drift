import { Head, Link, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    Activity,
    CalendarDays,
    FolderKanban,
    ListTodo,
    PartyPopper,
    Plus,
    Target,
} from 'lucide-react';
import { useState } from 'react';
import { ActivityFeed } from '@/components/dashboard-activity';
import { WeekAgenda } from '@/components/dashboard-agenda';
import { DevelopmentCard } from '@/components/dashboard-development';
import { DashboardIssueTable } from '@/components/dashboard-issue-table';
import {
    DashboardGreeting,
    DashboardWidget,
    GetStarted,
    StatStrip,
    WidgetEmpty,
    WidgetLink,
} from '@/components/dashboard-parts';
import type {
    DashboardStat,
    GreetingPart,
    SetupStep,
} from '@/components/dashboard-parts';
import { ProjectRows } from '@/components/dashboard-projects';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { ProjectDialog } from '@/components/project-dialog';
import { Button } from '@/components/ui/button';
import { realtimeEnabled } from '@/components/workspace-updates';
import { useIssueTracker } from '@/hooks/use-issue-tracker';
import {
    countByAssignee,
    dueWhen,
    greeting,
    isDueThisWeek,
    sortByFocus,
    weekThroughput,
} from '@/lib/dashboard';
import { isOverdue } from '@/lib/issues';
import { isProjectClosed, projectStatusOrder } from '@/lib/projects';
import { dashboard, inbox } from '@/routes';
import { index as apiTokensIndex } from '@/routes/api-tokens';
import { index as issuesIndex } from '@/routes/issues';
import { index as projectsIndex } from '@/routes/projects';
import { edit as editTeam } from '@/routes/teams';
import type {
    DashboardActivityEntry,
    DashboardDevelopmentEntry,
    DashboardGithub,
    DashboardInvitation,
    Issue,
    IssueCompletion,
    ProjectSummary,
} from '@/types';

type Props = {
    pendingInvitations?: DashboardInvitation[];
    assignedIssues: Issue[];
    dueIssues: Issue[];
    completions: IssueCompletion[];
    activity: DashboardActivityEntry[];
    development: DashboardDevelopmentEntry[];
    projects: ProjectSummary[];
    canInviteMembers: boolean;
    github: DashboardGithub;
};

/**
 * How many of the user's issues the focus list shows.
 */
const focusLimit = 6;

export default function Dashboard({
    pendingInvitations = [],
    assignedIssues,
    dueIssues,
    completions,
    activity,
    development,
    projects,
    canInviteMembers,
    github,
}: Props) {
    const page = usePage();
    const { openCreateIssue } = useIssueTracker();
    const user = page.props.auth.user;
    const team = page.props.currentTeam;
    const teamSlug = team?.slug ?? '';
    const members = page.props.workspace?.members ?? [];
    const unread = page.props.unreadNotificationsCount;
    const [showInvitations, setShowInvitations] = useState(
        pendingInvitations.length > 0,
    );
    const [projectDialog, setProjectDialog] = useState({
        open: false,
        session: 0,
    });
    const [agendaScope, setAgendaScope] = useState<'mine' | 'team'>('mine');

    const myIssuesUrl = issuesIndex.url(teamSlug, {
        query: { assignee: 'me' },
    });
    const focus = sortByFocus(assignedIssues);
    const overdue = assignedIssues.filter(isOverdue);
    const dueThisWeek = assignedIssues
        .filter(isDueThisWeek)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    const teamOverdue = dueIssues.filter(isOverdue);
    const throughput = weekThroughput(completions);
    const activeProjects = projects
        .filter((project) => !isProjectClosed(project))
        .sort(
            (a, b) =>
                projectStatusOrder.indexOf(a.status) -
                projectStatusOrder.indexOf(b.status),
        );
    const completedProjects = projects.filter(
        (project) => project.status === 'completed',
    ).length;
    const hasIssues = projects.some((project) => project.issuesCount > 0);
    const nextDue = dueThisWeek[0];

    const openProjectDialog = () =>
        setProjectDialog((current) => ({
            open: true,
            session: current.session + 1,
        }));

    const newIssueButton = (defaults: { assigneeId?: number } = {}) => (
        <Button
            size="xs"
            disabled={projects.length === 0}
            onClick={() => openCreateIssue(defaults)}
        >
            <Plus />
            New issue
        </Button>
    );

    const greetingParts: GreetingPart[] = [];

    if (overdue.length > 0) {
        greetingParts.push({
            id: 'overdue',
            text: `${overdue.length} overdue ${overdue.length === 1 ? 'issue' : 'issues'}`,
            href: myIssuesUrl,
            danger: true,
        });
    }

    if (dueThisWeek.length > 0) {
        greetingParts.push({
            id: 'due',
            text: `${dueThisWeek.length} due this week`,
            href: myIssuesUrl,
        });
    }

    if (unread > 0) {
        greetingParts.push({
            id: 'inbox',
            text: `${unread} unread ${unread === 1 ? 'notification' : 'notifications'}`,
            href: inbox.url(),
        });
    }

    const stats: DashboardStat[] = [
        {
            id: 'assigned',
            label: 'Assigned to you',
            value: assignedIssues.length,
            caption: `${assignedIssues.filter((issue) => issue.status === 'in_progress').length} in progress`,
            href: myIssuesUrl,
        },
        {
            id: 'due',
            label: 'Due this week',
            value: dueThisWeek.length,
            caption: nextDue?.dueDate
                ? `Next: ${nextDue.identifier} ${dueWhen(nextDue.dueDate)}`
                : 'Nothing due',
        },
        {
            id: 'overdue',
            label: 'Overdue in team',
            value: teamOverdue.length,
            caption:
                teamOverdue.length > 0
                    ? countByAssignee(teamOverdue, user.id)
                    : 'All on time',
            danger: true,
        },
        {
            id: 'done',
            label: 'Team done this week',
            value: throughput.thisWeek,
            caption: `${throughput.lastWeek} last week`,
            spark: {
                values: throughput.days,
                labels: throughput.labels,
                unit: 'done',
            },
        },
    ];

    const setupSteps: SetupStep[] = [
        {
            id: 'team',
            title: 'Create your team',
            hint: `${team?.name ?? 'Your team'} is ready for you.`,
            done: true,
        },
        {
            id: 'project',
            title: 'Create a project',
            hint: 'A project gives its issues a key, like DD-1.',
            done: projects.length > 0,
            action: (
                <Button size="xs" onClick={openProjectDialog}>
                    New project
                </Button>
            ),
        },
        {
            id: 'issue',
            title: 'Create your first issue',
            hint: 'Press C anywhere in the app.',
            done: hasIssues,
            action: (
                <Button
                    size="xs"
                    variant="outline"
                    disabled={projects.length === 0}
                    onClick={() => openCreateIssue()}
                >
                    New issue
                </Button>
            ),
        },
        {
            id: 'invite',
            title: 'Invite a teammate',
            hint: canInviteMembers
                ? 'They get an email with a link to join.'
                : 'An owner or admin of the team can invite people.',
            done: members.length > 1,
            action: canInviteMembers ? (
                <Button
                    size="xs"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={editTeam.url(teamSlug)} />}
                >
                    Invite
                </Button>
            ) : undefined,
        },
        {
            id: 'github',
            title: 'Connect GitHub',
            hint: github.canConnect
                ? 'Link commits and pull requests to issues.'
                : 'An owner or admin of the team can connect it.',
            done: github.connected,
            action: github.canConnect ? (
                <Button
                    size="xs"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={editTeam.url(teamSlug)} />}
                >
                    Connect
                </Button>
            ) : undefined,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />

            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                    <h1 className="mr-2 text-sm font-semibold">Dashboard</h1>
                    <div className="ml-auto flex items-center gap-1">
                        {newIssueButton()}
                    </div>
                </div>

                <div className="min-h-0 flex-1 scroll-fade-y overflow-y-auto">
                    <div className="@container/dashboard flex flex-col gap-4 p-4">
                        <DashboardGreeting
                            title={`${greeting()}, ${user.name.split(' ')[0]}`}
                            date={format(new Date(), 'EEEE, MMMM d')}
                            parts={greetingParts}
                            fallback={
                                !hasIssues
                                    ? 'Your team is ready. A project and a first issue are all it takes to start.'
                                    : assignedIssues.length > 0
                                      ? `Nothing is late or due this week. ${assignedIssues.length} open ${assignedIssues.length === 1 ? 'issue is' : 'issues are'} assigned to you.`
                                      : 'Nothing is assigned to you right now.'
                            }
                        />

                        {hasIssues ? (
                            <StatStrip stats={stats} />
                        ) : (
                            <GetStarted steps={setupSteps} />
                        )}

                        <div className="grid gap-4 @4xl/dashboard:grid-cols-12">
                            <DashboardWidget
                                title="Your focus"
                                icon={Target}
                                meta={
                                    focus.length > 0
                                        ? 'Late first, then due, then in flight'
                                        : null
                                }
                                action={
                                    focus.length > 0 ? (
                                        <WidgetLink href={myIssuesUrl}>
                                            My issues
                                        </WidgetLink>
                                    ) : null
                                }
                                footer={
                                    focus.length > focusLimit ? (
                                        <>
                                            <span>
                                                Showing {focusLimit} of{' '}
                                                {focus.length}
                                            </span>
                                            <Link
                                                href={myIssuesUrl}
                                                className="ml-auto font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline"
                                            >
                                                See the other{' '}
                                                {focus.length - focusLimit}
                                            </Link>
                                        </>
                                    ) : null
                                }
                                className="@4xl/dashboard:col-span-7"
                            >
                                {focus.length > 0 ? (
                                    <DashboardIssueTable
                                        issues={focus.slice(0, focusLimit)}
                                        columns={[
                                            'priority',
                                            'identifier',
                                            'status',
                                            'title',
                                            'labels',
                                            'dueDate',
                                            'project',
                                        ]}
                                        label="Your focus"
                                    />
                                ) : (
                                    <WidgetEmpty
                                        icon={
                                            hasIssues ? PartyPopper : ListTodo
                                        }
                                        title={
                                            hasIssues
                                                ? 'Nothing assigned to you'
                                                : 'No issues yet'
                                        }
                                        action={newIssueButton({
                                            assigneeId: user.id,
                                        })}
                                    >
                                        {hasIssues
                                            ? 'Pick something up from the backlog, or create a new issue.'
                                            : 'Press C anywhere to create one.'}
                                    </WidgetEmpty>
                                )}
                            </DashboardWidget>

                            <DashboardWidget
                                title="Activity"
                                icon={Activity}
                                live={realtimeEnabled}
                                className="@4xl/dashboard:col-span-5"
                                bodyClassName="flex flex-col"
                            >
                                {activity.length > 0 ? (
                                    <div className="relative min-h-80 flex-1 @4xl/dashboard:min-h-60">
                                        <div className="absolute inset-0 scroll-fade-y overflow-y-auto">
                                            <ActivityFeed entries={activity} />
                                        </div>
                                    </div>
                                ) : (
                                    <WidgetEmpty
                                        icon={Activity}
                                        title="No activity yet"
                                    >
                                        What your team does shows up here as it
                                        happens.
                                    </WidgetEmpty>
                                )}
                            </DashboardWidget>

                            <DashboardWidget
                                title="Projects"
                                icon={FolderKanban}
                                meta={
                                    activeProjects.length > 0
                                        ? `${activeProjects.length} active${completedProjects > 0 ? ` · ${completedProjects} completed` : ''}`
                                        : null
                                }
                                action={
                                    projects.length > 0 ? (
                                        <WidgetLink
                                            href={projectsIndex.url(teamSlug)}
                                        >
                                            All
                                        </WidgetLink>
                                    ) : null
                                }
                                className="@4xl/dashboard:col-span-7"
                            >
                                {activeProjects.length > 0 ? (
                                    <ProjectRows projects={activeProjects} />
                                ) : projects.length > 0 ? (
                                    <WidgetEmpty
                                        icon={FolderKanban}
                                        title="No active projects"
                                    >
                                        Every project is completed or canceled.
                                    </WidgetEmpty>
                                ) : (
                                    <WidgetEmpty
                                        icon={FolderKanban}
                                        title="No projects yet"
                                        action={
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                onClick={openProjectDialog}
                                            >
                                                <Plus />
                                                New project
                                            </Button>
                                        }
                                    >
                                        A project gives its issues a key, like
                                        DD-1.
                                    </WidgetEmpty>
                                )}
                            </DashboardWidget>

                            <DashboardWidget
                                title="Next 7 days"
                                icon={CalendarDays}
                                action={
                                    <div
                                        role="group"
                                        aria-label="Whose issues"
                                        className="flex items-center gap-1"
                                    >
                                        {(['mine', 'team'] as const).map(
                                            (scope) => (
                                                <Button
                                                    key={scope}
                                                    size="xs"
                                                    variant={
                                                        agendaScope === scope
                                                            ? 'secondary'
                                                            : 'ghost'
                                                    }
                                                    aria-pressed={
                                                        agendaScope === scope
                                                    }
                                                    onClick={() =>
                                                        setAgendaScope(scope)
                                                    }
                                                >
                                                    {scope === 'mine'
                                                        ? 'Mine'
                                                        : 'Team'}
                                                </Button>
                                            ),
                                        )}
                                    </div>
                                }
                                className="@4xl/dashboard:col-span-5"
                            >
                                <WeekAgenda
                                    issues={
                                        agendaScope === 'mine'
                                            ? dueIssues.filter(
                                                  (issue) =>
                                                      issue.assignee?.id ===
                                                      user.id,
                                              )
                                            : dueIssues
                                    }
                                    showAssignee={agendaScope === 'team'}
                                />
                            </DashboardWidget>

                            <DevelopmentCard
                                entries={development}
                                teamSlug={teamSlug}
                                className="@4xl/dashboard:col-span-12"
                                emptyHint={
                                    <>
                                        Nothing yet.{' '}
                                        {github.connected ? (
                                            'Name a branch, pull request or commit after an issue, like DD-12.'
                                        ) : (
                                            <>
                                                Connect GitHub in the{' '}
                                                <Link
                                                    href={editTeam.url(
                                                        teamSlug,
                                                    )}
                                                    className="text-foreground underline underline-offset-4"
                                                >
                                                    team&apos;s settings
                                                </Link>
                                                .
                                            </>
                                        )}{' '}
                                        AI coding tools show up once they have
                                        an{' '}
                                        <Link
                                            href={apiTokensIndex.url()}
                                            className="text-foreground underline underline-offset-4"
                                        >
                                            API token
                                        </Link>
                                        .
                                    </>
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            <ProjectDialog
                key={projectDialog.session}
                open={projectDialog.open}
                onOpenChange={(open) =>
                    setProjectDialog((current) => ({ ...current, open }))
                }
            />
        </>
    );
}

Dashboard.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: props.currentTeam ? dashboard(props.currentTeam.slug) : '/',
        },
    ],
});
