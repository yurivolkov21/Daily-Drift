import { Link } from '@inertiajs/react';
import {
    GitBranch,
    GitCommitHorizontal,
    GitMerge,
    GitPullRequest,
    GitPullRequestClosed,
    GitPullRequestDraft,
    Terminal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { apiTokenTools } from '@/lib/api-token-tools';
import { formatRelativeTime } from '@/lib/issue-activity';
import { cn } from '@/lib/utils';
import { show as showIssue } from '@/routes/issues';
import type { DashboardDevelopmentEntry, PullRequestState } from '@/types';

const chip =
    'inline-flex shrink-0 items-center border px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap uppercase';

const pullRequestStates: Record<
    PullRequestState,
    { label: string; icon: LucideIcon; className: string }
> = {
    draft: {
        label: 'Draft',
        icon: GitPullRequestDraft,
        className: 'text-muted-foreground',
    },
    open: {
        label: 'Open',
        icon: GitPullRequest,
        className: 'text-emerald-600 dark:text-emerald-400',
    },
    merged: {
        label: 'Merged',
        icon: GitMerge,
        className: 'text-violet-600 dark:text-violet-400',
    },
    closed: {
        label: 'Closed',
        icon: GitPullRequestClosed,
        className: 'text-destructive',
    },
};

const toolEvents: Record<string, string> = {
    session_started: 'started a session',
    session_ended: 'ended a session',
    branch_switched: 'switched branch',
    committed: 'committed',
    working: 'is working',
};

/**
 * The work the team's tools report: pull requests and commits from GitHub,
 * and sessions from AI coding tools, newest first. It takes the place the
 * "Local activity" card kept for step 3.
 */
export function DevelopmentCard({
    entries,
    teamSlug,
    emptyHint,
    className,
}: {
    entries: DashboardDevelopmentEntry[];
    teamSlug: string;
    emptyHint: ReactNode;
    className?: string;
}) {
    return (
        <section
            data-test="dashboard-development"
            className={cn(
                'flex flex-col bg-card text-sm text-card-foreground ring-1 ring-border',
                className,
            )}
        >
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                <GitBranch className="size-4 text-muted-foreground" />
                <h2 className="font-heading text-xs font-semibold tracking-wider uppercase">
                    Development
                </h2>
                <span className="ml-auto text-xs text-muted-foreground">
                    GitHub and coding tools, newest first
                </span>
            </div>

            {entries.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                    {emptyHint}
                </p>
            ) : (
                <ul className="divide-y">
                    {entries.map((entry) => (
                        <li key={`${entry.kind}-${entry.id}`}>
                            {entry.kind === 'link' ? (
                                <LinkRow entry={entry} />
                            ) : (
                                <ToolRow entry={entry} teamSlug={teamSlug} />
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-dashed px-4 py-3 text-xs text-muted-foreground">
                Builds, tests and local notes
                <span className={cn(chip, 'ml-auto text-muted-foreground')}>
                    Soon
                </span>
            </div>
        </section>
    );
}

function LinkRow({
    entry,
}: {
    entry: Extract<DashboardDevelopmentEntry, { kind: 'link' }>;
}) {
    const { link } = entry;
    const state =
        link.type === 'pull_request'
            ? pullRequestStates[link.state ?? 'open']
            : null;
    const Icon = state?.icon ?? GitCommitHorizontal;

    return (
        <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
        >
            <Icon
                className={cn(
                    'size-4 shrink-0',
                    state?.className ?? 'text-muted-foreground',
                )}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium">{link.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                    {[
                        link.type === 'pull_request'
                            ? `#${link.externalId}`
                            : link.externalId.slice(0, 7),
                        link.author,
                        entry.at ? formatRelativeTime(entry.at) : null,
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
            </span>
            <span className={cn(chip, 'text-muted-foreground')}>
                {entry.issue.identifier}
            </span>
            {state ? (
                <span
                    className={cn(
                        chip,
                        'hidden sm:inline-flex',
                        state.className,
                    )}
                >
                    {state.label}
                </span>
            ) : null}
        </a>
    );
}

function ToolRow({
    entry,
    teamSlug,
}: {
    entry: Extract<DashboardDevelopmentEntry, { kind: 'tool' }>;
    teamSlug: string;
}) {
    const preset = apiTokenTools.find((tool) => tool.value === entry.tool);
    const Icon = preset?.icon ?? Terminal;
    const what = toolEvents[entry.event] ?? entry.event.replaceAll('_', ' ');
    const content = (
        <>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate">
                    <span className="font-medium">
                        {entry.user ?? 'Someone'}
                    </span>{' '}
                    <span className="text-muted-foreground">
                        · {preset?.label ?? entry.tool} {what}
                    </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    {[
                        entry.branch,
                        entry.at ? formatRelativeTime(entry.at) : null,
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
            </span>
            {entry.issue ? (
                <span className={cn(chip, 'text-muted-foreground')}>
                    {entry.issue.identifier}
                </span>
            ) : null}
        </>
    );

    return entry.issue ? (
        <Link
            href={showIssue.url([teamSlug, entry.issue.identifier])}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
        >
            {content}
        </Link>
    ) : (
        <div className="flex items-center gap-3 px-4 py-2.5">{content}</div>
    );
}
