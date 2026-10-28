import { router } from '@inertiajs/react';
import {
    Eye,
    EyeOff,
    Github,
    Info,
    Plug,
    RefreshCw,
    Unplug,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { CodeBlockCopyButton } from '@/components/ui/code-block';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { formatRelativeTime } from '@/lib/issue-activity';
import { cn } from '@/lib/utils';
import { destroy, store } from '@/routes/teams/github';
import type { GithubWebhookSettings, Team } from '@/types';

/**
 * Connects the team's repositories through a webhook: the payload URL and
 * secret to enter on GitHub, the steps to get there, and whether a delivery
 * has arrived yet.
 */
export function TeamGithubSection({
    team,
    github,
}: {
    team: Team;
    github: GithubWebhookSettings | null;
}) {
    const [disconnecting, setDisconnecting] = useState(false);
    const [processing, setProcessing] = useState(false);

    const connect = () =>
        router.post(
            store.url(team.slug),
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            },
        );

    return (
        <div className="space-y-6">
            <Heading
                variant="small"
                title="GitHub"
                description="Pull requests and commits that name an issue, like DD-12, show up on it."
            />

            {github === null ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Github />
                        </EmptyMedia>
                        <EmptyTitle>Not connected</EmptyTitle>
                        <EmptyDescription>
                            Add a webhook to each repository. It takes a minute,
                            and no one signs in to GitHub here.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button
                            size="sm"
                            data-test="connect-github"
                            disabled={processing}
                            onClick={connect}
                        >
                            <Plug />
                            Connect GitHub
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <div className="border" data-test="github-webhook">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 text-sm">
                        <span
                            aria-hidden="true"
                            className={cn(
                                'size-2 shrink-0 rounded-full',
                                github.lastDeliveryAt
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500',
                            )}
                        />
                        <span className="font-medium">
                            {github.lastDeliveryAt
                                ? 'Connected'
                                : 'Waiting for the first delivery'}
                        </span>
                        <span className="text-muted-foreground">
                            {github.lastDeliveryAt
                                ? `Last delivery ${formatRelativeTime(github.lastDeliveryAt)}`
                                : 'GitHub sends a ping when you add the webhook.'}
                        </span>
                        <span className="ml-auto flex gap-1">
                            <Button
                                variant="outline"
                                size="xs"
                                disabled={processing}
                                onClick={connect}
                            >
                                <RefreshCw />
                                New secret
                            </Button>
                            <Button
                                variant="ghost"
                                size="xs"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDisconnecting(true)}
                            >
                                <Unplug />
                                Disconnect
                            </Button>
                        </span>
                    </div>

                    <ol className="grid gap-5 p-4 text-sm [counter-reset:step]">
                        <Step>
                            On GitHub, open the repository&apos;s{' '}
                            <b className="font-medium">Settings › Webhooks</b>{' '}
                            and press <b className="font-medium">Add webhook</b>
                            .
                        </Step>
                        <Step>
                            <span>Fill in the form with these:</span>
                            <CopyField
                                id="github-payload-url"
                                label="Payload URL"
                                value={github.url}
                            />
                            <div className="grid gap-2">
                                <span className="text-xs font-semibold tracking-wide uppercase">
                                    Content type
                                </span>
                                <code className="w-fit border bg-muted/50 px-2 py-1 font-mono text-xs">
                                    application/json
                                </code>
                            </div>
                            <CopyField
                                id="github-secret"
                                label="Secret"
                                value={github.secret}
                                secret
                            />
                        </Step>
                        <Step>
                            Under <b className="font-medium">Which events</b>,
                            pick &quot;Let me select individual events&quot;,
                            tick <b className="font-medium">Pull requests</b>{' '}
                            and <b className="font-medium">Pushes</b>, then
                            press <b className="font-medium">Add webhook</b>.
                        </Step>
                    </ol>

                    <p className="flex gap-2 border-t px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        On your own machine, GitHub cannot reach localhost. Open
                        Daily Drift through a tunnel such as cloudflared, and
                        this page shows the tunnel&apos;s URL instead.
                    </p>
                </div>
            )}

            <ConfirmDialog
                open={disconnecting}
                onOpenChange={setDisconnecting}
                title="Disconnect GitHub"
                description="Deliveries to this URL stop working. Links already on issues stay, and connecting again gives a new URL."
                confirmLabel="Disconnect"
                onConfirm={() =>
                    router.delete(destroy.url(team.slug), {
                        preserveScroll: true,
                        onSuccess: () => setDisconnecting(false),
                    })
                }
            />
        </div>
    );
}

function Step({ children }: { children: ReactNode }) {
    return (
        <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 [counter-increment:step]">
            <span className="flex size-5 items-center justify-center border text-xs tabular-nums before:content-[counter(step)]" />
            <div className="grid min-w-0 gap-3 leading-relaxed">{children}</div>
        </li>
    );
}

/**
 * A value to paste on GitHub, in the frame of the app's inputs, with a copy
 * button. A secret stays hidden until asked for.
 */
function CopyField({
    id,
    label,
    value,
    secret = false,
}: {
    id: string;
    label: string;
    value: string;
    secret?: boolean;
}) {
    const [shown, setShown] = useState(!secret);

    return (
        <div className="grid gap-2">
            <span
                id={`${id}-label`}
                className="text-xs font-semibold tracking-wide uppercase"
            >
                {label}
            </span>
            <div className="flex min-h-10 w-full min-w-0 items-center gap-1 border border-input bg-muted/50 py-1 pr-1 pl-3">
                <code
                    id={id}
                    aria-labelledby={`${id}-label`}
                    className="min-w-0 flex-1 font-mono text-xs leading-relaxed break-all select-all"
                >
                    {shown ? value : '•'.repeat(24)}
                </code>
                {secret ? (
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={
                            shown ? 'Hide the secret' : 'Show the secret'
                        }
                        onClick={() => setShown(!shown)}
                    >
                        {shown ? <EyeOff /> : <Eye />}
                    </Button>
                ) : null}
                <CodeBlockCopyButton value={value} />
            </div>
        </div>
    );
}
