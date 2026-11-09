import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { login, register } from '@/routes';

/**
 * Sign in and Create account as two tabs with a sliding thumb. Each is its
 * own page, so the tabs are links.
 */
export function AuthTabs({
    current,
    invitation,
}: {
    current: 'login' | 'register';
    invitation?: string;
}) {
    const query = invitation ? { query: { invitation } } : undefined;
    const tabs = [
        { key: 'login', label: 'Sign in', href: login(query) },
        { key: 'register', label: 'Create account', href: register(query) },
    ] as const;

    return (
        <nav
            aria-label="Account"
            className="relative mb-6 grid grid-cols-2 rounded-xl bg-secondary p-1"
        >
            <span
                aria-hidden="true"
                className={cn(
                    'absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-[9px] bg-card shadow-[0_2px_8px_-2px_rgb(40_30_120/0.2)] transition-transform duration-350 ease-slide',
                    current === 'register' && 'translate-x-full',
                )}
            />
            {tabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    aria-current={tab.key === current ? 'page' : undefined}
                    className={cn(
                        'relative flex min-h-[38px] items-center justify-center rounded-[9px] text-sm font-semibold no-underline transition-colors',
                        tab.key === current
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {tab.label}
                </Link>
            ))}
        </nav>
    );
}
