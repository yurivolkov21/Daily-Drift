import { projectProgress, projectStatusOrder } from '@/lib/projects';
import type { ProjectSummary, WorkspaceMember } from '@/types';

export type ProjectSortKey = 'name' | 'status' | 'lead' | 'progress' | 'target';

const byName = (a: ProjectSummary, b: ProjectSummary): number =>
    a.name.localeCompare(b.name, undefined, { numeric: true });

const byStatus = (a: ProjectSummary, b: ProjectSummary): number =>
    projectStatusOrder.indexOf(a.status) - projectStatusOrder.indexOf(b.status);

/**
 * Projects with work in flight first, then by name: the order of every view
 * until a column is sorted.
 */
export function defaultProjectOrder(
    a: ProjectSummary,
    b: ProjectSummary,
): number {
    return byStatus(a, b) || byName(a, b);
}

/**
 * Sorts by a column; ties fall back to the name. Projects without a lead or
 * a target date go last either way.
 */
export function sortProjects(
    projects: ProjectSummary[],
    key: ProjectSortKey | null,
    ascending: boolean,
    members: WorkspaceMember[],
): ProjectSummary[] {
    if (key === null) {
        return [...projects].sort(defaultProjectOrder);
    }

    const direction = ascending ? 1 : -1;
    const leadName = (project: ProjectSummary): string | null =>
        members.find((member) => member.id === project.leadId)?.name ?? null;

    const compare = (a: ProjectSummary, b: ProjectSummary): number => {
        switch (key) {
            case 'status':
                return direction * byStatus(a, b);
            case 'progress':
                return (
                    direction *
                    (projectProgress(a).percent - projectProgress(b).percent)
                );
            case 'lead': {
                const [first, second] = [leadName(a), leadName(b)];

                if (first === null || second === null) {
                    return Number(first === null) - Number(second === null);
                }

                return direction * first.localeCompare(second);
            }
            case 'target':
                if (a.targetDate === null || b.targetDate === null) {
                    return (
                        Number(a.targetDate === null) -
                        Number(b.targetDate === null)
                    );
                }

                return direction * a.targetDate.localeCompare(b.targetDate);
            default:
                return direction * byName(a, b);
        }
    };

    return [...projects].sort((a, b) => compare(a, b) || byName(a, b));
}

/**
 * "13 issues · 11 open", or "No issues yet".
 */
export function projectIssuesLine(project: ProjectSummary): string {
    if (project.issuesCount === 0) {
        return 'No issues yet';
    }

    return `${project.issuesCount} ${project.issuesCount === 1 ? 'issue' : 'issues'} · ${project.openIssuesCount} open`;
}
