import { useForm, usePage } from '@inertiajs/react';
import {
    CircleCheck,
    KeyRound,
    Terminal,
    TriangleAlert,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import type { PropertyOption } from '@/components/property-picker';
import { SelectMenu } from '@/components/select-menu';
import { Button } from '@/components/ui/button';
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockContent,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle,
} from '@/components/ui/code-block';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { store } from '@/routes/api-tokens';
import type { NewApiToken } from '@/types';

type TokenAccess = 'read' | 'write';

type TokenForm = {
    name: string;
    team_id: number | null;
    access: TokenAccess;
    expires_in_days: number | null;
};

const accessOptions: {
    value: TokenAccess;
    title: string;
    description: string;
}[] = [
    {
        value: 'write',
        title: 'Read and write',
        description: 'Read issues, create and change them, and comment.',
    },
    {
        value: 'read',
        title: 'Read only',
        description: 'Read projects and issues. Nothing changes.',
    },
];

const expiryOptions: PropertyOption<number | null>[] = [
    { value: null, label: 'No expiration' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: '1 year' },
];

/**
 * Creates an API token, then shows it once with a command to try it. The
 * header follows shadcnspace dialog-07, like the New project dialog, and the
 * access choice is the shadcn/ui Field "choice card".
 */
export function ApiTokenDialog({
    open,
    onOpenChange,
    apiUrl,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    apiUrl: string;
}) {
    const { currentTeam, teams } = usePage().props;
    const [created, setCreated] = useState<NewApiToken | null>(null);
    const form = useForm<TokenForm>({
        name: '',
        team_id: currentTeam?.id ?? teams[0]?.id ?? null,
        access: 'write',
        expires_in_days: null,
    });
    const teamOptions = teams.map((team) => ({
        value: team.id,
        label: team.name,
    }));
    const teamName =
        teams.find((team) => team.id === form.data.team_id)?.name ?? '';
    const name = form.data.name.trim();

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.post(store.url(), {
            preserveScroll: true,
            preserveState: true,
            onFlash: (flash) => {
                const token = flash.apiToken as NewApiToken | undefined;

                if (token) {
                    setCreated(token);
                }
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-md"
            >
                <div className="relative h-40 shrink-0 overflow-hidden bg-background bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[16px_16px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--background)_10%,transparent_70%)]" />
                    <DialogClose
                        render={
                            <Button
                                variant="secondary"
                                size="icon-sm"
                                className="absolute top-3 right-3 z-10"
                            />
                        }
                    >
                        <X />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <span className="flex shrink-0 items-center justify-center border bg-background p-2.5">
                            <span className="flex shrink-0 items-center justify-center border bg-background p-4">
                                {created ? (
                                    <CircleCheck className="size-7" />
                                ) : (
                                    <KeyRound className="size-7" />
                                )}
                            </span>
                        </span>
                        <div className="flex max-w-[calc(100%-2rem)] items-center gap-2 bg-background px-1 text-sm">
                            <span
                                className={cn(
                                    'truncate font-semibold',
                                    !name && 'text-muted-foreground',
                                )}
                            >
                                {name || 'Untitled token'}
                            </span>
                            <span className="shrink-0 border px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
                                {teamName}
                            </span>
                        </div>
                    </div>
                </div>

                {created ? (
                    <CreatedToken
                        token={created}
                        teamName={teamName}
                        apiUrl={apiUrl}
                    />
                ) : (
                    <form
                        onSubmit={submit}
                        className="flex flex-col gap-5 px-6 pt-5 pb-6"
                    >
                        <DialogHeader className="items-center text-center">
                            <DialogTitle className="text-2xl">
                                New API token
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                For one script or machine. You can revoke it any
                                time.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-2">
                            <Label htmlFor="api-token-name">Name</Label>
                            <Input
                                id="api-token-name"
                                data-test="api-token-name"
                                placeholder="Claude Code on my laptop"
                                maxLength={255}
                                value={form.data.name}
                                aria-invalid={Boolean(form.errors.name)}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                autoFocus
                                required
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="api-token-team">Team</Label>
                                <SelectMenu
                                    id="api-token-team"
                                    label="Team"
                                    value={form.data.team_id}
                                    options={teamOptions}
                                    onChange={(teamId) =>
                                        form.setData('team_id', teamId)
                                    }
                                />
                                <InputError message={form.errors.team_id} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="api-token-expiry">
                                    Expires
                                </Label>
                                <SelectMenu
                                    id="api-token-expiry"
                                    label="Expires"
                                    value={form.data.expires_in_days}
                                    options={expiryOptions}
                                    onChange={(days) =>
                                        form.setData('expires_in_days', days)
                                    }
                                />
                                <InputError
                                    message={form.errors.expires_in_days}
                                />
                            </div>
                        </div>

                        <FieldSet>
                            <FieldLegend variant="label" className="mb-0">
                                Access
                            </FieldLegend>
                            <RadioGroup
                                value={form.data.access}
                                onValueChange={(access) =>
                                    form.setData(
                                        'access',
                                        access as TokenAccess,
                                    )
                                }
                                className="gap-2 sm:grid-cols-2"
                            >
                                {accessOptions.map((option) => (
                                    <FieldLabel
                                        key={option.value}
                                        htmlFor={`api-token-access-${option.value}`}
                                    >
                                        <Field orientation="horizontal">
                                            <RadioGroupItem
                                                id={`api-token-access-${option.value}`}
                                                value={option.value}
                                            />
                                            <FieldContent>
                                                <FieldTitle>
                                                    {option.title}
                                                </FieldTitle>
                                                <FieldDescription>
                                                    {option.description}
                                                </FieldDescription>
                                            </FieldContent>
                                        </Field>
                                    </FieldLabel>
                                ))}
                            </RadioGroup>
                            <InputError message={form.errors.access} />
                        </FieldSet>

                        <DialogFooter>
                            <DialogClose
                                render={<Button variant="secondary" />}
                            >
                                Cancel
                            </DialogClose>
                            <Button
                                type="submit"
                                data-test="api-token-create"
                                disabled={form.processing}
                            >
                                Create token
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

/**
 * The new token, shown this once, and a command that checks it works.
 */
function CreatedToken({
    token,
    teamName,
    apiUrl,
}: {
    token: NewApiToken;
    teamName: string;
    apiUrl: string;
}) {
    const command = [
        `curl ${apiUrl}/user \\`,
        '  -H "Accept: application/json" \\',
        `  -H "Authorization: Bearer ${token.plainTextToken}"`,
    ].join('\n');

    return (
        <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
            <DialogHeader className="items-center text-center">
                <DialogTitle className="text-2xl">Token created</DialogTitle>
                <DialogDescription className="text-base">
                    It works on {teamName} and acts as you.
                </DialogDescription>
            </DialogHeader>

            <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                Copy it now. Daily Drift keeps only a fingerprint of it, so this
                is the last time you see it.
            </p>

            <CodeBlock size="sm">
                <CodeBlockHeader>
                    <CodeBlockTitle>
                        <KeyRound />
                        Token
                    </CodeBlockTitle>
                    <CodeBlockActions>
                        <CodeBlockCopyButton value={token.plainTextToken} />
                    </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent wrap data-test="api-token-value">
                    {token.plainTextToken}
                </CodeBlockContent>
            </CodeBlock>

            <CodeBlock size="sm">
                <CodeBlockHeader>
                    <CodeBlockTitle>
                        <Terminal />
                        Try it
                    </CodeBlockTitle>
                    <CodeBlockActions>
                        <CodeBlockCopyButton value={command} />
                    </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent>{command}</CodeBlockContent>
            </CodeBlock>

            <DialogClose render={<Button className="w-full" />}>
                Done
            </DialogClose>
        </div>
    );
}
