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
    projectId: string;
    assignee?: IssueUser | null;
    creator?: IssueUser | null;
    labelIds?: string[];
    createdAt: string;
    updatedAt: string;
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
};

export type ProjectSummary = Project & {
    description: string | null;
    issuesCount: number;
    openIssuesCount: number;
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
