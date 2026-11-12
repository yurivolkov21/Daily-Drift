/** Something opened lately, for the search box's Recent group (spec 0007). */
export type RecentItem =
    | {
          kind: 'task';
          id: number;
          title: string;
          projectId: number;
          projectName: string;
      }
    | { kind: 'project'; id: number; title: string; color: string };

const LIMIT = 5;
const key = (teamSlug: string) => `search.recent.${teamSlug}`;

/** The last items opened in this browser for this team, newest first. */
export function recentItems(teamSlug: string): RecentItem[] {
    try {
        const stored: unknown = JSON.parse(
            localStorage.getItem(key(teamSlug)) ?? '[]',
        );

        return Array.isArray(stored)
            ? (stored as RecentItem[]).slice(0, LIMIT)
            : [];
    } catch {
        return [];
    }
}

export function rememberRecent(teamSlug: string, item: RecentItem): void {
    try {
        const others = recentItems(teamSlug).filter(
            (other) => !(other.kind === item.kind && other.id === item.id),
        );

        localStorage.setItem(
            key(teamSlug),
            JSON.stringify([item, ...others].slice(0, LIMIT)),
        );
    } catch {
        // Private windows may refuse storage; Recent is only a convenience.
    }
}
