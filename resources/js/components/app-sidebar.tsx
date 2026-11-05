import { Link, usePage } from '@inertiajs/react';
import { BookOpen, FolderGit2, FolderKanban, LayoutGrid } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
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
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as projectsIndex, show as showProject } from '@/routes/projects';
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
              ]
            : []),
    ];

    const footerNavItems: NavItem[] = [
        {
            title: 'Repository',
            href: 'https://github.com/laravel/react-starter-kit',
            icon: FolderGit2,
        },
        {
            title: 'Documentation',
            href: 'https://laravel.com/docs/starter-kits#react',
            icon: BookOpen,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
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

            <SidebarContent>
                <NavMain items={mainNavItems} />
                {teamSlug && recentProjects.length > 0 && (
                    <SidebarGroup className="px-2 py-0 group-data-[collapsible=icon]:hidden">
                        <SidebarGroupLabel>Recent projects</SidebarGroupLabel>
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
                                        >
                                            <Link href={href} prefetch>
                                                <span
                                                    className={cn(
                                                        'size-2 shrink-0 rounded-full',
                                                        HUES[project.color].dot,
                                                    )}
                                                />
                                                <span>{project.name}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
