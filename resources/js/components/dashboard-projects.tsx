import { Link, usePage } from '@inertiajs/react';
import { ProjectIcon } from '@/components/project-icon';
import {
    ProjectProgressBar,
    ProjectTargetDate,
} from '@/components/project-parts';
import { ProjectStatusIcon } from '@/components/project-status-icon';
import { projectProgress, projectStatusLabel } from '@/lib/projects';
import { index as issuesIndex } from '@/routes/issues';
import type { ProjectSummary } from '@/types';

/**
 * Projects as rows (shadcnstudio widget-total-earning): the project's tile,
 * its name over how much is done and the target date, and the progress bar
 * in its color. A row opens the project's issues.
 */
export function ProjectRows({ projects }: { projects: ProjectSummary[] }) {
    const teamSlug = usePage().props.currentTeam?.slug ?? '';

    return (
        <ul>
            {projects.map((project) => {
                const { done, total, percent } = projectProgress(project);

                return (
                    <li
                        key={project.id}
                        className="relative flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/40"
                    >
                        <ProjectIcon project={project} />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex min-w-0 items-center gap-2">
                                <Link
                                    href={issuesIndex.url(teamSlug, {
                                        query: { project: project.key },
                                    })}
                                    className="truncate font-medium underline-offset-4 outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
                                >
                                    {project.name}
                                </Link>
                                <span
                                    title={projectStatusLabel(project.status)}
                                    className="flex"
                                >
                                    <ProjectStatusIcon
                                        status={project.status}
                                        className="size-3"
                                    />
                                </span>
                            </span>
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                <span className="tabular-nums">
                                    {done} / {total} done
                                </span>
                                <span aria-hidden="true">·</span>
                                <ProjectTargetDate
                                    project={project}
                                    withIcon
                                    empty="No target"
                                />
                            </span>
                        </div>
                        <div className="flex w-20 shrink-0 flex-col items-end gap-1.5 @md/dashboard:w-28">
                            <span className="text-xs font-medium tabular-nums">
                                {percent}%
                            </span>
                            <ProjectProgressBar project={project} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
