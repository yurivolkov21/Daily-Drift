import type { IssueLink, IssueTimelineEntry } from './issues';

type DashboardIssueReference = {
    identifier: string;
    title: string;
};

/**
 * An entry on the Development card: a pull request or commit linked to an
 * issue, or something a coding tool reported through the API.
 */
export type DashboardDevelopmentEntry =
    | {
          kind: 'link';
          id: string;
          at: string | null;
          issue: DashboardIssueReference;
          link: IssueLink;
      }
    | {
          kind: 'tool';
          id: string;
          at: string | null;
          issue: DashboardIssueReference | null;
          tool: string;
          event: string;
          branch: string | null;
          user: string | null;
      };

/**
 * Whether the team's repositories send their events, and whether the reader
 * may connect them.
 */
export type DashboardGithub = {
    connected: boolean;
    canConnect: boolean;
};

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
