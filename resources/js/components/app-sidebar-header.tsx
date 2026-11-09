import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * The header bar: a white card above the page with the breadcrumbs. On
 * phones it also opens the sidebar, which folds on desktop from its own foot.
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex min-h-14 shrink-0 animate-rise items-center gap-2 rounded-panel bg-card px-4 shadow-[0_1px_2px_rgb(23_21_59/0.06)] [animation-delay:60ms]">
            <SidebarTrigger className="-ml-1 md:hidden" />
            <Breadcrumbs breadcrumbs={breadcrumbs} />
        </header>
    );
}
