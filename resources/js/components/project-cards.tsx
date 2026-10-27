import { Plus } from 'lucide-react';
import { MemberAvatar } from '@/components/member-avatar';
import { ProjectIcon } from '@/components/project-icon';
import {
    ProjectMenu,
    ProjectName,
    ProjectProgressBar,
    ProjectStatusBadge,
    ProjectTargetDate,
    useMember,
} from '@/components/project-parts';
import type { ProjectActions } from '@/components/project-parts';
import { defaultProjectOrder, projectIssuesLine } from '@/lib/project-list';
import { projectProgress } from '@/lib/projects';
import type { ProjectSummary } from '@/types';

/**
 * One project as a card: the anatomy of shadcnuikit Stat Card 1 (title, menu
 * in the corner, a footer under a rule) with the progress block of
 * shadcnstudio progress-14.
 */
function ProjectCard({
    project,
    actions,
}: {
    project: ProjectSummary;
    actions: ProjectActions;
}) {
    const { done, total } = projectProgress(project);
    const lead = useMember(project.leadId);

    return (
        <article
            data-slot="card"
            data-test="project-card"
            className="flex flex-col gap-5 bg-card py-5 text-sm text-card-foreground ring-1 ring-border transition-[box-shadow] hover:ring-foreground/25"
        >
            <header className="grid grid-cols-[1fr_auto] items-start gap-1.5 px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <ProjectIcon project={project} size="default" />
                    <div className="min-w-0">
                        <ProjectName
                            project={project}
                            className="text-base font-semibold"
                        />
                        <p className="text-xs text-muted-foreground">
                            {project.key} · {projectIssuesLine(project)}
                        </p>
                    </div>
                </div>
                <div className="-mt-1 -mr-2">
                    <ProjectMenu project={project} actions={actions} />
                </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 px-5">
                <ProjectStatusBadge project={project} />
                <p className="line-clamp-2 min-h-[2lh] leading-relaxed text-muted-foreground">
                    {project.description || 'No description yet.'}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold tracking-wide uppercase">
                        Progress
                    </span>
                    <span className="ml-auto text-muted-foreground tabular-nums">
                        {done} / {total} done
                    </span>
                    <ProjectProgressBar project={project} />
                </div>
            </div>
            <footer className="flex items-center gap-3 border-t px-5 pt-5 text-xs text-muted-foreground">
                {lead ? (
                    <span className="flex min-w-0 items-center gap-2">
                        <MemberAvatar name={lead.name} />
                        <span className="truncate">{lead.name}</span>
                    </span>
                ) : (
                    <span>No lead</span>
                )}
                <ProjectTargetDate
                    project={project}
                    withIcon
                    empty="No target date"
                    className="ml-auto"
                />
            </footer>
        </article>
    );
}

/**
 * Projects as a grid of cards, ending with a tile that starts a new one
 * (shadcnspace empty-state-01).
 */
export function ProjectCards({
    projects,
    actions,
    onCreate,
}: {
    projects: ProjectSummary[];
    actions: ProjectActions;
    onCreate: (() => void) | null;
}) {
    return (
        <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...projects].sort(defaultProjectOrder).map((project) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    actions={actions}
                />
            ))}
            {onCreate ? (
                <button
                    type="button"
                    onClick={onCreate}
                    className="flex min-h-56 flex-col items-center justify-center gap-4 border border-dashed p-8 text-center transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                    <span className="flex size-10 items-center justify-center bg-muted">
                        <Plus className="size-5" />
                    </span>
                    <span className="flex flex-col items-center gap-1">
                        <span className="font-heading text-sm font-semibold tracking-wider uppercase">
                            New project
                        </span>
                        <span className="text-sm text-muted-foreground">
                            Pick an icon, a key and a lead.
                        </span>
                    </span>
                </button>
            ) : null}
        </div>
    );
}
