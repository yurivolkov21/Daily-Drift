import { router } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    MoreHorizontal,
    Pencil,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { archive, restore } from '@/routes/projects';
import type { Project } from '@/types';

type Props = {
    teamSlug: string;
    project: Project;
    variant?: 'ghost' | 'outline';
    className?: string;
};

/**
 * Edit, archive, restore and delete, limited to what the user may do.
 * Renders nothing when the user may do none of them.
 */
export function ProjectMenu({
    teamSlug,
    project,
    variant = 'ghost',
    className,
}: Props) {
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { can } = project;
    const parameters = { current_team: teamSlug, project: project.id };

    if (!can.update && !can.archive && !can.restore && !can.delete) {
        return null;
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={variant}
                        size={variant === 'outline' ? 'icon' : 'icon-sm'}
                        aria-label={`Actions for ${project.name}`}
                        className={cn('relative z-10', className)}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {can.update && (
                        <DropdownMenuItem onSelect={() => setEditing(true)}>
                            <Pencil /> Edit
                        </DropdownMenuItem>
                    )}
                    {can.archive && (
                        <DropdownMenuItem
                            onSelect={() =>
                                router.visit(archive(parameters), {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <Archive /> Archive
                        </DropdownMenuItem>
                    )}
                    {can.restore && (
                        <DropdownMenuItem
                            onSelect={() =>
                                router.visit(restore(parameters), {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <ArchiveRestore /> Restore
                        </DropdownMenuItem>
                    )}
                    {can.delete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleting(true)}
                            >
                                <Trash2 /> Delete
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <ProjectDialog
                teamSlug={teamSlug}
                project={project}
                open={editing}
                onOpenChange={setEditing}
            />
            {can.delete && (
                <DeleteProjectDialog
                    teamSlug={teamSlug}
                    project={project}
                    open={deleting}
                    onOpenChange={setDeleting}
                />
            )}
        </>
    );
}
