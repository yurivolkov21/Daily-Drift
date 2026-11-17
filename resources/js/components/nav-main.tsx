import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

/**
 * Shared look for sidebar rows: 40px tall, rounded, the accent fill when
 * active. Rows stay full width and keep their left padding when the sidebar
 * folds, so the 18px icon stays where it is and ends up in the middle of the
 * 76px rail (18px inset, 11px padding, 9px half icon: 38px).
 */
export const navButtonClass =
    'h-10 gap-3 rounded-xl pr-3 pl-2.75 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-white active:bg-sidebar-accent active:text-white data-[active=true]:bg-sidebar-primary data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary-foreground [&>svg]:size-4.5';

/** A count on the right of a row; it fades out on the rail. */
export const navBadgeClass =
    'fold-fade group-data-[collapsible=icon]:flex peer-data-[size=default]/menu-button:top-2.5';

/**
 * The label of a row: it fades out on the rail, and leaves room for a count
 * so a long name ends before it. The room is on the label, not the button,
 * which has to fit in 40px on the rail.
 */
export const navLabelClass = (withCount: boolean) =>
    cn('fold-fade', withCount && 'pr-6');

export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="p-0">
            <SidebarMenu>
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
                                <span
                                    className={navLabelClass(
                                        item.badge !== undefined,
                                    )}
                                >
                                    {item.title}
                                </span>
                            </Link>
                        </SidebarMenuButton>
                        {item.badge !== undefined && (
                            <SidebarMenuBadge
                                className={cn(
                                    navBadgeClass,
                                    'rounded-full bg-white/10 px-2 text-xs text-sidebar-foreground peer-hover/menu-button:text-white peer-data-[active=true]/menu-button:bg-white/20 peer-data-[active=true]/menu-button:text-white',
                                )}
                            >
                                {item.badge}
                            </SidebarMenuBadge>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
