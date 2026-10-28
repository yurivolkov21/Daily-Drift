import { Head, router } from '@inertiajs/react';
import { KeyRound, Plus } from 'lucide-react';
import { useState } from 'react';
import { ApiTokenCard } from '@/components/api-token-card';
import { ApiTokenSheet } from '@/components/api-token-sheet';
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
import { destroy, index } from '@/routes/api-tokens';
import type { ApiToken } from '@/types';

type Props = {
    tokens: ApiToken[];
    apiUrl: string;
};

export default function ApiTokens({ tokens, apiUrl }: Props) {
    const [sheet, setSheet] = useState({ open: false, key: 0 });
    const [revokedToken, setRevokedToken] = useState<ApiToken | null>(null);

    // A new key gives every opening a fresh form, and drops the last token.
    const openSheet = () =>
        setSheet(({ key }) => ({ open: true, key: key + 1 }));

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
                            description="Scripts and AI coding tools, such as Claude Code or Codex, use a token to read and change issues as you, on one team."
                        />
                    </div>
                    {tokens.length > 0 ? (
                        <Button
                            size="sm"
                            data-test="new-api-token"
                            onClick={openSheet}
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
                                Make one for each tool or machine, so you can
                                revoke one without breaking the others.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button size="sm" onClick={openSheet}>
                                <Plus />
                                New token
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {tokens.map((token) => (
                            <ApiTokenCard
                                key={token.id}
                                token={token}
                                onRevoke={setRevokedToken}
                            />
                        ))}
                        <button
                            type="button"
                            onClick={openSheet}
                            className="flex min-h-40 flex-col items-center justify-center gap-2 border border-dashed p-4 text-muted-foreground transition-colors outline-none hover:border-ring hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                        >
                            <Plus className="size-5" />
                            <span className="text-xs font-semibold tracking-widest uppercase">
                                New token
                            </span>
                        </button>
                    </div>
                )}
            </div>

            <ApiTokenSheet
                key={sheet.key}
                open={sheet.open}
                onOpenChange={(open) =>
                    setSheet((current) => ({ ...current, open }))
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
