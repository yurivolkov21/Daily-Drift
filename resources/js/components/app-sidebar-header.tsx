import { usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { HEADER_ACTIONS_ID } from '@/components/header-actions';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { SearchBox } from '@/components/search/search-box';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

const AVATAR_COLORS = [
    'bg-[#f5d0fe] text-[#701a75]',
    'bg-[#bae6fd] text-[#075985]',
    'bg-[#fbcfe8] text-[#9d174d]',
    'bg-[#fed7aa] text-[#9a3412]',
];

/**
 * The header bar: a white card above the page with the breadcrumbs, the
 * search box (Ctrl K), the team's people, the notification bell and the
 * page's main action (see HeaderActions). On phones it
 * also opens the sidebar, which folds on desktop from its own foot.
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { teamPeople } = usePage().props;
    const getInitials = useInitials();
    const more = teamPeople ? teamPeople.total - teamPeople.names.length : 0;

    return (
        <header className="relative z-20 flex min-h-[62px] shrink-0 animate-rise flex-wrap items-center gap-3 rounded-panel bg-card py-2.5 pr-2.5 pl-4 shadow-[0_1px_2px_rgb(23_21_59/0.06)] [animation-delay:60ms]">
            <SidebarTrigger className="-ml-1 md:hidden" />
            <Breadcrumbs breadcrumbs={breadcrumbs} />
            <div className="ml-auto flex items-center gap-3">
                {teamPeople && <SearchBox />}
                {teamPeople && teamPeople.total > 1 && (
                    <div
                        className="hidden items-center sm:flex"
                        aria-label={`${teamPeople.total} people in this team`}
                    >
                        {teamPeople.names.map((name, index) => (
                            <span
                                key={name + index}
                                title={name}
                                className={`-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-card text-xs font-bold first:ml-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                            >
                                {getInitials(name)}
                            </span>
                        ))}
                        {more > 0 && (
                            <span className="-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-[11px] font-bold text-secondary-foreground">
                                +{more}
                            </span>
                        )}
                    </div>
                )}
                <NotificationBell />
                <div
                    id={HEADER_ACTIONS_ID}
                    className="flex items-center gap-2 empty:hidden"
                />
            </div>
        </header>
    );
}
