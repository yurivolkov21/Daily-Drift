import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

/**
 * Shared look for sidebar rows: 40px tall, rounded, the accent fill when
 * active, and a centred 40px square on the folded rail.
 */
export const navButtonClass =
    'h-10 gap-3 rounded-xl px-3 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-white active:bg-sidebar-accent active:text-white data-[active=true]:bg-sidebar-primary data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary-foreground [&>svg]:size-[18px] group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-[11px]!';

export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentOrParentUrl(item.href)}
                            tooltip={{ children: item.title }}
                            className={navButtonClass}
                        >
                            <Link href={item.href} prefetch>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                        {item.badge !== undefined && (
                            <SidebarMenuBadge className="rounded-full bg-white/10 px-2 text-xs text-sidebar-foreground peer-hover/menu-button:text-white peer-data-[active=true]/menu-button:bg-white/20 peer-data-[active=true]/menu-button:text-white peer-data-[size=default]/menu-button:top-2.5">
                                {item.badge}
                            </SidebarMenuBadge>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
