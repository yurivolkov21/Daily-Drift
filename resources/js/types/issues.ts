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
