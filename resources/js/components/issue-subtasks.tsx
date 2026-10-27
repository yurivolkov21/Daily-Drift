import { router, useForm, usePage } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { SubtaskProgress } from '@/components/subtask-progress';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { destroy, store, update } from '@/routes/issues/subtasks';
import type { IssueSubtask } from '@/types';

type SubtaskPageProps = {
    subtasks: IssueSubtask[];
};

type SubtaskTarget = {
    teamSlug: string;
    issueIdentifier: string;
};

const requestOptions = {
    preserveScroll: true,
    preserveState: true,
    onError: (errors: Record<string, string>) => {
        toast.error(
            Object.values(errors)[0] ?? 'The sub-task could not be saved.',
        );
    },
};

function SubtaskRow({
    subtask,
    target,
}: {
    subtask: IssueSubtask;
    target: SubtaskTarget;
}) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(subtask.title);
    const url = update.url([
        target.teamSlug,
        target.issueIdentifier,
        subtask.id,
    ]);

    const save = (changes: Partial<IssueSubtask>) => {
        router
            .optimistic<SubtaskPageProps>((props) => ({
                subtasks: props.subtasks.map((candidate) =>
                    candidate.id === subtask.id
                        ? { ...candidate, ...changes }
                        : candidate,
                ),
            }))
            .patch(url, changes, requestOptions);
    };

    const rename = () => {
        const trimmedTitle = title.trim();

        setEditing(false);

        if (trimmedTitle === '' || trimmedTitle === subtask.title) {
            setTitle(subtask.title);

            return;
        }

        save({ title: trimmedTitle });
    };

    const remove = () => {
        router
            .optimistic<SubtaskPageProps>((props) => ({
                subtasks: props.subtasks.filter(
                    (candidate) => candidate.id !== subtask.id,
                ),
            }))
            .delete(
                destroy.url([
                    target.teamSlug,
                    target.issueIdentifier,
                    subtask.id,
                ]),
                requestOptions,
            );
    };

    return (
        <li className="group flex min-h-9 items-center gap-3 px-1 hover:bg-muted/60">
            <Checkbox
                checked={subtask.completed}
                onCheckedChange={(checked) => save({ completed: checked })}
                aria-label={`Mark "${subtask.title}" as ${subtask.completed ? 'not done' : 'done'}`}
            />
            {editing ? (
                <Input
                    autoFocus
                    value={title}
                    aria-label="Sub-task title"
                    onChange={(event) => setTitle(event.target.value)}
                    onBlur={rename}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            rename();
                        }

                        if (event.key === 'Escape') {
                            setTitle(subtask.title);
                            setEditing(false);
                        }
                    }}
                    className="h-7 text-sm"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    aria-label={`Rename sub-task: ${subtask.title}`}
                    className={cn(
                        'min-w-0 flex-1 truncate py-1 text-left text-sm',
                        subtask.completed &&
                            'text-muted-foreground line-through',
                    )}
                >
                    {subtask.title}
                </button>
            )}
            <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete sub-task: ${subtask.title}`}
                onClick={remove}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
            >
                <Trash2 />
            </Button>
        </li>
    );
}

function SubtaskComposer({ target }: { target: SubtaskTarget }) {
    const form = useForm({ title: '' });

    const submit = () => {
        if (form.data.title.trim() === '' || form.processing) {
            return;
        }

        form.post(store.url([target.teamSlug, target.issueIdentifier]), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form
            className="grid gap-1"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <Input
                value={form.data.title}
                placeholder="Add a sub-task, then press Enter"
                aria-label="Add a sub-task"
                onChange={(event) => form.setData('title', event.target.value)}
                className="h-8 text-sm"
            />
            <InputError message={form.errors.title} />
        </form>
    );
}

/**
 * The issue's sub-task checklist; ticking them fills the progress bar.
 */
export function IssueSubtasks({
    issueIdentifier,
    subtasks,
}: {
    issueIdentifier: string;
    subtasks: IssueSubtask[];
}) {
    const target = {
        teamSlug: usePage().props.currentTeam?.slug ?? '',
        issueIdentifier,
    };
    const completed = subtasks.filter((subtask) => subtask.completed).length;

    return (
        <section
            aria-labelledby="issue-subtasks-heading"
            className="mt-6 grid gap-3 border-t pt-6"
        >
            <div className="flex items-center gap-4">
                <h2
                    id="issue-subtasks-heading"
                    className="text-xs font-semibold tracking-wider uppercase"
                >
                    Sub-tasks
                </h2>
                <SubtaskProgress
                    completed={completed}
                    total={subtasks.length}
                    className="max-w-60 flex-1"
                />
            </div>
            {subtasks.length > 0 && (
                <ul className="grid">
                    {subtasks.map((subtask) => (
                        <SubtaskRow
                            key={subtask.id}
                            subtask={subtask}
                            target={target}
                        />
                    ))}
                </ul>
            )}
            <SubtaskComposer target={target} />
        </section>
    );
}
