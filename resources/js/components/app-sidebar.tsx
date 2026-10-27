import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    FolderKanban,
    LayoutGrid,
    ListTodo,
    Search,
    SquarePen,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { TeamSwitcher } from '@/components/team-switcher';
import { Kbd } from '@/components/ui/kbd';
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
import { useIssueTracker } from '@/hooks/use-issue-tracker';
import { dashboard } from '@/routes';
import { index as issuesIndex } from '@/routes/issues';
import { index as projectsIndex } from '@/routes/projects';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const page = usePage();
    const { openCreateIssue, openCommandPalette } = useIssueTracker();
    const team = page.props.currentTeam;
    const projects = page.props.workspace?.projects ?? [];
    const dashboardUrl = team ? dashboard(team.slug) : '/';
    const currentProjectKey = new URLSearchParams(page.url.split('?')[1]).get(
        'project',
    );

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardUrl,
            icon: LayoutGrid,
        },
        ...(team
            ? [
                  {
                      title: 'Issues',
                      href: issuesIndex(team.slug),
                      icon: ListTodo,
                  },
                  {
                      title: 'Projects',
                      href: projectsIndex(team.slug),
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
                        <SidebarMenuButton
                            size="lg"
                            render={<Link href={dashboardUrl} prefetch />}
                        >
                            <AppLogo />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <TeamSwitcher />
                    </SidebarMenuItem>
                </SidebarMenu>
                {team ? (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="New issue (C)"
                                data-test="sidebar-new-issue"
                                onClick={() => openCreateIssue()}
                            >
                                <SquarePen />
                                <span>New issue</span>
                                <Kbd className="ml-auto">C</Kbd>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Search (Ctrl K)"
                                data-test="sidebar-search"
                                onClick={openCommandPalette}
                            >
                                <Search />
                                <span>Search</span>
                                <Kbd className="ml-auto">Ctrl K</Kbd>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                ) : null}
            </SidebarHeader>

            <SidebarContent className="scroll-fade-y">
                <NavMain items={mainNavItems} />

                {team && projects.length > 0 ? (
                    <SidebarGroup className="px-2 py-0 group-data-[collapsible=icon]:hidden">
                        <SidebarGroupLabel>Projects</SidebarGroupLabel>
                        <SidebarMenu>
                            {projects.map((project) => (
                                <SidebarMenuItem key={project.id}>
                                    <SidebarMenuButton
                                        isActive={
                                            currentProjectKey === project.key
                                        }
                                        render={
                                            <Link
                                                href={issuesIndex(team.slug, {
                                                    query: {
                                                        project: project.key,
                                                    },
                                                })}
                                                prefetch
                                            />
                                        }
                                    >
                                        <span className="w-8 shrink-0 text-[0.65rem] font-semibold text-muted-foreground">
                                            {project.key}
                                        </span>
                                        <span className="truncate">
                                            {project.name}
                                        </span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ) : null}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
