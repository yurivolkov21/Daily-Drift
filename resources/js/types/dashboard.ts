import type { IssueTimelineEntry } from './issues';

/**
 * When one of the team's issues was done.
 */
export type IssueCompletion = {
    issueId: string;
    completedAt: string;
};

/**
 * A change or comment in the team's activity feed, with the issue it is about.
 */
export type DashboardActivityEntry = IssueTimelineEntry & {
    issue: {
        identifier: string;
        title: string;
    };
};
