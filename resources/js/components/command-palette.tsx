import { router, usePage } from '@inertiajs/react';
import {
    FolderKanban,
    Keyboard,
    LayoutGrid,
    ListTodo,
    Settings,
    SquareKanban,
    SquarePen,
    UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { IssueStatusIcon } from '@/components/issue-status-icon';
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@/components/ui/command';
import type { PaletteAction } from '@/hooks/use-issue-tracker';
import { dashboard } from '@/routes';
import {
    index as issuesIndex,
    search as searchIssues,
    show as showIssue,
} from '@/routes/issues';
import { edit as editProfile } from '@/routes/profile';
import { index as projectsIndex } from '@/routes/projects';
import type { Issue } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    actions: PaletteAction[];
    onCreateIssue: () => void;
    onShowShortcuts: () => void;
};

export function CommandPalette({
    open,
    onOpenChange,
    actions,
    onCreateIssue,
    onShowShortcuts,
}: Props) {
    const page = usePage();
    const team = page.props.currentTeam;
    const projects = page.props.workspace?.projects ?? [];
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Issue[]>([]);
    const [wasOpen, setWasOpen] = useState(open);

    // Start every session fresh, but keep the old list while the dialog fades out.
    if (open !== wasOpen) {
        setWasOpen(open);

        if (open) {
            setSearch('');
            setResults([]);
        }
    }

    const searchUrl = team
        ? searchIssues.url(team.slug, { query: { query: search } })
        : null;

    useEffect(() => {
        if (!open || !searchUrl) {
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            fetch(searchUrl, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then((response) => (response.ok ? response.json() : null))
                .then((body: { data: Issue[] } | null) =>
                    setResults(body?.data ?? []),
                )
                .catch(() => {});
        }, 150);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [open, searchUrl]);

    const run = (callback: () => void) => {
        onOpenChange(false);
        callback();
    };

    const visit = (url: string) => run(() => router.visit(url));

    if (!team) {
        return null;
    }

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Command palette"
            description="Search issues or run a command"
            className="sm:max-w-xl"
        >
            <Command>
                <CommandInput
                    placeholder="Search issues or type a command..."
                    value={search}
                    onValueChange={setSearch}
                />
                <CommandList className="max-h-96">
                    <CommandEmpty>No results found.</CommandEmpty>

                    {actions.length > 0 ? (
                        <CommandGroup heading="Current issue">
                            {actions.map((action) => (
                                <CommandItem
                                    key={action.id}
                                    value={action.label}
                                    onSelect={() => run(action.onSelect)}
                                >
                                    {action.icon}
                                    {action.label}
                                    {action.shortcut ? (
                                        <CommandShortcut>
                                            {action.shortcut}
                                        </CommandShortcut>
                                    ) : null}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ) : null}

                    {results.length > 0 ? (
                        <CommandGroup
                            heading={search ? 'Issues' : 'Recent issues'}
                        >
                            {results.map((issue) => (
                                <CommandItem
                                    key={issue.id}
                                    value={`${issue.identifier} ${issue.title}`}
                                    onSelect={() =>
                                        visit(
                                            showIssue.url([
                                                team.slug,
                                                issue.identifier,
                                            ]),
                                        )
                                    }
                                >
                                    <IssueStatusIcon status={issue.status} />
                                    <span className="w-14 shrink-0 text-muted-foreground">
                                        {issue.identifier}
                                    </span>
                                    <span className="truncate">
                                        {issue.title}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ) : null}

                    <CommandGroup heading="Commands">
                        <CommandItem
                            value="Create new issue"
                            onSelect={() => run(onCreateIssue)}
                        >
                            <SquarePen />
                            Create new issue
                            <CommandShortcut>C</CommandShortcut>
                        </CommandItem>
                        <CommandItem
                            value="Show keyboard shortcuts"
                            onSelect={() => run(onShowShortcuts)}
                        >
                            <Keyboard />
                            Show keyboard shortcuts
                            <CommandShortcut>?</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>

                    <CommandGroup heading="Navigation">
                        <CommandItem
                            value="Go to issues"
                            onSelect={() => visit(issuesIndex.url(team.slug))}
                        >
                            <ListTodo />
                            Go to issues
                            <CommandShortcut>G I</CommandShortcut>
                        </CommandItem>
                        <CommandItem
                            value="Go to my issues"
                            onSelect={() =>
                                visit(
                                    issuesIndex.url(team.slug, {
                                        query: { assignee: 'me' },
                                    }),
                                )
                            }
                        >
                            <UserRound />
                            Go to my issues
                            <CommandShortcut>G M</CommandShortcut>
                        </CommandItem>
                        <CommandItem
                            value="Go to board"
                            onSelect={() =>
                                visit(
                                    issuesIndex.url(team.slug, {
                                        query: { view: 'board' },
                                    }),
                                )
                            }
                        >
                            <SquareKanban />
                            Go to board
                            <CommandShortcut>G B</CommandShortcut>
                        </CommandItem>
                        <CommandItem
                            value="Go to projects"
                            onSelect={() => visit(projectsIndex.url(team.slug))}
                        >
                            <FolderKanban />
                            Go to projects
                            <CommandShortcut>G P</CommandShortcut>
                        </CommandItem>
                        <CommandItem
                            value="Go to dashboard"
                            onSelect={() => visit(dashboard.url(team.slug))}
                        >
                            <LayoutGrid />
                            Go to dashboard
                            <CommandShortcut>G D</CommandShortcut>
                        </CommandItem>
                        <CommandItem
                            value="Open settings"
                            onSelect={() => visit(editProfile.url())}
                        >
                            <Settings />
                            Open settings
                        </CommandItem>
                    </CommandGroup>

                    {projects.length > 0 ? (
                        <CommandGroup heading="Projects">
                            {projects.map((project) => (
                                <CommandItem
                                    key={project.id}
                                    value={`Project ${project.key} ${project.name}`}
                                    onSelect={() =>
                                        visit(
                                            issuesIndex.url(team.slug, {
                                                query: { project: project.key },
                                            }),
                                        )
                                    }
                                >
                                    <span className="w-9 shrink-0 text-[0.65rem] font-semibold text-muted-foreground">
                                        {project.key}
                                    </span>
                                    {project.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ) : null}
                </CommandList>
            </Command>
        </CommandDialog>
    );
}
