import { router } from '@inertiajs/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import type { ProviderKey } from '@/components/auth/provider-logo';
import { ProviderLogo } from '@/components/auth/provider-logo';
import { BUTTON, SubHeading } from '@/components/settings/section';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { destroy } from '@/routes/connected-accounts';
import { redirect } from '@/routes/social';

export type ConnectedAccount = {
    provider: ProviderKey;
    label: string;
    email: string | null;
    connectedAt: string | null;
    /** False when the provider has no credentials here; it can still be disconnected. */
    canConnect: boolean;
};

/**
 * Google and GitHub under the password (spec 0009, round 9): one row each,
 * _Connect_ or _Disconnect_. Disconnecting the last way to sign in is
 * refused here and on the server.
 */
export function ConnectedAccounts({
    accounts,
    signInMethods,
}: {
    accounts: ConnectedAccount[];
    signInMethods: number;
}) {
    const [busy, setBusy] = useState<ProviderKey | null>(null);

    if (accounts.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3.5" data-test="connected-accounts">
            <SubHeading
                title="Connected accounts"
                description="Sign in with these instead of a password. We only read your name and email."
            />
            <ul className="overflow-hidden rounded-2xl border border-border">
                {accounts.map((account) => {
                    const connected = account.connectedAt !== null;
                    const locked = connected && signInMethods <= 1;

                    return (
                        <li
                            key={account.provider}
                            className="flex flex-col gap-1.5 border-t px-4 py-3.5 first:border-t-0"
                            data-test={`account-${account.provider}`}
                        >
                            <div className="flex flex-wrap items-center gap-3.5">
                                <span
                                    aria-hidden="true"
                                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card"
                                >
                                    <ProviderLogo provider={account.provider} />
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex items-center gap-2 text-[14.5px] font-bold">
                                        {account.label}
                                        {connected && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2 py-px text-[11.5px] font-bold text-green-700 dark:text-green-400">
                                                <span
                                                    aria-hidden="true"
                                                    className="size-1.5 rounded-full bg-green-500"
                                                />
                                                Connected
                                            </span>
                                        )}
                                    </span>
                                    <span className="truncate text-[13px] text-muted-foreground">
                                        {connected
                                            ? `${account.email ?? 'No email'} · connected ${formatDistanceToNow(parseISO(account.connectedAt as string), { addSuffix: true })}`
                                            : 'Not connected'}
                                    </span>
                                </span>
                                {connected ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        aria-disabled={locked}
                                        disabled={busy !== null}
                                        onClick={() => {
                                            if (locked) {
                                                return;
                                            }

                                            setBusy(account.provider);
                                            router.delete(
                                                destroy.url({
                                                    provider: account.provider,
                                                }),
                                                {
                                                    preserveScroll: true,
                                                    onFinish: () =>
                                                        setBusy(null),
                                                },
                                            );
                                        }}
                                        className={cn(
                                            BUTTON,
                                            locked
                                                ? 'cursor-not-allowed text-muted-foreground opacity-70'
                                                : 'text-rose-700 hover:text-rose-800 dark:text-rose-400',
                                        )}
                                    >
                                        {busy === account.provider && (
                                            <Spinner />
                                        )}
                                        Disconnect
                                    </Button>
                                ) : (
                                    account.canConnect && (
                                        <Button
                                            asChild
                                            variant="outline"
                                            className={BUTTON}
                                        >
                                            <a
                                                href={redirect.url({
                                                    provider: account.provider,
                                                })}
                                                onClick={() =>
                                                    setBusy(account.provider)
                                                }
                                                aria-busy={
                                                    busy === account.provider
                                                }
                                            >
                                                {busy === account.provider && (
                                                    <Spinner />
                                                )}
                                                Connect
                                            </a>
                                        </Button>
                                    )
                                )}
                            </div>
                            {locked && (
                                <p className="flex items-center gap-1.5 pl-[54px] text-[12.5px] text-muted-foreground">
                                    <Lock
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    This is your only way to sign in. Set a
                                    password or connect another account first.
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/** Shown in place of an action that confirms a password the account does not have yet. */
export function NeedsPassword({ action }: { action: string }) {
    return (
        <p
            role="note"
            className="text-[13px] text-amber-800 dark:text-amber-300"
            data-test="needs-password"
        >
            Set a password first: {action} asks you to confirm it.
        </p>
    );
}
