import { dashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
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

/** "Settings / Profile" in the header on the settings tabs. */
export function settingsCrumbs(
    title: string,
    href: BreadcrumbItem['href'],
): BreadcrumbItem[] {
    return [
        { title: 'Settings', href: editProfile() },
        { title, href },
    ];
}
