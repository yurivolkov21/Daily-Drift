import { Link } from '@inertiajs/react';
import { ListBar, ProgressRing } from '@/components/hue-progress';
import { ProjectMenu } from '@/components/projects/project-menu';
import { useInitials } from '@/hooks/use-initials';
import type { Hue } from '@/lib/hues';
import { HUES } from '@/lib/hues';
import { healthReason, openTasks } from '@/lib/projects';
import { percent } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { show } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    teamSlug: string;
    project: Project;
    index?: number;
};

/**
 * A project in the list view: tile, name and the reason for its health, a
 * bar split by list, a progress ring, chips and the menu.
 */
export function ProjectRow({ teamSlug, project, index = 0 }: Props) {
    const getInitials = useInitials();
    const archived = project.archivedAt !== null;
    const attention = !archived && project.stats.health === 'attention';
    const hue: Hue = archived ? 'slate' : project.color;
    const progress = percent(project.stats.completed, project.stats.tasks);
    const delay = `${200 + index * 50}ms`;
    const lists = project.lists.map((list) => ({
        ...list,
        color: archived ? ('slate' as Hue) : list.color,
    }));

    return (
        <li
            className={cn(
                'relative flex animate-rise flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl px-4 py-3 transition-[background-color,translate,box-shadow] duration-200 hover:-translate-y-px hover:bg-card hover:shadow-[0_12px_30px_-20px_rgb(40_30_120/0.35)]',
                attention ? 'bg-red-500/[0.03]' : 'bg-muted/60',
            )}
            style={{ animationDelay: delay }}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl font-display text-base font-extrabold text-white',
                    HUES[hue].dot,
                )}
            >
                {project.name.trim().charAt(0).toUpperCase() || '?'}
            </span>

            <span className="flex min-w-0 flex-[1_1_14rem] flex-col gap-0.5">
                <Link
                    href={show({ current_team: teamSlug, project: project.id })}
                    prefetch
                    className="truncate font-bold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                    {project.name}
                </Link>
                <span
                    className={cn(
                        'truncate text-[12.5px]',
                        attention
                            ? 'font-semibold text-red-700 dark:text-red-400'
                            : 'text-muted-foreground',
                    )}
                >
                    {healthReason(project)}
                </span>
            </span>

            <span className="flex w-44 flex-col gap-1.5">
                <ListBar lists={lists} delay={delay} />
                <span className="text-[11.5px] text-muted-foreground">
                    {openTasks(project)} open · {project.lists.length}{' '}
                    {project.lists.length === 1 ? 'list' : 'lists'}
                </span>
            </span>

            <ProgressRing value={progress} hue={hue} size={44} stroke={5}>
                {progress}
            </ProgressRing>

            <span className="flex w-44 flex-wrap gap-1.5">
                {project.stats.overdue > 0 && (
                    <Chip className="bg-red-500/10 text-red-700 dark:text-red-400">
                        {project.stats.overdue} overdue
                    </Chip>
                )}
                {project.stats.dueSoon > 0 && (
                    <Chip className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        {project.stats.dueSoon} in 7 days
                    </Chip>
                )}
                {project.stats.overdue === 0 && project.stats.dueSoon === 0 && (
                    <Chip className="bg-muted text-muted-foreground">
                        Nothing due
                    </Chip>
                )}
            </span>

            {project.creatorName && (
                <span
                    className="flex size-7 items-center justify-center rounded-full bg-[#f5d0fe] text-[10.5px] font-bold text-[#701a75]"
                    title={`Created by ${project.creatorName}`}
                >
                    {getInitials(project.creatorName)}
                </span>
            )}

            <ProjectMenu
                teamSlug={teamSlug}
                project={project}
                className="relative z-10 ml-auto"
            />
        </li>
    );
}

function Chip({
    className,
    children,
}: {
    className: string;
    children: React.ReactNode;
}) {
    return (
        <span
            className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                className,
            )}
        >
            {children}
        </span>
    );
}
