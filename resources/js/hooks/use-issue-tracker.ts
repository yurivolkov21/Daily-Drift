import type { ReactNode } from 'react';
import { createContext, useContext, useEffect } from 'react';
import type { IssuePriority, IssueStatus } from '@/types';

export type CreateIssueDefaults = {
    projectId?: string;
    status?: IssueStatus;
    assigneeId?: number | null;
    priority?: IssuePriority;
};

export type PaletteAction = {
    id: string;
    label: string;
    icon?: ReactNode;
    shortcut?: string;
    onSelect: () => void;
};

export type IssueTracker = {
    openCreateIssue: (defaults?: CreateIssueDefaults) => void;
    openCommandPalette: () => void;
    setPaletteActions: (actions: PaletteAction[]) => void;
};

export const IssueTrackerContext = createContext<IssueTracker | null>(null);

export function useIssueTracker(): IssueTracker {
    const issueTracker = useContext(IssueTrackerContext);

    if (!issueTracker) {
        throw new Error(
            'useIssueTracker must be used within an IssueTrackerProvider.',
        );
    }

    return issueTracker;
}

/**
 * Offer actions of the current page, such as editing the open issue, in the
 * command palette while the calling component is mounted.
 */
export function usePaletteActions(actions: PaletteAction[]): void {
    const { setPaletteActions } = useIssueTracker();

    useEffect(() => {
        setPaletteActions(actions);

        return () => setPaletteActions([]);
    });
}
