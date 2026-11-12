import type { Auth } from '@/types/auth';
import type { RecentProject } from '@/types/projects';
import type { Team } from '@/types/teams';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            /** The viewer's time zone, and today's date in it (spec 0003). */
            timeZone: string;
            today: string;
            currentTeam: Team | null;
            teams: Team[];
            recentProjects: RecentProject[];
            /** The first members of the current team, for the header. */
            teamPeople: { total: number; names: string[] } | null;
            activeProjectCount: number;
            /** Open tasks assigned to the viewer in the current team. */
            myOpenTaskCount: number;
            /** Unread notifications of the viewer in the current team (spec 0006). */
            unreadNotifications: number;
            [key: string]: unknown;
        };
    }
}
