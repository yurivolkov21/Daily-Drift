import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';

export function NavUser() {
    const { auth, currentTeam } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* The 32px avatar keeps its place (18 + 4 + 16 =
                            38px, the middle of the rail); only the height
                            eases from 48 to 40px with the card. */}
                        <SidebarMenuButton
                            size="lg"
                            className="group rounded-xl pl-1 text-white duration-450 ease-panel group-data-[collapsible=icon]:h-10 hover:bg-sidebar-accent hover:text-white data-[state=open]:bg-sidebar-accent [&_.text-muted-foreground]:text-sidebar-muted [&_[data-slot=avatar-fallback]]:rounded-full [&_[data-slot=avatar-fallback]]:bg-[#f5d0fe] [&_[data-slot=avatar-fallback]]:font-bold [&_[data-slot=avatar-fallback]]:text-[#701a75] [&_[data-slot=avatar]]:rounded-full"
                            data-test="sidebar-menu-button"
                        >
                            <UserInfo
                                user={auth.user}
                                team={currentTeam}
                                textClassName="fold-fade"
                            />
                            <ChevronsUpDown className="fold-fade ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
