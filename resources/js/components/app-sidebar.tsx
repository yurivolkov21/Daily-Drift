import { Link, usePage } from '@inertiajs/react';
import {
    FolderKanban,
    LayoutGrid,
    PanelLeftClose,
    PanelLeftOpen,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain, navButtonClass } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { TeamSwitcher } from '@/components/team-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as projectsIndex, show as showProject } from '@/routes/projects';
import { edit as editTeam } from '@/routes/teams';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const page = usePage();
    const dashboardUrl = page.props.currentTeam
        ? dashboard(page.props.currentTeam.slug)
        : '/';

    const { isCurrentUrl } = useCurrentUrl();
    const teamSlug = page.props.currentTeam?.slug;
    const recentProjects = page.props.recentProjects ?? [];

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardUrl,
            icon: LayoutGrid,
        },
        ...(teamSlug
            ? [
                  {
                      title: 'Projects',
                      href: projectsIndex(teamSlug),
                      icon: FolderKanban,
                  },
                  {
                      title: 'Team',
                      href: editTeam(teamSlug),
                      icon: Users,
                  },
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader className="gap-4 px-3 pt-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="gap-3 rounded-xl px-1.5 text-white group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:p-[3px]! hover:bg-transparent hover:text-white active:bg-transparent"
                        >
                            <Link href={dashboardUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <TeamSwitcher />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="scrollbar-thin gap-5 px-1 pt-2 scrollbar-on-dark">
                <NavMain items={mainNavItems} />
                {teamSlug && recentProjects.length > 0 && (
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.08em] text-sidebar-muted uppercase">
                            Recent
                        </SidebarGroupLabel>
                        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
                            {recentProjects.map((project) => {
                                const href = showProject({
                                    current_team: teamSlug,
                                    project: project.id,
                                });

                                return (
                                    <SidebarMenuItem key={project.id}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isCurrentUrl(href)}
                                            tooltip={{ children: project.name }}
                                            className={cn(
                                                navButtonClass,
                                                'h-10 text-[13.5px] text-sidebar-foreground group-data-[collapsible=icon]:p-[9px]! data-[active=true]:bg-sidebar-accent data-[active=true]:text-white',
                                            )}
                                        >
                                            <Link href={href} prefetch>
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'flex size-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-extrabold text-white',
                                                        HUES[project.color].dot,
                                                    )}
                                                >
                                                    {project.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                                <span>{project.name}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge
                                            className="text-sidebar-muted peer-hover/menu-button:text-sidebar-muted peer-data-[active=true]/menu-button:text-sidebar-muted peer-data-[size=default]/menu-button:top-2.5"
                                            aria-label={`${project.open} open tasks`}
                                        >
                                            {project.open}
                                        </SidebarMenuBadge>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="gap-3 px-3 pb-4">
                <FoldButton />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

/**
 * Folds the sidebar to its icon rail. Ctrl/⌘ + B does the same, and the
 * `sidebar_state` cookie remembers the choice.
 */
function FoldButton() {
    const { state, toggleSidebar, isMobile } = useSidebar();

    if (isMobile) {
        return null;
    }

    const folded = state === 'collapsed';
    const shortcut =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.userAgent)
            ? '⌘B'
            : 'Ctrl B';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    onClick={toggleSidebar}
                    aria-expanded={!folded}
                    tooltip={{
                        children: `Expand the sidebar (${shortcut})`,
                    }}
                    className={cn(
                        navButtonClass,
                        'border border-sidebar-border bg-white/[0.04] text-white',
                    )}
                >
                    {folded ? <PanelLeftOpen /> : <PanelLeftClose />}
                    <span>Collapse sidebar</span>
                    <kbd className="ml-auto rounded-md border border-sidebar-border px-1.5 font-sans text-[11px] text-sidebar-muted">
                        {shortcut}
                    </kbd>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
