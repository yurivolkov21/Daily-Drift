import { usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { ProjectIcon } from '@/components/project-icon';
import {
    ProjectLeadButton,
    ProjectMenu,
    ProjectName,
    ProjectProgressBar,
    ProjectStatusPill,
    ProjectTargetDate,
} from '@/components/project-parts';
import type { ProjectActions } from '@/components/project-parts';
import { projectIssuesLine, sortProjects } from '@/lib/project-list';
import type { ProjectSortKey } from '@/lib/project-list';
import { projectProgress } from '@/lib/projects';
import { cn } from '@/lib/utils';
import type { ProjectSummary } from '@/types';

type Sort = { key: ProjectSortKey | null; ascending: boolean };

const columns: { key: ProjectSortKey; label: string; className?: string }[] = [
    { key: 'name', label: 'Project', className: 'pl-4' },
    { key: 'status', label: 'Status' },
    { key: 'lead', label: 'Lead' },
    { key: 'progress', label: 'Progress' },
    { key: 'target', label: 'Target' },
];

/**
 * Projects as a table (shadcnuikit Table 3 and shadcnspace table-01): a muted
 * header with sortable columns, the status as a pill, progress in the
 * project's color.
 */
export function ProjectTable({
    projects,
    actions,
}: {
    projects: ProjectSummary[];
    actions: ProjectActions;
}) {
    const members = usePage().props.workspace?.members ?? [];
    const [sort, setSort] = useState<Sort>({ key: null, ascending: true });
    const rows = sortProjects(projects, sort.key, sort.ascending, members);

    const sortBy = (key: ProjectSortKey) =>
        setSort((current) =>
            current.key !== key
                ? { key, ascending: true }
                : current.ascending
                  ? { key, ascending: false }
                  : { key: null, ascending: true },
        );

    return (
        <table
            className="w-full min-w-[42rem] text-sm"
            data-test="project-table"
        >
            <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b bg-muted/50">
                    {columns.map((column) => {
                        const isActive = sort.key === column.key;
                        const SortIcon = !isActive
                            ? ArrowUpDown
                            : sort.ascending
                              ? ArrowUp
                              : ArrowDown;

                        return (
                            <th
                                key={column.key}
                                aria-sort={
                                    isActive
                                        ? sort.ascending
                                            ? 'ascending'
                                            : 'descending'
                                        : undefined
                                }
                                className={cn(
                                    'h-10 px-3 text-left align-middle text-xs font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase',
                                    column.className,
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => sortBy(column.key)}
                                    className={cn(
                                        '-mx-1.5 inline-flex h-7 items-center gap-1.5 px-1.5 tracking-wider uppercase outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30',
                                        isActive && 'text-foreground',
                                    )}
                                >
                                    {column.label}
                                    <SortIcon
                                        aria-hidden
                                        className={cn(
                                            'size-3',
                                            !isActive && 'opacity-50',
                                        )}
                                    />
                                </button>
                            </th>
                        );
                    })}
                    <th className="h-10 w-12 pr-4">
                        <span className="sr-only">Actions</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                {rows.map((project) => {
                    const { percent } = projectProgress(project);

                    return (
                        <tr
                            key={project.id}
                            data-test="project-row"
                            className="border-b transition-colors last:border-0 hover:bg-muted/50 has-aria-expanded:bg-muted/50"
                        >
                            <td className="py-3 pr-3 pl-4 align-middle">
                                <div className="flex items-center gap-3">
                                    <ProjectIcon project={project} />
                                    <div className="min-w-0">
                                        <ProjectName
                                            project={project}
                                            className="max-w-64"
                                        />
                                        <p className="text-xs whitespace-nowrap text-muted-foreground">
                                            {project.key} ·{' '}
                                            {projectIssuesLine(project)}
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-3 align-middle">
                                <ProjectStatusPill project={project} />
                            </td>
                            <td className="max-w-48 p-3 align-middle">
                                <ProjectLeadButton project={project} />
                            </td>
                            <td className="p-3 align-middle">
                                <div className="flex w-36 items-center gap-3">
                                    <ProjectProgressBar project={project} />
                                    <span className="w-9 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
                                        {percent}%
                                    </span>
                                </div>
                            </td>
                            <td className="p-3 align-middle">
                                <ProjectTargetDate project={project} />
                            </td>
                            <td className="py-3 pr-4 pl-3 text-right align-middle">
                                <ProjectMenu
                                    project={project}
                                    actions={actions}
                                />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
