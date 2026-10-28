import { useForm, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    FileCode,
    KeyRound,
    Terminal,
    TriangleAlert,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
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
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    apiTokenTools,
    environmentSnippet,
    eventScript,
    gitHooks,
    scriptRequest,
    sessionHooks,
    whoAmIRequest,
} from '@/lib/api-token-tools';
import type { ApiTokenTool } from '@/lib/api-token-tools';
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

const accessOptions: PropertyOption<TokenAccess>[] = [
    { value: 'write', label: 'Read and write' },
    { value: 'read', label: 'Read only' },
];

const accessHints: Record<TokenAccess, string> = {
    write: 'Read issues, create and change them, and comment. Hooks need this.',
    read: 'Read projects and issues. Nothing changes.',
};

const expiryOptions: PropertyOption<number | null>[] = [
    { value: null, label: 'No expiration' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: '1 year' },
];

/**
 * Creates an API token in two steps, as in option C of the prototype: the
 * tool and the token's details, then the token once with the hook for the
 * tool picked (shadcn/ui Sheet, Field choice cards and Tabs).
 */
export function ApiTokenSheet({
    open,
    onOpenChange,
    apiUrl,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    apiUrl: string;
}) {
    const { currentTeam, teams } = usePage().props;
    const [tool, setTool] = useState<ApiTokenTool>('claude-code');
    const [nameEdited, setNameEdited] = useState(false);
    const [created, setCreated] = useState<NewApiToken | null>(null);
    const form = useForm<TokenForm>({
        name: apiTokenTools[0].tokenName,
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

    const pickTool = (value: ApiTokenTool) => {
        setTool(value);

        if (!nameEdited) {
            form.setData(
                'name',
                apiTokenTools.find((preset) => preset.value === value)
                    ?.tokenName ?? '',
            );
        }
    };

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
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full scroll-fade-y gap-0 overflow-y-auto sm:max-w-lg data-[side=right]:sm:max-w-lg">
                <SheetHeader className="gap-1.5 p-6 pr-16 pb-4">
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                        Step {created ? 2 : 1} of 2
                    </span>
                    <SheetTitle>
                        {created ? 'Connect it' : 'New API token'}
                    </SheetTitle>
                    <SheetDescription>
                        {created
                            ? `It works on ${teamName} and acts as you.`
                            : 'For one tool or machine. You can revoke it any time.'}
                    </SheetDescription>
                    <div
                        aria-hidden="true"
                        className="mt-3 grid grid-cols-2 gap-1"
                    >
                        <span className="h-1 bg-foreground" />
                        <span
                            className={cn(
                                'h-1',
                                created ? 'bg-foreground' : 'bg-muted',
                            )}
                        />
                    </div>
                </SheetHeader>

                {created ? (
                    <ConnectTool
                        token={created}
                        tool={tool}
                        onToolChange={setTool}
                        apiUrl={apiUrl}
                    />
                ) : (
                    <form
                        onSubmit={submit}
                        className="flex flex-1 flex-col gap-5 px-6 pb-6"
                    >
                        <FieldSet>
                            <FieldLegend variant="label" className="mb-0">
                                Where will you use it?
                            </FieldLegend>
                            <RadioGroup
                                value={tool}
                                onValueChange={(value) =>
                                    pickTool(value as ApiTokenTool)
                                }
                                className="gap-2 sm:grid-cols-2"
                            >
                                {apiTokenTools.map((preset) => (
                                    <FieldLabel
                                        key={preset.value}
                                        htmlFor={`api-token-tool-${preset.value}`}
                                    >
                                        <Field
                                            orientation="horizontal"
                                            className="p-3!"
                                        >
                                            <RadioGroupItem
                                                id={`api-token-tool-${preset.value}`}
                                                value={preset.value}
                                            />
                                            <FieldContent>
                                                <FieldTitle>
                                                    <preset.icon className="size-3.5" />
                                                    {preset.label}
                                                </FieldTitle>
                                                <FieldDescription className="text-xs">
                                                    {preset.description}
                                                </FieldDescription>
                                            </FieldContent>
                                        </Field>
                                    </FieldLabel>
                                ))}
                            </RadioGroup>
                        </FieldSet>

                        <div className="grid gap-2">
                            <Label htmlFor="api-token-name">Name</Label>
                            <Input
                                id="api-token-name"
                                data-test="api-token-name"
                                maxLength={255}
                                value={form.data.name}
                                aria-invalid={Boolean(form.errors.name)}
                                onChange={(event) => {
                                    setNameEdited(true);
                                    form.setData('name', event.target.value);
                                }}
                                required
                            />
                            <InputError message={form.errors.name} />
                        </div>

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

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid content-start gap-2">
                                <Label htmlFor="api-token-access">Access</Label>
                                <SelectMenu
                                    id="api-token-access"
                                    label="Access"
                                    value={form.data.access}
                                    options={accessOptions}
                                    onChange={(access) =>
                                        form.setData('access', access)
                                    }
                                />
                                <InputError message={form.errors.access} />
                            </div>
                            <div className="grid content-start gap-2">
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
                        <p className="-mt-2 text-sm text-muted-foreground">
                            {accessHints[form.data.access]}
                        </p>

                        <div className="mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                            <SheetClose render={<Button variant="secondary" />}>
                                Cancel
                            </SheetClose>
                            <Button
                                type="submit"
                                data-test="api-token-create"
                                disabled={form.processing}
                            >
                                Create token
                                <ArrowRight />
                            </Button>
                        </div>
                    </form>
                )}
            </SheetContent>
        </Sheet>
    );
}

/**
 * Step 2: the token this once, then how to hook up each tool. The tool
 * picked in step 1 opens first, and the others stay a tab away.
 */
function ConnectTool({
    token,
    tool,
    onToolChange,
    apiUrl,
}: {
    token: NewApiToken;
    tool: ApiTokenTool;
    onToolChange: (tool: ApiTokenTool) => void;
    apiUrl: string;
}) {
    const environment = environmentSnippet(apiUrl, token.plainTextToken);

    return (
        <div className="flex flex-1 flex-col gap-5 px-6 pb-6">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                Copy it now. Daily Drift keeps only a fingerprint of it, so this
                is the last time you see it.
            </p>

            <Snippet
                title="Token"
                icon={<KeyRound />}
                code={token.plainTextToken}
                wrap
                data-test="api-token-value"
            />

            <Tabs
                value={tool}
                onValueChange={(value) => onToolChange(value as ApiTokenTool)}
            >
                <TabsList
                    variant="line"
                    className="w-full flex-wrap justify-start"
                >
                    {apiTokenTools.map((preset) => (
                        <TabsTrigger
                            key={preset.value}
                            value={preset.value}
                            className="flex-none"
                        >
                            <preset.icon />
                            {preset.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="claude-code">
                    <Steps>
                        <Step title="Put the URL and the token in your shell's profile.">
                            <Snippet
                                title="Shell profile"
                                icon={<Terminal />}
                                code={environment}
                            />
                        </Step>
                        <ScriptStep />
                        <Step title="Add the hooks to .claude/settings.json in the repository, or to ~/.claude/settings.json for every repository.">
                            <Snippet
                                title="settings.json"
                                icon={<FileCode />}
                                code={sessionHooks('claude-code')}
                            />
                        </Step>
                        <Step title="Start Claude Code on a branch named after an issue, such as dd-12-fix-login. The issue moves to In Progress." />
                    </Steps>
                </TabsContent>

                <TabsContent value="codex">
                    <Steps>
                        <Step title="Put the URL and the token in your shell's profile.">
                            <Snippet
                                title="Shell profile"
                                icon={<Terminal />}
                                code={environment}
                            />
                        </Step>
                        <ScriptStep />
                        <Step title="Add the hooks to ~/.codex/hooks.json, or to .codex/hooks.json in the repository, then trust them with /hooks in Codex.">
                            <Snippet
                                title="hooks.json"
                                icon={<FileCode />}
                                code={sessionHooks('codex')}
                            />
                        </Step>
                        <Step title="Start Codex on a branch named after an issue, such as dd-12-fix-login. The issue moves to In Progress." />
                    </Steps>
                </TabsContent>

                <TabsContent value="git">
                    <Steps>
                        <Step title="Put the URL and the token in your shell's profile.">
                            <Snippet
                                title="Shell profile"
                                icon={<Terminal />}
                                code={environment}
                            />
                        </Step>
                        <ScriptStep />
                        <Step title="In the repository, save these as .git/hooks/post-checkout and .git/hooks/post-commit, and run chmod +x on both.">
                            <Snippet
                                title="post-checkout"
                                icon={<FileCode />}
                                code={gitHooks.postCheckout}
                            />
                            <Snippet
                                title="post-commit"
                                icon={<FileCode />}
                                code={gitHooks.postCommit}
                            />
                        </Step>
                        <Step title="Switch to a branch named after an issue, or commit on it, with any tool. The issue moves to In Progress." />
                    </Steps>
                </TabsContent>

                <TabsContent value="script">
                    <Steps>
                        <Step title="Put the URL and the token where your script runs.">
                            <Snippet
                                title="Shell profile"
                                icon={<Terminal />}
                                code={environment}
                            />
                        </Step>
                        <Step title="Check the token: the answer names you, the team and what the token may do.">
                            <Snippet
                                title="Who am I"
                                icon={<Terminal />}
                                code={whoAmIRequest(
                                    apiUrl,
                                    token.plainTextToken,
                                )}
                            />
                        </Step>
                        <Step title="Tell Daily Drift what you work on. Issues in Backlog or Todo move to In Progress, and never backwards.">
                            <Snippet
                                title="Report work"
                                icon={<Terminal />}
                                code={scriptRequest}
                            />
                        </Step>
                    </Steps>
                </TabsContent>
            </Tabs>

            <SheetClose render={<Button className="mt-auto w-full" />}>
                Done
            </SheetClose>
        </div>
    );
}

function Steps({ children }: { children: ReactNode }) {
    return (
        <ol className="mt-4 grid gap-5 text-sm [counter-reset:step]">
            {children}
        </ol>
    );
}

function Step({ title, children }: { title: string; children?: ReactNode }) {
    return (
        <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 gap-y-3 [counter-increment:step]">
            <span className="flex size-5 items-center justify-center border text-xs tabular-nums before:content-[counter(step)]" />
            <p className="leading-relaxed">{title}</p>
            {children ? (
                <div className="col-start-2 grid min-w-0 gap-3">{children}</div>
            ) : null}
        </li>
    );
}

function ScriptStep() {
    return (
        <Step title="Save this script as daily-drift-event somewhere on your PATH, such as ~/.local/bin, and run chmod +x on it. Every hook calls it.">
            <Snippet
                title="daily-drift-event"
                icon={<FileCode />}
                code={eventScript}
            />
        </Step>
    );
}

function Snippet({
    title,
    icon,
    code,
    wrap = false,
    ...props
}: {
    title: string;
    icon: ReactNode;
    code: string;
    wrap?: boolean;
    'data-test'?: string;
}) {
    return (
        <CodeBlock size="sm">
            <CodeBlockHeader>
                <CodeBlockTitle>
                    {icon}
                    {title}
                </CodeBlockTitle>
                <CodeBlockActions>
                    <CodeBlockCopyButton value={code} />
                </CodeBlockActions>
            </CodeBlockHeader>
            <CodeBlockContent wrap={wrap} {...props}>
                {code}
            </CodeBlockContent>
        </CodeBlock>
    );
}
