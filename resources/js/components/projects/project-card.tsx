import { Link } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Archive } from 'lucide-react';
import { HueBar } from '@/components/hue-progress';
import { ProjectMenu } from '@/components/projects/project-menu';
import { useInitials } from '@/hooks/use-initials';
import type { Hue } from '@/lib/hues';
import { HUES } from '@/lib/hues';
import { openTasks } from '@/lib/projects';
import { percent } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { show } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    teamSlug: string;
    project: Project;
    /** Position in the grid, to stagger the entrance. */
    index?: number;
};

/**
 * A project in the grid: a striped cover in the project's hue, the letter
 * tile, three numbers, progress and who made it. Archived projects keep the
 * same card in grey.
 */
export function ProjectCard({ teamSlug, project, index = 0 }: Props) {
    const getInitials = useInitials();
    const archived = project.archivedAt !== null;
    const hue: Hue = archived ? 'slate' : project.color;
    const progress = percent(project.stats.completed, project.stats.tasks);
    const delay = `${120 + index * 60}ms`;
    const when = archived ? project.archivedAt : project.updatedAt;

    return (
        <article
            className="group/card relative flex animate-rise flex-col rounded-card bg-card transition-[translate,box-shadow] duration-300 ease-slide hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgb(40_30_120/0.35)]"
            style={{ animationDelay: delay }}
        >
            <div
                aria-hidden="true"
                className={cn(
                    'relative h-[78px] overflow-hidden rounded-t-card bg-linear-to-br',
                    HUES[hue].cover,
                )}
            >
                <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgb(255_255_255/0.45)_14px_15px)] bg-size-[auto] transition-[background-position] duration-700 group-hover/card:bg-position-[24px_0] dark:bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgb(255_255_255/0.06)_14px_15px)]" />
            </div>

            {(archived || project.stats.health === 'attention') && (
                <span
                    className={cn(
                        'absolute top-3 left-3.5 flex items-center gap-1.5 rounded-full bg-card/90 py-1 pr-2.5 pl-2 text-xs font-semibold backdrop-blur-sm',
                        archived ? 'text-muted-foreground' : 'text-red-700',
                    )}
                >
                    {archived ? (
                        <Archive className="size-3.5" />
                    ) : (
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/60" />
                            <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                        </span>
                    )}
                    {archived ? 'Archived' : 'Needs attention'}
                </span>
            )}

            <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
                <div className="-mt-6 flex items-end justify-between">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'flex size-12 items-center justify-center rounded-[14px] border-[3px] border-card font-display text-lg font-extrabold text-white shadow-[0_10px_20px_-12px_rgb(23_21_59/0.6)]',
                            HUES[hue].dot,
                        )}
                    >
                        {project.name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                    <ProjectMenu
                        teamSlug={teamSlug}
                        project={project}
                        className="relative z-10 -mr-2"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <h2 className="text-[17px] leading-snug font-extrabold">
                        <Link
                            href={show({
                                current_team: teamSlug,
                                project: project.id,
                            })}
                            prefetch
                            className="outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-ring"
                        >
                            {project.name}
                        </Link>
                    </h2>
                    <p className="line-clamp-2 min-h-[2lh] text-sm leading-relaxed text-muted-foreground">
                        {project.description || 'No description yet.'}
                    </p>
                </div>

                <dl className="grid grid-cols-3 gap-2">
                    <MiniStat label="Open" value={openTasks(project)} />
                    <MiniStat
                        label="Next 7 days"
                        value={project.stats.dueSoon}
                    />
                    <MiniStat
                        label="Overdue"
                        value={project.stats.overdue}
                        alert={project.stats.overdue > 0}
                    />
                </dl>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold tabular-nums">
                            {progress}% done
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                            {project.stats.completed} of {project.stats.tasks}{' '}
                            tasks
                        </span>
                    </div>
                    <HueBar
                        value={progress}
                        hue={hue}
                        delay={`${380 + index * 60}ms`}
                        className="h-[7px]"
                    />
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4 text-xs text-muted-foreground">
                    {project.creatorName ? (
                        <span
                            className="flex size-7 items-center justify-center rounded-full bg-[#f5d0fe] text-[10.5px] font-bold text-[#701a75]"
                            title={`Created by ${project.creatorName}`}
                        >
                            {getInitials(project.creatorName)}
                        </span>
                    ) : (
                        <span />
                    )}
                    {when && (
                        <span>
                            {archived ? 'Archived' : 'Updated'}{' '}
                            {formatDistanceToNow(new Date(when), {
                                addSuffix: true,
                            })}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}

function MiniStat({
    label,
    value,
    alert = false,
}: {
    label: string;
    value: number;
    alert?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-0.5 rounded-xl px-3 py-2.5',
                alert ? 'bg-red-500/10' : 'bg-muted',
            )}
        >
            <dt
                className={cn(
                    'truncate text-[11.5px]',
                    alert
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-muted-foreground',
                )}
            >
                {label}
            </dt>
            <dd
                className={cn(
                    'font-display text-lg font-extrabold tabular-nums',
                    alert && 'text-red-700 dark:text-red-400',
                )}
            >
                {value}
            </dd>
        </div>
    );
}
