import { router, useHttp } from '@inertiajs/react';
import { ListChecks, PenLine, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PriorityPill } from '@/components/board/task-badges';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { aiError } from '@/lib/ai';
import { cn } from '@/lib/utils';
import { draft, store } from '@/routes/ai/tasks';
import type { Project, TaskDraft, TaskList } from '@/types';

/** The longest brief (spec 0011). */
const BRIEF_LENGTH = 2000;

type Props = {
    teamSlug: string;
    project: Pick<Project, 'id' | 'name' | 'description'>;
    /** Where the kept tasks go: the first list that is not the Done list. */
    list: Pick<TaskList, 'id' | 'name'>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * Draft tasks (spec 0011): a few sentences about the project, then Claude's
 * draft with a checkbox per task. The kept tasks go to the bottom of the
 * first open list, with their descriptions, priorities and steps.
 */
export function DraftTasksDialog({
    teamSlug,
    project,
    list,
    open,
    onOpenChange,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
                {/* Remount on open so each visit starts from the brief. */}
                {open && (
                    <DraftTasks
                        teamSlug={teamSlug}
                        project={project}
                        list={list}
                        onDone={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

type Kept = TaskDraft & { keep: boolean };

function DraftTasks({
    teamSlug,
    project,
    list,
    onDone,
}: Omit<Props, 'open' | 'onOpenChange'> & { onDone: () => void }) {
    const http = useHttp({ brief: project.description ?? '' });
    const [drafts, setDrafts] = useState<Kept[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const parameters = { current_team: teamSlug, project: project.id };
    const kept = drafts?.filter((entry) => entry.keep) ?? [];
    const brief = http.data.brief;
    // The brief's errors, or why Claude could not draft (spec 0011).
    const fieldError = Object.values(http.errors)[0] as string | undefined;

    const ask = async () => {
        setError(null);
        setDrafts(null);

        try {
            // A 422 resolves without a reply; its errors show under the brief.
            const reply = (await http.submit(draft(parameters))) as
                | { tasks: TaskDraft[] }
                | undefined;

            if (reply) {
                setDrafts(reply.tasks.map((task) => ({ ...task, keep: true })));
            }
        } catch (failure) {
            setError(aiError(failure));
        }
    };

    const add = () => {
        setError(null);
        setAdding(true);
        router.visit(store(parameters), {
            data: {
                tasks: kept.map(({ title, description, priority, steps }) => ({
                    title,
                    description,
                    priority,
                    steps,
                })),
            },
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success(
                    kept.length === 1
                        ? `Added 1 task to ${list.name}.`
                        : `Added ${kept.length} tasks to ${list.name}.`,
                );
                onDone();
            },
            onError: (errors) =>
                setError(
                    Object.values(errors)[0] ??
                        'The tasks could not be added. Try again.',
                ),
            onFinish: () => setAdding(false),
        });
    };

    const toggle = (index: number) =>
        setDrafts(
            (current) =>
                current?.map((entry, other) =>
                    other === index ? { ...entry, keep: !entry.keep } : entry,
                ) ?? null,
        );

    const reviewing = drafts !== null && !http.processing;

    return (
        <>
            <div className="flex items-center gap-3 border-b bg-primary/4 px-6 py-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="size-5" />
                </span>
                <DialogHeader className="gap-0.5 text-left">
                    <DialogTitle>Draft tasks</DialogTitle>
                    <DialogDescription>
                        Claude drafts tasks from a few sentences. You choose
                        which ones to add to {list.name}.
                    </DialogDescription>
                </DialogHeader>
            </div>

            {!reviewing && (
                <div className="grid gap-2 px-6 py-5">
                    <Label htmlFor="draft-brief">
                        What is this project about?
                    </Label>
                    <Textarea
                        id="draft-brief"
                        value={brief}
                        onChange={(event) =>
                            http.setData('brief', event.target.value)
                        }
                        placeholder="The goal, who it is for, what has to be ready and by when."
                        maxLength={BRIEF_LENGTH}
                        disabled={http.processing}
                        className="min-h-32"
                        autoFocus
                    />
                    <div className="flex items-start justify-between gap-3 text-[12.5px] text-muted-foreground">
                        <span>
                            Claude also sees the project&apos;s name, its lists
                            and up to 30 open tasks.
                        </span>
                        <span className="shrink-0 tabular-nums">
                            {brief.length} / {BRIEF_LENGTH}
                        </span>
                    </div>
                    {fieldError && (
                        <p
                            role="alert"
                            className="text-[12.5px] text-destructive"
                        >
                            {fieldError}
                        </p>
                    )}
                </div>
            )}

            {http.processing && (
                <div
                    aria-live="polite"
                    className="flex flex-col gap-2.5 border-t px-6 py-5"
                >
                    <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <Spinner className="text-primary" />
                        Claude is drafting tasks. This can take up to a minute.
                    </p>
                    {[72, 58, 66].map((width) => (
                        <div
                            key={width}
                            className="flex flex-col gap-2 rounded-xl border bg-card p-3"
                        >
                            <Skeleton
                                className="h-4"
                                style={{ width: `${width}%` }}
                            />
                            <Skeleton className="h-3 w-11/12" />
                        </div>
                    ))}
                </div>
            )}

            {reviewing && (
                <div className="flex flex-col gap-3 px-6 py-5">
                    <div className="flex items-center gap-2 text-[13px]">
                        <span className="font-semibold">
                            {kept.length} of {drafts.length} chosen
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setDrafts(
                                    drafts.map((entry) => ({
                                        ...entry,
                                        keep: kept.length < drafts.length,
                                    })),
                                )
                            }
                            className="rounded-md px-1.5 font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {kept.length < drafts.length
                                ? 'Choose all'
                                : 'Choose none'}
                        </button>
                    </div>
                    <ul
                        aria-label="Drafted tasks"
                        className="-mx-1 flex thin-scrollbar max-h-[min(58vh,30rem)] flex-col gap-2 overflow-y-auto px-1 pb-1"
                    >
                        {drafts.map((entry, index) => (
                            <li key={`${index}-${entry.title}`}>
                                <label
                                    className={cn(
                                        'flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-[border-color,background-color,opacity] hover:border-primary/30',
                                        entry.keep
                                            ? 'border-primary/25'
                                            : 'opacity-60',
                                    )}
                                >
                                    <Checkbox
                                        checked={entry.keep}
                                        onCheckedChange={() => toggle(index)}
                                        className="mt-0.5"
                                        aria-label={entry.title}
                                    />
                                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                                        <span className="text-sm leading-snug font-semibold wrap-break-word">
                                            {entry.title}
                                        </span>
                                        {entry.description && (
                                            <span className="line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
                                                {entry.description}
                                            </span>
                                        )}
                                        {(entry.priority !== 'none' ||
                                            entry.steps.length > 0) && (
                                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                                <PriorityPill
                                                    priority={entry.priority}
                                                />
                                                {entry.steps.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                                                        <ListChecks className="size-3" />
                                                        {entry.steps.length ===
                                                        1
                                                            ? '1 step'
                                                            : `${entry.steps.length} steps`}
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {error && (
                <p
                    role="alert"
                    className="mx-6 mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
                >
                    {error}
                </p>
            )}

            <DialogFooter className="border-t bg-muted/30 px-6 py-4 sm:justify-between">
                {reviewing ? (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setDrafts(null)}
                            disabled={adding}
                        >
                            <PenLine /> Edit the brief
                        </Button>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void ask()}
                                disabled={adding}
                            >
                                <RotateCcw /> Try again
                            </Button>
                            <Button
                                type="button"
                                onClick={add}
                                disabled={kept.length === 0 || adding}
                            >
                                {adding ? <Spinner /> : <Plus />}
                                {kept.length === 1
                                    ? 'Add 1 task'
                                    : `Add ${kept.length} tasks`}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onDone}
                            className="max-sm:order-last"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void ask()}
                            disabled={brief.trim() === '' || http.processing}
                        >
                            {http.processing ? <Spinner /> : <Sparkles />}
                            {http.processing ? 'Drafting…' : 'Draft tasks'}
                        </Button>
                    </>
                )}
            </DialogFooter>
        </>
    );
}
