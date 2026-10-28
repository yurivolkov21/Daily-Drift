export type IssueStatus =
    | 'backlog'
    | 'todo'
    | 'in_progress'
    | 'in_review'
    | 'done'
    | 'canceled';

export type IssuePriority = 0 | 1 | 2 | 3 | 4;

export type IssueView = 'list' | 'board';

export type IssueUser = {
    id: number;
    name: string;
};

export type Issue = {
    id: string;
    identifier: string;
    number: number;
    title: string;
    description: string | null;
    status: IssueStatus;
    priority: IssuePriority;
    dueDate: string | null;
    boardPosition: number | null;
    projectId: string;
    assignee?: IssueUser | null;
    creator?: IssueUser | null;
    labelIds?: string[];
    commentsCount?: number;
    subtasksCount?: number;
    completedSubtasksCount?: number;
    subtasks?: IssueSubtask[];
    createdAt: string;
    updatedAt: string;
};

export type IssueSubtask = {
    id: string;
    title: string;
    completed: boolean;
};

export type PullRequestState = 'draft' | 'open' | 'merged' | 'closed';

/**
 * A pull request or commit on GitHub that names the issue. The external id
 * is the pull request's number or the commit's SHA.
 */
export type IssueLink = {
    id: string;
    type: 'pull_request' | 'commit';
    repository: string;
    externalId: string;
    title: string;
    url: string;
    state: PullRequestState | null;
    author: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

/**
 * The issue opened in the board's quick view.
 */
export type IssuePeek = {
    issue: Issue;
    subtasks: IssueSubtask[];
};

export type IssueComment = {
    id: string;
    body: string;
    author?: IssueUser | null;
    createdAt: string;
    updatedAt: string;
};

type Change<T> = {
    from: T;
    to: T;
};

export type IssueActivity = {
    id: string;
    actor?: IssueUser | null;
    createdAt: string;
} & (
    | { type: 'created' | 'description_changed'; properties: null }
    | { type: 'title_changed'; properties: Change<string> }
    | { type: 'status_changed'; properties: Change<IssueStatus> }
    | { type: 'priority_changed'; properties: Change<IssuePriority> }
    | { type: 'assignee_changed'; properties: Change<IssueUser | null> }
    | { type: 'due_date_changed'; properties: Change<string | null> }
    | {
          type: 'labels_changed';
          properties: { added: IssueLabel[]; removed: IssueLabel[] };
      }
);

export type IssueTimelineEntry =
    | { kind: 'comment'; id: string; createdAt: string; comment: IssueComment }
    | {
          kind: 'activity';
          id: string;
          createdAt: string;
          activity: IssueActivity;
      };

/**
 * A timeline entry, or one row that stands in for the earlier changes of a
 * long run of back to back changes.
 */
export type IssueTimelineRow =
    | IssueTimelineEntry
    | { kind: 'earlierChanges'; id: string; runId: string; count: number };

export type IssueActivityFilter = 'all' | 'comments' | 'history';

export type IssueFilters = {
    project: string | null;
    assignee: 'me' | null;
};

export type Project = {
    id: string;
    key: string;
    name: string;
    icon: string;
    color: string;
};

export type ProjectStatus =
    | 'planned'
    | 'in_progress'
    | 'paused'
    | 'completed'
    | 'canceled';

export type ProjectSummary = Project & {
    description: string | null;
    status: ProjectStatus;
    leadId: number | null;
    targetDate: string | null;
    issuesCount: number;
    openIssuesCount: number;
    completedIssuesCount: number;
    canceledIssuesCount: number;
    assigneeIds: number[];
};

export type IssueLabel = {
    id: string;
    name: string;
    color: string;
};

export type IssueLabelSummary = IssueLabel & {
    issuesCount: number;
};

export type WorkspaceMember = {
    id: number;
    name: string;
    email: string;
};

export type Workspace = {
    projects: Project[];
    labels: IssueLabel[];
    members: WorkspaceMember[];
};
