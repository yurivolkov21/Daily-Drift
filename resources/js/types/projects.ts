import type { Hue } from '@/lib/hues';

export type TaskList = {
    id: number;
    name: string;
    color: Hue;
    position: number;
};

export type ProjectAbilities = {
    update: boolean;
    archive: boolean;
    restore: boolean;
    delete: boolean;
    manageLists: boolean;
};

export type Project = {
    id: number;
    name: string;
    description: string | null;
    color: Hue;
    archivedAt: string | null;
    updatedAt: string | null;
    creatorName: string | null;
    lists: TaskList[];
    can: ProjectAbilities;
};

export type RecentProject = Pick<Project, 'id' | 'name' | 'color'>;
