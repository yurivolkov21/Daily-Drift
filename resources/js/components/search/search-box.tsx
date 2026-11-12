import { router, useHttp, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Bell,
    ChevronRight,
    LayoutGrid,
    ListChecks,
    ListTodo,
    Search,
    Settings,
    SquareKanban,
    SquareCheck,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LabelBadge } from '@/components/labels/label-badge';
import { MemberAvatar } from '@/components/member-avatar';
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { HUES } from '@/lib/hues';
import type { Hue } from '@/lib/hues';
import type { RecentItem } from '@/lib/recent';
import { recentItems } from '@/lib/recent';
import { cn } from '@/lib/utils';
import { dashboard, myTasks, search } from '@/routes';
import { index as notificationsPage } from '@/routes/notifications';
import { index as projectsIndex, show as showProject } from '@/routes/projects';
import { edit as teamSettings } from '@/routes/teams';
import type { Label } from '@/types';

type TaskResult = {
    id: number;
    title: string;
    project: { id: number; name: string; color: Hue };
    list: string;
    labels: Label[];
    assignee: { id: number; name: string } | null;
    completed: boolean;
    archived: boolean;
};

type ProjectResult = {
    id: number;
    name: string;
    color: Hue;
    archived: boolean;
};

type Results = {
    query: string;
    tasks: TaskResult[];
    projects: ProjectResult[];
};

const MIN_LENGTH = 2;
const PAUSE_MS = 200;

const isMac = () =>
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The search box (spec 0007, round 7): Ctrl K or Cmd K from any team page,
 * or the Search button in the header bar. Recent and Go to before typing;
 * tasks and projects of the current team from two characters.
 */
export function SearchBox() {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? '';
    const { submit } = useHttp();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Results | null>(null);
    const [loading, setLoading] = useState(false);
    const [recent, setRecent] = useState<RecentItem[]>([]);
    const latest = useRef('');

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setOpen((value) => !value);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (open) {
            setRecent(recentItems(teamSlug));
        } else {
            setQuery('');
            setResults(null);
        }
    }, [open, teamSlug]);

    const run = useCallback(
        async (needle: string) => {
            latest.current = needle;

            try {
                const data = (await submit(
                    search(
                        { current_team: teamSlug },
                        { query: { q: needle } },
                    ),
                )) as Results;

                if (latest.current === needle) {
                    setResults(data);
                }
            } finally {
                if (latest.current === needle) {
                    setLoading(false);
                }
            }
        },
        [submit, teamSlug],
    );

    useEffect(() => {
        const needle = query.trim();

        if (needle.length < MIN_LENGTH) {
            latest.current = '';
            setResults(null);
            setLoading(false);

            return;
        }

        setLoading(true);
        const timer = window.setTimeout(() => void run(needle), PAUSE_MS);

        return () => window.clearTimeout(timer);
    }, [query, run]);

    if (!currentTeam) {
        return null;
    }

    const go = (url: string) => {
        setOpen(false);
        router.visit(url);
    };
    const taskUrl = (projectId: number, taskId: number) =>
        `${showProject({ current_team: teamSlug, project: projectId }).url}?task=${taskId}`;
    const typing = query.trim().length >= MIN_LENGTH;
    const goTo: { label: string; icon: LucideIcon; url: string }[] = [
        { label: 'Dashboard', icon: LayoutGrid, url: dashboard(teamSlug).url },
        { label: 'My tasks', icon: ListTodo, url: myTasks(teamSlug).url },
        {
            label: 'Projects',
            icon: SquareKanban,
            url: projectsIndex(teamSlug).url,
        },
        {
            label: 'Notifications',
            icon: Bell,
            url: notificationsPage(teamSlug).url,
        },
        {
            label: 'Team settings',
            icon: Settings,
            url: teamSettings(teamSlug).url,
        },
    ];

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                data-test="search-button"
                aria-label="Search"
                aria-keyshortcuts={isMac() ? 'Meta+K' : 'Control+K'}
                className="hidden h-[42px] items-center gap-2.5 rounded-xl border bg-secondary/50 pr-2 pl-3.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:flex"
            >
                <Search className="size-4" aria-hidden="true" />
                Search
                <kbd className="ml-4 rounded-md border bg-card px-1.5 py-0.5 font-sans text-[11px] font-bold text-foreground/75">
                    {isMac() ? '⌘K' : 'Ctrl K'}
                </kbd>
            </button>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Search"
                className="flex size-[42px] items-center justify-center rounded-xl border bg-card md:hidden"
            >
                <Search className="size-[18px]" />
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    showCloseButton={false}
                    className="top-[14%] translate-y-0 gap-0 overflow-hidden rounded-[22px] p-0 sm:max-w-[640px]"
                >
                    <DialogTitle className="sr-only">Search</DialogTitle>
                    <DialogDescription className="sr-only">
                        Search the tasks and projects of {currentTeam.name}.
                    </DialogDescription>
                    <Command
                        shouldFilter={false}
                        className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-[0.07em] [&_[cmdk-group-heading]]:uppercase"
                    >
                        <div className="flex items-center gap-2 pr-3 [&>[data-slot=command-input-wrapper]]:h-14 [&>[data-slot=command-input-wrapper]]:flex-1 [&>[data-slot=command-input-wrapper]]:border-0">
                            <CommandInput
                                value={query}
                                onValueChange={setQuery}
                                placeholder={`Search tasks and projects in ${currentTeam.name}`}
                                data-test="search-input"
                                className="text-base"
                            />
                            <kbd className="rounded-md border border-b-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted-foreground">
                                Esc
                            </kbd>
                        </div>
                        <CommandList className="max-h-[min(460px,60vh)] border-t px-1.5 py-1.5">
                            {!typing && (
                                <>
                                    {query.trim().length === 1 && (
                                        <p className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                                            Keep typing: search starts at 2
                                            characters.
                                        </p>
                                    )}
                                    {recent.length > 0 && (
                                        <CommandGroup heading="Recent">
                                            {recent.map((item) => (
                                                <CommandItem
                                                    key={`${item.kind}-${item.id}`}
                                                    value={`recent-${item.kind}-${item.id}`}
                                                    onSelect={() =>
                                                        go(
                                                            item.kind === 'task'
                                                                ? taskUrl(
                                                                      item.projectId,
                                                                      item.id,
                                                                  )
                                                                : showProject({
                                                                      current_team:
                                                                          teamSlug,
                                                                      project:
                                                                          item.id,
                                                                  }).url,
                                                        )
                                                    }
                                                    className="gap-3 py-2"
                                                >
                                                    {item.kind === 'task' ? (
                                                        <RowIcon
                                                            icon={SquareCheck}
                                                        />
                                                    ) : (
                                                        <ProjectIcon
                                                            name={item.title}
                                                            color={
                                                                item.color as Hue
                                                            }
                                                        />
                                                    )}
                                                    <span className="flex min-w-0 flex-1 flex-col">
                                                        <span className="truncate font-semibold">
                                                            {item.title}
                                                        </span>
                                                        <span className="truncate text-xs text-muted-foreground">
                                                            {item.kind ===
                                                            'task'
                                                                ? item.projectName
                                                                : 'Project'}
                                                        </span>
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}
                                    <CommandGroup heading="Go to">
                                        {goTo.map((item) => (
                                            <CommandItem
                                                key={item.label}
                                                value={`go-${item.label}`}
                                                onSelect={() => go(item.url)}
                                                className="gap-3 py-2"
                                            >
                                                <RowIcon
                                                    icon={item.icon}
                                                    muted
                                                />
                                                <span className="font-medium">
                                                    {item.label}
                                                </span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}

                            {typing &&
                                results &&
                                results.tasks.length === 0 &&
                                results.projects.length === 0 &&
                                !loading && (
                                    <p className="px-4 py-8 text-center text-[13.5px] text-muted-foreground">
                                        Nothing in {currentTeam.name} matches “
                                        {query.trim()}”.
                                    </p>
                                )}

                            {typing && results && results.tasks.length > 0 && (
                                <CommandGroup heading="Tasks">
                                    {results.tasks.map((task) => (
                                        <CommandItem
                                            key={task.id}
                                            value={`task-${task.id}`}
                                            onSelect={() =>
                                                go(
                                                    taskUrl(
                                                        task.project.id,
                                                        task.id,
                                                    ),
                                                )
                                            }
                                            className="gap-3 py-2"
                                            data-test="search-task"
                                        >
                                            <RowIcon icon={ListChecks} />
                                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                <span
                                                    className={cn(
                                                        'truncate font-semibold',
                                                        task.completed &&
                                                            'text-muted-foreground line-through',
                                                    )}
                                                >
                                                    <Highlight
                                                        text={task.title}
                                                        query={query.trim()}
                                                    />
                                                </span>
                                                <span className="flex min-w-0 items-center gap-0.5 text-xs text-muted-foreground">
                                                    <span className="truncate">
                                                        {task.project.name}
                                                    </span>
                                                    <ChevronRight
                                                        className="size-3! shrink-0 opacity-60"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="truncate">
                                                        {task.list}
                                                    </span>
                                                </span>
                                            </span>
                                            {task.labels
                                                .slice(0, 3)
                                                .map((label) => (
                                                    <LabelBadge
                                                        key={label.id}
                                                        label={label}
                                                        className="hidden sm:inline-flex"
                                                    />
                                                ))}
                                            {(task.completed ||
                                                task.archived) && (
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                                        task.archived
                                                            ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
                                                            : 'bg-emerald-500/12 text-emerald-700',
                                                    )}
                                                >
                                                    {task.archived
                                                        ? 'Archived'
                                                        : 'Done'}
                                                </span>
                                            )}
                                            {task.assignee && (
                                                <MemberAvatar
                                                    id={task.assignee.id}
                                                    name={task.assignee.name}
                                                    className="size-6"
                                                />
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {typing &&
                                results &&
                                results.projects.length > 0 && (
                                    <CommandGroup heading="Projects">
                                        {results.projects.map((project) => (
                                            <CommandItem
                                                key={project.id}
                                                value={`project-${project.id}`}
                                                onSelect={() =>
                                                    go(
                                                        showProject({
                                                            current_team:
                                                                teamSlug,
                                                            project: project.id,
                                                        }).url,
                                                    )
                                                }
                                                className="gap-3 py-2"
                                            >
                                                <ProjectIcon
                                                    name={project.name}
                                                    color={project.color}
                                                />
                                                <span className="flex-1 truncate font-semibold">
                                                    <Highlight
                                                        text={project.name}
                                                        query={query.trim()}
                                                    />
                                                </span>
                                                {project.archived && (
                                                    <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                        Archived
                                                    </span>
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                            {typing && !results && loading && (
                                <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                                    Searching…
                                </p>
                            )}
                        </CommandList>
                        <div className="flex items-center gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
                            <span>Arrow keys move</span>
                            <span>Enter opens</span>
                            <span>Esc closes</span>
                        </div>
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    );
}

function RowIcon({
    icon: Icon,
    muted = false,
}: {
    icon: LucideIcon;
    muted?: boolean;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-[9px]',
                muted
                    ? 'bg-muted text-foreground/70'
                    : 'bg-primary/10 text-primary',
            )}
        >
            <Icon className="size-4!" />
        </span>
    );
}

function ProjectIcon({ name, color }: { name: string; color: Hue }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-[9px] text-xs font-extrabold text-white',
                (HUES[color] ?? HUES.indigo).dot,
            )}
        >
            {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
    );
}

/** The text with its first match of the query marked. */
function Highlight({ text, query }: { text: string; query: string }) {
    const at =
        query === '' ? -1 : text.toLowerCase().indexOf(query.toLowerCase());

    if (at < 0) {
        return <>{text}</>;
    }

    return (
        <>
            {text.slice(0, at)}
            <mark className="rounded-[3px] bg-amber-200/80 px-px text-inherit dark:bg-amber-400/40">
                {text.slice(at, at + query.length)}
            </mark>
            {text.slice(at + query.length)}
        </>
    );
}
