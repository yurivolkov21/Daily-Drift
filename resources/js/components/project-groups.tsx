import { ChevronDown, Plus } from 'lucide-react';
import { Fragment } from 'react';
import { ProjectIcon } from '@/components/project-icon';
import {
    ProjectMenu,
    ProjectName,
    ProjectPeople,
    ProjectProgressBar,
    ProjectTargetDate,
} from '@/components/project-parts';
import type { ProjectActions } from '@/components/project-parts';
import { ProjectStatusIcon } from '@/components/project-status-icon';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    projectProgress,
    projectStatusLabel,
    projectStatusOrder,
} from '@/lib/projects';
import { cn } from '@/lib/utils';
import type { ProjectStatus, ProjectSummary } from '@/types';

function ProjectItem({
    project,
    actions,
}: {
    project: ProjectSummary;
    actions: ProjectActions;
}) {
    const { percent } = projectProgress(project);

    return (
        <div
            role="listitem"
            data-test="project-item"
            className="flex w-full flex-wrap items-center gap-x-3.5 gap-y-2 px-3.5 py-3 text-sm transition-colors hover:bg-muted/50"
        >
            <ProjectIcon project={project} className="self-start" />
            <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2 leading-snug">
                    <ProjectName project={project} />
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {project.key}
                    </span>
                </div>
                <p className="line-clamp-1 leading-relaxed text-muted-foreground">
                    {project.description || 'No description yet.'}
                </p>
            </div>
            <div className="flex items-center gap-4 max-sm:w-full max-sm:gap-3 max-sm:pl-11.5">
                <div className="flex w-28 shrink-0 items-center gap-2">
                    <ProjectProgressBar project={project} className="h-1" />
                    <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                        {percent}%
                    </span>
                </div>
                <div className="hidden w-20 sm:block">
                    <ProjectPeople project={project} />
                </div>
                <ProjectTargetDate
                    project={project}
                    withIcon
                    className="shrink-0 text-xs sm:w-28"
                />
                <div className="max-sm:ml-auto">
                    <ProjectMenu project={project} actions={actions} />
                </div>
            </div>
        </div>
    );
}

/**
 * Projects grouped by status (shadcnspace item-01): each group folds and has
 * a button that starts a project with that status.
 */
export function ProjectGroups({
    projects,
    actions,
    collapsed,
    onToggle,
    onCreate,
}: {
    projects: ProjectSummary[];
    actions: ProjectActions;
    collapsed: ProjectStatus[];
    onToggle: (status: ProjectStatus) => void;
    onCreate: ((status: ProjectStatus) => void) | null;
}) {
    const groups = projectStatusOrder
        .map((status) => ({
            status,
            projects: projects
                .filter((project) => project.status === status)
                .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .filter((group) => group.projects.length > 0);

    return (
        <div className="flex flex-col gap-6 p-4">
            {groups.map((group) => {
                const isCollapsed = collapsed.includes(group.status);
                const label = projectStatusLabel(group.status);

                return (
                    <section key={group.status} aria-label={label}>
                        <div className="mb-2 flex items-center gap-2">
                            <button
                                type="button"
                                aria-expanded={!isCollapsed}
                                onClick={() => onToggle(group.status)}
                                className="-ml-1 flex items-center gap-2 px-1 py-1 text-xs font-semibold tracking-wider uppercase outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
                            >
                                <ChevronDown
                                    className={cn(
                                        'size-3.5 text-muted-foreground transition-transform',
                                        isCollapsed && '-rotate-90',
                                    )}
                                />
                                <ProjectStatusIcon status={group.status} />
                                {label}
                                <span className="font-medium tracking-normal text-muted-foreground tabular-nums">
                                    {group.projects.length}
                                </span>
                            </button>
                            {onCreate ? (
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                className="ml-auto"
                                                aria-label={`New project in ${label}`}
                                                onClick={() =>
                                                    onCreate(group.status)
                                                }
                                            />
                                        }
                                    >
                                        <Plus />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        New project in {label}
                                    </TooltipContent>
                                </Tooltip>
                            ) : null}
                        </div>
                        {isCollapsed ? null : (
                            <div
                                role="list"
                                className="flex flex-col border bg-card"
                            >
                                {group.projects.map((project, index) => (
                                    <Fragment key={project.id}>
                                        {index > 0 ? (
                                            <div className="h-px bg-border" />
                                        ) : null}
                                        <ProjectItem
                                            project={project}
                                            actions={actions}
                                        />
                                    </Fragment>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
