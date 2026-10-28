import { Head, router } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ApiTokenDialog } from '@/components/api-token-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { IconTile } from '@/components/ui/icon-tile';
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
} from '@/components/ui/item';
import { formatRelativeTime } from '@/lib/issue-activity';
import { cn } from '@/lib/utils';
import { destroy, index } from '@/routes/api-tokens';
import type { ApiToken } from '@/types';

type Props = {
    tokens: ApiToken[];
    apiUrl: string;
};

const chip =
    'inline-flex shrink-0 items-center border px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap uppercase';

function isExpired(token: ApiToken): boolean {
    return token.expiresAt !== null && parseISO(token.expiresAt) < new Date();
}

function expiryText(token: ApiToken): string {
    if (token.expiresAt === null) {
        return 'No expiration';
    }

    const date = format(parseISO(token.expiresAt), 'MMM d, yyyy');

    return isExpired(token) ? `Expired ${date}` : `Expires ${date}`;
}

export default function ApiTokens({ tokens, apiUrl }: Props) {
    const [dialog, setDialog] = useState({ open: false, key: 0 });
    const [revokedToken, setRevokedToken] = useState<ApiToken | null>(null);

    // A new key gives every opening a fresh form, and drops the last token.
    const openDialog = () =>
        setDialog(({ key }) => ({ open: true, key: key + 1 }));

    return (
        <>
            <Head title="API tokens" />

            <h1 className="sr-only">API tokens</h1>

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <Heading
                            variant="small"
                            title="API tokens"
                            description="Scripts and Claude Code hooks use a token to read and change issues as you, on one team."
                        />
                    </div>
                    {tokens.length > 0 ? (
                        <Button
                            size="sm"
                            data-test="new-api-token"
                            onClick={openDialog}
                        >
                            <Plus />
                            New token
                        </Button>
                    ) : null}
                </div>

                {tokens.length === 0 ? (
                    <Empty className="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <KeyRound />
                            </EmptyMedia>
                            <EmptyTitle>No tokens yet</EmptyTitle>
                            <EmptyDescription>
                                Make one for each script or machine, so you can
                                revoke one without breaking the others.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button size="sm" onClick={openDialog}>
                                <Plus />
                                New token
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <div role="list" className="divide-y border">
                        {tokens.map((token) => {
                            const expired = isExpired(token);

                            return (
                                <Item
                                    key={token.id}
                                    role="listitem"
                                    data-test="api-token-row"
                                >
                                    <ItemMedia>
                                        <IconTile
                                            variant="frame"
                                            size="sm"
                                            className={cn(
                                                expired &&
                                                    'text-muted-foreground',
                                            )}
                                        >
                                            <KeyRound />
                                        </IconTile>
                                    </ItemMedia>
                                    <ItemContent className="min-w-0">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <span
                                                className={cn(
                                                    'truncate font-medium',
                                                    expired &&
                                                        'text-muted-foreground',
                                                )}
                                            >
                                                {token.name}
                                            </span>
                                            <span
                                                className={cn(
                                                    chip,
                                                    token.abilities.includes(
                                                        'write',
                                                    )
                                                        ? 'text-foreground'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {token.abilities.includes(
                                                    'write',
                                                )
                                                    ? 'Read & write'
                                                    : 'Read only'}
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
                                        <ItemDescription>
                                            {token.team.name}
                                            <span className="mx-1 text-muted-foreground/50">
                                                /
                                            </span>
                                            {token.lastUsedAt
                                                ? `Last used ${formatRelativeTime(token.lastUsedAt)}`
                                                : 'Never used'}
                                            <span className="mx-1 text-muted-foreground/50">
                                                /
                                            </span>
                                            {expiryText(token)}
                                        </ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label={`Revoke ${token.name}`}
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                                setRevokedToken(token)
                                            }
                                        >
                                            <Trash2 />
                                        </Button>
                                    </ItemActions>
                                </Item>
                            );
                        })}
                    </div>
                )}
            </div>

            <ApiTokenDialog
                key={dialog.key}
                open={dialog.open}
                onOpenChange={(open) =>
                    setDialog((current) => ({ ...current, open }))
                }
                apiUrl={apiUrl}
            />

            <ConfirmDialog
                open={revokedToken !== null}
                onOpenChange={(open) => !open && setRevokedToken(null)}
                title="Revoke token"
                description={`"${revokedToken?.name ?? ''}" stops working at once. Scripts and hooks that use it get 401 errors until you give them a new token.`}
                confirmLabel="Revoke"
                onConfirm={() => {
                    if (revokedToken) {
                        router.delete(destroy.url(revokedToken.id), {
                            preserveScroll: true,
                            onSuccess: () => setRevokedToken(null),
                        });
                    }
                }}
            />
        </>
    );
}

ApiTokens.layout = {
    breadcrumbs: [
        {
            title: 'API tokens',
            href: index(),
        },
    ],
};
