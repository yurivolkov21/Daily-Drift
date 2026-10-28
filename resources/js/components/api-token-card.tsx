import { differenceInMinutes, format, parseISO } from 'date-fns';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { formatRelativeTime } from '@/lib/issue-activity';
import { cn } from '@/lib/utils';
import type { ApiToken } from '@/types';

const chip =
    'inline-flex shrink-0 items-center border px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap uppercase';

/**
 * Whether the token has passed its expiry date.
 */
export function isExpired(token: ApiToken): boolean {
    return token.expiresAt !== null && parseISO(token.expiresAt) < new Date();
}

/**
 * How much of the token's life is left, from 0 to 1, or null when it never
 * expires.
 */
function lifeLeft(token: ApiToken): number | null {
    if (token.expiresAt === null || token.createdAt === null) {
        return null;
    }

    const expiresAt = parseISO(token.expiresAt);
    const total = differenceInMinutes(expiresAt, parseISO(token.createdAt));
    const left = differenceInMinutes(expiresAt, new Date());

    return total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
}

/**
 * A token as a card, laid out like the Projects page's cards: its access,
 * team, when it was last used, and how long it has left.
 */
export function ApiTokenCard({
    token,
    onRevoke,
}: {
    token: ApiToken;
    onRevoke: (token: ApiToken) => void;
}) {
    const expired = isExpired(token);
    const canWrite = token.abilities.includes('write');
    const usedToday =
        token.lastUsedAt !== null &&
        differenceInMinutes(new Date(), parseISO(token.lastUsedAt)) < 24 * 60;
    const left = expired ? null : lifeLeft(token);

    return (
        <article
            data-test="api-token-card"
            className="flex flex-col gap-4 bg-card py-4 text-sm text-card-foreground ring-1 ring-border"
        >
            <header className="flex items-start gap-3 px-4">
                <IconTile
                    variant="frame"
                    className={cn(expired && 'text-muted-foreground')}
                >
                    <KeyRound />
                </IconTile>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <h3
                        className={cn(
                            'truncate font-medium',
                            expired && 'text-muted-foreground',
                        )}
                    >
                        {token.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        <span
                            className={cn(
                                chip,
                                canWrite
                                    ? 'text-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {canWrite ? 'Read & write' : 'Read only'}
                        </span>
                        {expired ? (
                            <span
                                className={cn(
                                    chip,
                                    'border-destructive/40 text-destructive',
                                )}
                            >
                                Expired
                            </span>
                        ) : null}
                    </div>
                </div>
            </header>

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 px-4">
                <dt className="text-muted-foreground">Team</dt>
                <dd className="truncate">{token.team.name}</dd>

                <dt className="text-muted-foreground">Used</dt>
                <dd className="flex min-w-0 items-center gap-1.5">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            usedToday
                                ? 'bg-emerald-500'
                                : 'bg-muted-foreground/40',
                        )}
                    />
                    <span className="truncate">
                        {token.lastUsedAt
                            ? formatRelativeTime(token.lastUsedAt)
                            : 'Never'}
                    </span>
                </dd>

                <dt className="text-muted-foreground">Expires</dt>
                <dd className="flex min-w-0 flex-col gap-1.5">
                    <span
                        className={cn(
                            'truncate',
                            expired && 'text-destructive',
                        )}
                    >
                        {token.expiresAt
                            ? format(parseISO(token.expiresAt), 'MMM d, yyyy')
                            : 'Never'}
                    </span>
                    {left !== null ? (
                        <span
                            role="progressbar"
                            aria-label="Time left"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(left * 100)}
                            className="h-1 w-full bg-muted"
                        >
                            <span
                                className="block h-full bg-foreground/60"
                                style={{ width: `${Math.round(left * 100)}%` }}
                            />
                        </span>
                    ) : null}
                </dd>
            </dl>

            <footer className="mt-auto flex items-center justify-between gap-2 border-t px-4 pt-3">
                <span className="text-xs text-muted-foreground">
                    {token.createdAt
                        ? `Created ${formatRelativeTime(token.createdAt)}`
                        : null}
                </span>
                <Button
                    variant="ghost"
                    size="xs"
                    aria-label={`Revoke ${token.name}`}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onRevoke(token)}
                >
                    Revoke
                </Button>
            </footer>
        </article>
    );
}
