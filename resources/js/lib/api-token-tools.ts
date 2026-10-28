import { Bot, Code, GitBranch, SquareTerminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ApiTokenTool = 'claude-code' | 'codex' | 'git' | 'script';

export type ApiTokenToolPreset = {
    value: ApiTokenTool;
    label: string;
    description: string;
    icon: LucideIcon;
    tokenName: string;
};

/**
 * The tools a token can be set up for. They all report through the same
 * small script and differ only in where its hook goes.
 */
export const apiTokenTools: ApiTokenToolPreset[] = [
    {
        value: 'claude-code',
        label: 'Claude Code',
        description: 'Reports when a session starts and ends.',
        icon: Bot,
        tokenName: 'Claude Code',
    },
    {
        value: 'codex',
        label: 'Codex CLI',
        description: 'Reports when a session starts and ends.',
        icon: SquareTerminal,
        tokenName: 'Codex',
    },
    {
        value: 'git',
        label: 'Git hooks',
        description:
            'For any tool: agents on Ollama, Kiro, Cursor, or your own hands.',
        icon: GitBranch,
        tokenName: 'Git hooks',
    },
    {
        value: 'script',
        label: 'Script or HTTP',
        description: 'Call the API from your own code.',
        icon: Code,
        tokenName: 'Script',
    },
];

export function environmentSnippet(apiUrl: string, token: string): string {
    return [
        '# ~/.bashrc or ~/.zshrc (on Windows, Git Bash)',
        `export DAILY_DRIFT_API=${apiUrl}`,
        `export DAILY_DRIFT_TOKEN='${token}'`,
    ].join('\n');
}

/**
 * The script every hook calls. It sends the current branch, and Daily Drift
 * works out the issue from it, such as DD-12 in dd-12-fix-login. It never
 * fails the tool that runs it.
 */
export const eventScript = [
    '#!/usr/bin/env bash',
    '# Tells Daily Drift that a tool is working on the issue the current',
    '# branch names. Usage: daily-drift-event <event> <tool>',
    'branch=$(git branch --show-current 2>/dev/null)',
    'curl -fsS -m 5 -X POST "$DAILY_DRIFT_API/events" \\',
    '  -H "Authorization: Bearer $DAILY_DRIFT_TOKEN" \\',
    '  -H "Accept: application/json" \\',
    '  -H "Content-Type: application/json" \\',
    '  -d "{\\"event\\":\\"$1\\",\\"tool\\":\\"$2\\",\\"branch\\":\\"$branch\\"}" \\',
    '  > /dev/null 2>&1 || true',
].join('\n');

/**
 * Claude Code and Codex read hooks in the same shape.
 */
export function sessionHooks(tool: 'claude-code' | 'codex'): string {
    const hook = (event: string) => ({
        hooks: [
            {
                type: 'command',
                command: `daily-drift-event ${event} ${tool}`,
            },
        ],
    });

    return JSON.stringify(
        {
            hooks: {
                SessionStart: [hook('session_started')],
                SessionEnd: [hook('session_ended')],
            },
        },
        null,
        2,
    );
}

export const gitHooks = {
    postCheckout: [
        '#!/usr/bin/env bash',
        '# Git passes 1 as the third argument when you switch branches.',
        '[ "$3" = "1" ] && daily-drift-event branch_switched git',
        'exit 0',
    ].join('\n'),
    postCommit: ['#!/usr/bin/env bash', 'daily-drift-event committed git'].join(
        '\n',
    ),
};

export const scriptRequest = [
    'curl -X POST "$DAILY_DRIFT_API/events" \\',
    '  -H "Authorization: Bearer $DAILY_DRIFT_TOKEN" \\',
    '  -H "Accept: application/json" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '{"tool":"my-script","event":"working","issue":"DD-12"}'`,
].join('\n');

export function whoAmIRequest(apiUrl: string, token: string): string {
    return [
        `curl ${apiUrl}/user \\`,
        '  -H "Accept: application/json" \\',
        `  -H "Authorization: Bearer ${token}"`,
    ].join('\n');
}
