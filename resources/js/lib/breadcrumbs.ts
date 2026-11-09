import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

/**
 * The team as the first breadcrumb on team pages, so the header reads
 * "VTC Squad / Projects".
 */
export function teamCrumb(
    team: { name: string; slug: string } | null | undefined,
): BreadcrumbItem[] {
    return team ? [{ title: team.name, href: dashboard(team.slug) }] : [];
}
