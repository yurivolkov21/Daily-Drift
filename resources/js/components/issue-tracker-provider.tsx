import { router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { CommandPalette } from '@/components/command-palette';
import { CreateIssueDialog } from '@/components/create-issue-dialog';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import {
    realtimeEnabled,
    WorkspaceUpdates,
} from '@/components/workspace-updates';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { IssueTrackerContext } from '@/hooks/use-issue-tracker';
import type {
    CreateIssueDefaults,
    PaletteAction,
} from '@/hooks/use-issue-tracker';
import { dashboard } from '@/routes';
import { index as issuesIndex } from '@/routes/issues';
import { index as projectsIndex } from '@/routes/projects';

/**
 * Provide the issue tracker's global dialogs, keyboard shortcuts and live
 * updates.
 */
export function IssueTrackerProvider({ children }: { children: ReactNode }) {
    const team = usePage().props.currentTeam;
    const [createIssue, setCreateIssue] = useState<{
        open: boolean;
        session: number;
        defaults: CreateIssueDefaults;
    }>({ open: false, session: 0, defaults: {} });
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [paletteActions, setPaletteActions] = useState<PaletteAction[]>([]);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const pageActions = useRef<PaletteAction[]>([]);

    const openCreateIssue = (defaults: CreateIssueDefaults = {}) => {
        setPaletteOpen(false);
        setCreateIssue((current) => ({
            open: true,
            session: current.session + 1,
            defaults,
        }));
    };

    const openCommandPalette = () => {
        setPaletteActions(pageActions.current);
        setPaletteOpen(true);
    };

    useHotkeys(
        team
            ? [
                  {
                      keys: 'mod+k',
                      handler: () =>
                          paletteOpen
                              ? setPaletteOpen(false)
                              : openCommandPalette(),
                  },
                  { keys: 'c', handler: () => openCreateIssue() },
                  { keys: '?', handler: () => setShortcutsOpen(true) },
                  {
                      keys: 'g i',
                      handler: () => router.visit(issuesIndex.url(team.slug)),
                  },
                  {
                      keys: 'g m',
                      handler: () =>
                          router.visit(
                              issuesIndex.url(team.slug, {
                                  query: { assignee: 'me' },
                              }),
                          ),
                  },
                  {
                      keys: 'g b',
                      handler: () =>
                          router.visit(
                              issuesIndex.url(team.slug, {
                                  query: { view: 'board' },
                              }),
                          ),
                  },
                  {
                      keys: 'g p',
                      handler: () => router.visit(projectsIndex.url(team.slug)),
                  },
                  {
                      keys: 'g d',
                      handler: () => router.visit(dashboard.url(team.slug)),
                  },
              ]
            : [],
    );

    return (
        <IssueTrackerContext
            value={{
                openCreateIssue,
                openCommandPalette,
                setPaletteActions: (actions) => {
                    pageActions.current = actions;
                },
            }}
        >
            {children}
            {team ? (
                <>
                    <CreateIssueDialog
                        key={createIssue.session}
                        open={createIssue.open}
                        defaults={createIssue.defaults}
                        onOpenChange={(open) =>
                            setCreateIssue((current) => ({ ...current, open }))
                        }
                    />
                    <CommandPalette
                        open={paletteOpen}
                        onOpenChange={setPaletteOpen}
                        actions={paletteActions}
                        onCreateIssue={() => openCreateIssue()}
                        onShowShortcuts={() => setShortcutsOpen(true)}
                    />
                    <KeyboardShortcutsDialog
                        open={shortcutsOpen}
                        onOpenChange={setShortcutsOpen}
                    />
                    {realtimeEnabled ? (
                        <WorkspaceUpdates
                            teamId={team.id}
                            teamSlug={team.slug}
                        />
                    ) : null}
                </>
            ) : null}
        </IssueTrackerContext>
    );
}
