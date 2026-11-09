import { usePage } from '@inertiajs/react';
import type { CSSProperties, ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

/**
 * Sidebar widths include the 14px gap to its left; the card itself is
 * 256px wide, or 76px when folded to icons.
 */
const sidebarWidths = {
    '--sidebar-width': '270px',
    '--sidebar-width-icon': '76px',
} as CSSProperties;

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const isOpen = usePage().props.sidebarOpen;

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    return (
        <SidebarProvider defaultOpen={isOpen} style={sidebarWidths}>
            {children}
        </SidebarProvider>
    );
}
