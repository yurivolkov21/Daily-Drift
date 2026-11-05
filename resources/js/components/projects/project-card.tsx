import { Link } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Archive, Columns3 } from 'lucide-react';
import { ProjectMenu } from '@/components/projects/project-menu';
import { ProjectTile } from '@/components/projects/project-tile';
import { HueBar } from '@/components/hue-progress';
import { HUES } from '@/lib/hues';
import { percent } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { show } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    teamSlug: string;
    project: Project;
};

export function ProjectCard({ teamSlug, project }: Props) {
    const progress = percent(project.stats.completed, project.stats.tasks);

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
            <div
                className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent',
                    HUES[project.color].gradient,
                )}
            />
            <div className="relative flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                    <ProjectTile name={project.name} color={project.color} />
                    <div className="min-w-0 flex-1">
                        <Link
                            href={show({
                                current_team: teamSlug,
                                project: project.id,
                            })}
                            prefetch
                            className="block truncate font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                        >
                            {project.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                            {project.updatedAt
                                ? `Updated ${formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}`
                                : 'Not updated yet'}
                        </p>
                    </div>
                    <ProjectMenu
                        teamSlug={teamSlug}
                        project={project}
                        className="-mt-1 -mr-2"
                    />
                </div>

                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                    {project.description || 'No description yet.'}
                </p>

                <div className="grid grid-cols-3 gap-2">
                    <MiniStat
                        label="Open"
                        value={project.stats.tasks - project.stats.completed}
                    />
                    <MiniStat
                        label="Due this week"
                        value={project.stats.dueSoon}
                    />
                    <MiniStat
                        label="Overdue"
                        value={project.stats.overdue}
                        className={
                            project.stats.overdue > 0
                                ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                : undefined
                        }
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                            {project.stats.completed} of {project.stats.tasks}{' '}
                            tasks done
                        </span>
                        <span className="font-semibold tabular-nums">
                            {progress}%
                        </span>
                    </div>
                    <HueBar value={progress} hue={project.color} />
                </div>
            </div>
            <div className="relative flex items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <Columns3 className="size-3.5" />
                    {project.lists.length}{' '}
                    {project.lists.length === 1 ? 'list' : 'lists'}
                </span>
                {project.archivedAt ? (
                    <span className="flex items-center gap-1.5">
                        <Archive className="size-3.5" /> Archived
                    </span>
                ) : (
                    project.creatorName && (
                        <span className="truncate">
                            By {project.creatorName}
                        </span>
                    )
                )}
            </div>
        </div>
    );
}

function MiniStat({
    label,
    value,
    className,
}: {
    label: string;
    value: number;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2',
                className,
            )}
        >
            <span className="truncate text-[11px] text-muted-foreground">
                {label}
            </span>
            <span className="text-base font-semibold tabular-nums">
                {value}
            </span>
        </div>
    );
}
