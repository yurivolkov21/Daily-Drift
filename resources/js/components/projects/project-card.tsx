import { Link } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Archive, Columns3 } from 'lucide-react';
import { ProjectMenu } from '@/components/projects/project-menu';
import { ProjectTile } from '@/components/projects/project-tile';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { show } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    teamSlug: string;
    project: Project;
};

export function ProjectCard({ teamSlug, project }: Props) {
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

                <div className="flex flex-wrap gap-1.5">
                    {project.lists.map((list) => (
                        <span
                            key={list.id}
                            className={cn(
                                'rounded-md px-2 py-0.5 text-xs font-medium',
                                HUES[list.color].pill,
                            )}
                        >
                            {list.name}
                        </span>
                    ))}
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
