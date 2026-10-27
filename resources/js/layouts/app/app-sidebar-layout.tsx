import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { IssueTrackerProvider } from '@/components/issue-tracker-provider';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <IssueTrackerProvider>
            <AppShell variant="sidebar">
                <AppSidebar />
                <AppContent variant="sidebar" className="min-w-0">
                    {/* The page scrolls inside the panel, so its edges can fade over the panel's background. */}
                    <div
                        scroll-region=""
                        className="flex min-h-0 flex-1 scroll-fade-y flex-col overflow-x-clip overflow-y-auto"
                    >
                        <AppSidebarHeader breadcrumbs={breadcrumbs} />
                        {children}
                    </div>
                </AppContent>
            </AppShell>
        </IssueTrackerProvider>
    );
}
