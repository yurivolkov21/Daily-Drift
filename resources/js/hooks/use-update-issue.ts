import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { update } from '@/routes/issues';
import type { Issue, IssuePriority, IssueStatus } from '@/types';

export type IssueChanges = {
    title?: string;
    description?: string | null;
    status?: IssueStatus;
    priority?: IssuePriority;
    assignee_id?: number | null;
    due_date?: string | null;
    label_ids?: string[];
};

type IssuePageProps = {
    issue?: Issue;
    issues?: Issue[];
};

/**
 * Update an issue in place, showing the change before the server confirms it.
 */
export function useUpdateIssue(): (
    issue: Issue,
    changes: IssueChanges,
) => void {
    const page = usePage();
    const team = page.props.currentTeam;
    const members = page.props.workspace?.members ?? [];

    return (issue, changes) => {
        if (!team) {
            return;
        }

        const assignee =
            changes.assignee_id === undefined
                ? issue.assignee
                : (members.find(({ id }) => id === changes.assignee_id) ??
                  null);

        const updatedIssue: Issue = {
            ...issue,
            title: changes.title ?? issue.title,
            description:
                changes.description === undefined
                    ? issue.description
                    : changes.description,
            status: changes.status ?? issue.status,
            priority: changes.priority ?? issue.priority,
            dueDate:
                changes.due_date === undefined
                    ? issue.dueDate
                    : changes.due_date,
            labelIds: changes.label_ids ?? issue.labelIds,
            assignee: assignee
                ? { id: assignee.id, name: assignee.name }
                : null,
        };

        router
            .optimistic<IssuePageProps>((props) => ({
                ...(props.issue?.id === issue.id
                    ? { issue: updatedIssue }
                    : {}),
                ...(props.issues
                    ? {
                          issues: props.issues.map((candidate) =>
                              candidate.id === issue.id
                                  ? updatedIssue
                                  : candidate,
                          ),
                      }
                    : {}),
            }))
            .patch(update.url([team.slug, issue.identifier]), changes, {
                preserveScroll: true,
                preserveState: true,
                onError: (errors) => {
                    toast.error(
                        Object.values(errors)[0] ??
                            'The issue could not be updated.',
                    );
                },
            });
    };
}
