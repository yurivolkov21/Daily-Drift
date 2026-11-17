import type { Priority } from './projects';

/** A task Claude drafted from a brief, before anyone adds it (spec 0011). */
export type TaskDraft = {
    title: string;
    description: string;
    priority: Priority;
    steps: string[];
};

/** The saved weekly summary of a project (spec 0011). */
export type ProjectSummary = {
    startsOn: string;
    endsOn: string;
    headline: string;
    done: string[];
    risks: string[];
    next: string[];
    /** Who asked for it; null once they are gone. */
    author: { id: number; name: string } | null;
    writtenAt: string;
    model: string;
};
