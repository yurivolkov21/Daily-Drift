import { Link, usePage } from '@inertiajs/react';
import {
    ListTodo,
    FolderKanban,
    LayoutGrid,
    PanelLeftClose,
    PanelLeftOpen,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import {
    NavMain,
    navBadgeClass,
    navButtonClass,
    navLabelClass,
} from '@/components/nav-main';
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
import { dashboard, myTasks } from '@/routes';
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
                      badge: page.props.activeProjectCount,
                  },
                  {
                      title: 'My tasks',
                      href: myTasks(teamSlug),
                      icon: ListTodo,
                      badge: page.props.myOpenTaskCount || undefined,
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
            <SidebarHeader className="gap-4 px-4.5 pt-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="gap-3 rounded-xl pl-px text-white hover:bg-transparent hover:text-white active:bg-transparent"
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

            {/* The scrollbar gutter (10px) plus 8px matches the 18px inset
                on the left; on the rail there is no gutter, so 18px both
                sides leaves exactly the 40px buttons. */}
            <SidebarContent className="thin-scrollbar gap-5 pt-2 pr-2 pl-4.5 scrollbar-on-dark group-data-[collapsible=icon]:scrollbar-gutter-auto group-data-[collapsible=icon]:pr-4.5">
                <NavMain items={mainNavItems} />
                {teamSlug && recentProjects.length > 0 && (
                    <SidebarGroup className="p-0">
                        <SidebarGroupLabel className="px-2.75 text-[11px] font-semibold tracking-[0.08em] text-sidebar-muted uppercase duration-450 ease-panel">
                            Recent
                        </SidebarGroupLabel>
                        <SidebarMenu>
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
                                                'pl-2.25 text-[13.5px] text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-white',
                                            )}
                                        >
                                            <Link href={href} prefetch>
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'flex size-5.5 shrink-0 items-center justify-center rounded-[7px] text-[11px] font-extrabold text-white',
                                                        HUES[project.color].dot,
                                                    )}
                                                >
                                                    {project.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                                <span
                                                    className={navLabelClass(
                                                        true,
                                                    )}
                                                >
                                                    {project.name}
                                                </span>
                                            </Link>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge
                                            className={cn(
                                                navBadgeClass,
                                                'text-sidebar-muted peer-hover/menu-button:text-sidebar-muted peer-data-[active=true]/menu-button:text-sidebar-muted',
                                            )}
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

            <SidebarFooter className="gap-3 px-4.5 pb-4">
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
                        'border border-sidebar-border bg-white/4 pl-2.5 text-white',
                    )}
                >
                    {folded ? <PanelLeftOpen /> : <PanelLeftClose />}
                    <span className="fold-fade whitespace-nowrap">
                        Collapse sidebar
                    </span>
                    <kbd className="fold-fade ml-auto rounded-md border border-sidebar-border px-1.5 font-sans text-[11px] whitespace-nowrap text-sidebar-muted">
                        {shortcut}
                    </kbd>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
