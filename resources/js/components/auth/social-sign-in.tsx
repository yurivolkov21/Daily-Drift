import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { redirect } from '@/routes/social';
import type { ProviderKey } from './provider-logo';
import { ProviderLogo } from './provider-logo';

export type SocialProvider = { key: ProviderKey; label: string };

/**
 * Under the email form (spec 0009, round 9): "or continue with", then Google
 * and GitHub side by side, then anything else (the passkey link). Nothing
 * shows when no provider is configured and nothing else is passed.
 */
export function SocialSignIn({
    providers,
    mode,
    children,
}: {
    providers: SocialProvider[];
    mode: 'login' | 'register';
    children?: ReactNode;
}) {
    const [leaving, setLeaving] = useState<ProviderKey | null>(null);

    if (providers.length === 0 && !children) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3.5" data-test="social-sign-in">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or continue with
                <span className="h-px flex-1 bg-border" />
            </div>
            {providers.length > 0 && (
                <div className="flex gap-2.5">
                    {providers.map((provider) => (
                        <a
                            key={provider.key}
                            href={redirect.url({ provider: provider.key })}
                            onClick={() => setLeaving(provider.key)}
                            aria-label={`Continue with ${provider.label}`}
                            aria-busy={leaving === provider.key}
                            data-test={`social-${provider.key}`}
                            className={cn(
                                'flex h-11 flex-1 items-center justify-center gap-2.5 rounded-xl border bg-card text-sm font-semibold transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                leaving !== null &&
                                    leaving !== provider.key &&
                                    'pointer-events-none opacity-55',
                            )}
                        >
                            {leaving === provider.key ? (
                                <Spinner />
                            ) : (
                                <ProviderLogo provider={provider.key} />
                            )}
                            {provider.label}
                        </a>
                    ))}
                </div>
            )}
            {mode === 'register' && providers.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                    We only read your name and email from{' '}
                    {providers.map((provider) => provider.label).join(' or ')}.
                </p>
            )}
            {children}
        </div>
    );
}

/** Why the last try with Google or GitHub did not sign the person in. */
export function SocialError({ message }: { message?: string | null }) {
    if (!message) {
        return null;
    }

    return (
        <div
            role="alert"
            className="mb-5 flex animate-pop gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-900 dark:text-amber-200"
            data-test="social-error"
        >
            <CircleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
            />
            <span>{message}</span>
        </div>
    );
}
