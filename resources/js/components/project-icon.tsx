import type { ComponentProps } from 'react';
import { IconTile } from '@/components/ui/icon-tile';
import { projectIconComponent } from '@/lib/project-icons';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

/**
 * The project's icon on a tile tinted with its color (ReUI Icon Tile, soft).
 */
export function ProjectIcon({
    project,
    size = 'sm',
    variant = 'soft',
    className,
}: {
    project: Pick<Project, 'icon' | 'color'>;
    size?: ComponentProps<typeof IconTile>['size'];
    variant?: ComponentProps<typeof IconTile>['variant'];
    className?: string;
}) {
    const Glyph = projectIconComponent(project.icon);

    return (
        <IconTile
            variant={variant}
            size={size}
            className={className}
            style={{ color: project.color }}
        >
            <Glyph />
        </IconTile>
    );
}

/**
 * The bare icon in the project's color, for menus and the sidebar.
 */
export function ProjectGlyph({
    project,
    className,
}: {
    project: Pick<Project, 'icon' | 'color'>;
    className?: string;
}) {
    const Glyph = projectIconComponent(project.icon);

    return (
        <Glyph
            aria-hidden="true"
            className={cn('shrink-0', className)}
            style={{ color: project.color }}
        />
    );
}
