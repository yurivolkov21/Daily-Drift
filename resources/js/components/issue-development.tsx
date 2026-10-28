import {
    ChevronRight,
    GitBranch,
    GitCommitHorizontal,
    GitMerge,
    GitPullRequest,
    GitPullRequestClosed,
    GitPullRequestDraft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { CodeBlockCopyButton } from '@/components/ui/code-block';
import { formatRelativeTime } from '@/lib/issue-activity';
import { branchName } from '@/lib/issues';
import { cn } from '@/lib/utils';
import type { IssueLink, PullRequestState } from '@/types';

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

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * The pull requests and commits on GitHub that name the issue, under its
 * sub-tasks (option A of the GitHub prototype): a row per pull request with
 * its state, and the commits folded below. The branch name to copy names the
 * issue, so work on it links itself.
 */
export function IssueDevelopment({
    identifier,
    title,
    links,
}: {
    identifier: string;
    title: string;
    links: IssueLink[];
}) {
    const [showCommits, setShowCommits] = useState(true);
    const pullRequests = links.filter((link) => link.type === 'pull_request');
    const commits = links.filter((link) => link.type === 'commit');
    const branch = branchName(identifier, title);

    return (
        <section
            aria-labelledby="issue-development-heading"
            data-test="issue-development"
            className="grid gap-3"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                    id="issue-development-heading"
                    className="text-xs font-semibold tracking-wider uppercase"
                >
                    Development
                    {links.length > 0 ? (
                        <span className="ml-2 font-normal tracking-normal text-muted-foreground normal-case tabular-nums">
                            {[
                                pullRequests.length > 0 &&
                                    plural(pullRequests.length, 'pull request'),
                                commits.length > 0 &&
                                    plural(commits.length, 'commit'),
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                    ) : null}
                </h2>
                <span className="flex min-w-0 items-center gap-1">
                    <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                    <code className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                        {branch}
                    </code>
                    <CodeBlockCopyButton
                        value={branch}
                        aria-label="Copy git branch name"
                    />
                </span>
            </div>

            {links.length === 0 ? (
                <p className="border border-dashed p-4 text-sm text-muted-foreground">
                    Name a branch, a pull request or a commit after {identifier}
                    , and it shows up here.
                </p>
            ) : (
                <div className="divide-y border">
                    {pullRequests.map((link) => {
                        const state = pullRequestStates[link.state ?? 'open'];

                        return (
                            <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full items-center gap-3 px-3.5 py-3 text-sm transition-colors hover:bg-muted/50"
                            >
                                <state.icon
                                    className={cn(
                                        'size-4 shrink-0',
                                        state.className,
                                    )}
                                />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="truncate font-medium">
                                        {link.title}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        #{link.externalId} · {link.repository}
                                        {link.author ? ` · ${link.author}` : ''}
                                        {link.updatedAt
                                            ? ` · ${formatRelativeTime(link.updatedAt)}`
                                            : ''}
                                    </span>
                                </span>
                                <span className={cn(chip, state.className)}>
                                    {state.label}
                                </span>
                            </a>
                        );
                    })}

                    {commits.length > 0 ? (
                        <div>
                            <button
                                type="button"
                                aria-expanded={showCommits}
                                onClick={() => setShowCommits(!showCommits)}
                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
                            >
                                <ChevronRight
                                    className={cn(
                                        'size-4 shrink-0 transition-transform',
                                        showCommits && 'rotate-90',
                                    )}
                                />
                                {plural(commits.length, 'commit')}
                            </button>
                            {showCommits ? (
                                <ul className="pb-1.5">
                                    {commits.map((link) => (
                                        <li key={link.id}>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 px-3.5 py-1.5 text-sm transition-colors hover:bg-muted/50"
                                            >
                                                <GitCommitHorizontal className="size-4 shrink-0 text-muted-foreground" />
                                                <code className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                                                    {link.externalId.slice(
                                                        0,
                                                        7,
                                                    )}
                                                </code>
                                                <span className="min-w-0 flex-1 truncate">
                                                    {link.title}
                                                </span>
                                                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                                                    {[
                                                        link.author,
                                                        link.createdAt
                                                            ? formatRelativeTime(
                                                                  link.createdAt,
                                                              )
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            )}
        </section>
    );
}
