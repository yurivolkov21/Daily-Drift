import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Palette, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import { edit as editTeam, index as teams } from '@/routes/teams';

type Tab = {
    title: string;
    hint: string;
    icon: LucideIcon;
    href: string;
    /** The tab is also current on every page under this path. */
    section?: string;
};

/** Each tab is 52px tall with 4px between them. */
const TAB_STEP = 56;

/**
 * Settings in one card: vertical tabs on the left with a highlight that
 * slides to the current one, and the tab's page on the right. Each tab
 * keeps its own URL.
 */
export default function SettingsLayout({ children }: PropsWithChildren) {
    const { currentTeam } = usePage().props;
    const { currentUrl } = useCurrentUrl();

    const tabs: Tab[] = [
        {
            title: 'Profile',
            hint: 'Name, email, delete account',
            icon: UserRound,
            href: toUrl(editProfile()),
        },
        {
            title: 'Security',
            hint: 'Password and two-factor',
            icon: ShieldCheck,
            href: toUrl(editSecurity()),
        },
        {
            title: 'Appearance',
            hint: 'Theme and motion',
            icon: Palette,
            href: toUrl(editAppearance()),
        },
        {
            title: 'Team',
            hint: 'Members and invitations',
            icon: UsersRound,
            href: toUrl(currentTeam ? editTeam(currentTeam.slug) : teams()),
            section: toUrl(teams()),
        },
    ];

    const current = tabs.findIndex((tab) =>
        tab.section
            ? currentUrl === tab.section ||
              currentUrl.startsWith(`${tab.section}/`)
            : currentUrl === tab.href,
    );

    return (
        <div className="flex min-w-0 flex-1 animate-rise flex-col gap-1.5 rounded-[24px] bg-card p-2.5 [animation-delay:110ms] lg:flex-row">
            <nav
                aria-label="Settings"
                className="flex shrink-0 flex-col gap-3.5 px-2.5 pt-3.5 pb-1 lg:w-[250px] lg:border-r lg:border-border/70 lg:pb-3.5"
            >
                <h1 className="mx-2.5 text-[22px] font-extrabold tracking-tight">
                    Settings
                </h1>
                <div className="relative">
                    {current >= 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute inset-x-0 top-0 hidden h-[52px] rounded-[14px] bg-secondary transition-transform duration-400 ease-panel lg:block"
                            style={{
                                transform: `translateY(${current * TAB_STEP}px)`,
                            }}
                        >
                            <span className="absolute inset-y-3.5 left-0 w-[3px] rounded-[3px] bg-primary" />
                        </span>
                    )}
                    <ul className="flex scrollbar-thin gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                        {tabs.map((tab, index) => {
                            const isCurrent = index === current;

                            return (
                                <li key={tab.title} className="shrink-0">
                                    <Link
                                        href={tab.href}
                                        aria-current={
                                            isCurrent ? 'page' : undefined
                                        }
                                        className={cn(
                                            'relative flex h-[52px] items-center gap-3 rounded-[14px] px-3 no-underline transition-colors duration-250 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            isCurrent
                                                ? 'text-foreground max-lg:bg-secondary'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        <tab.icon className="size-[18px] shrink-0" />
                                        <span className="flex flex-col gap-px">
                                            <span className="text-sm font-semibold whitespace-nowrap">
                                                {tab.title}
                                            </span>
                                            <span className="hidden text-xs text-muted-foreground lg:block">
                                                {tab.hint}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            <div key={currentUrl} className="min-w-0 flex-1 animate-pane">
                {children}
            </div>
        </div>
    );
}
