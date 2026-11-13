import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { shortDay } from '@/lib/project-views';
import { complete, store, update } from '@/routes/tasks';
import type { Task } from '@/types';

/**
 * What the list and the calendar save (spec 0008), through the task routes
 * the board already uses.
 */
export function taskActions(teamSlug: string) {
    const options = { preserveScroll: true, preserveState: true } as const;

    /** Tick or untick a task; it stays in its list. */
    const setDone = (task: Task, done: boolean) =>
        router.visit(complete({ current_team: teamSlug, task: task.id }), {
            ...options,
            data: { completed: done },
            onError: () => toast.error('The task could not be saved.'),
        });

    /**
     * Change only the due date, which records one `task.due_changed` event.
     * Says where the task went and offers to put it back.
     */
    const reschedule = (
        task: Task,
        dueOn: string | null,
        hooks: { onFinish?: () => void; onSuccess?: () => void } = {},
        undoable = true,
    ) =>
        router.visit(update({ current_team: teamSlug, task: task.id }), {
            ...options,
            data: { due_on: dueOn },
            onSuccess: () => {
                hooks.onSuccess?.();
                toast(
                    dueOn === null
                        ? `“${task.title}” has no due date now`
                        : task.dueOn
                          ? `Moved “${task.title}” to ${shortDay(dueOn)}`
                          : `“${task.title}” is now due ${shortDay(dueOn)}`,
                    undoable
                        ? {
                              action: {
                                  label: 'Undo',
                                  onClick: () =>
                                      reschedule(
                                          { ...task, dueOn },
                                          task.dueOn,
                                          {},
                                          false,
                                      ),
                              },
                          }
                        : undefined,
                );
            },
            onError: () => toast.error('The due date could not be changed.'),
            onFinish: hooks.onFinish,
        });

    /** Add a task at the bottom of a list, with a due date from the calendar. */
    const add = (
        listId: number,
        title: string,
        dueOn: string | null,
        hooks: { onSuccess?: () => void; onError?: () => void } = {},
    ) =>
        router.visit(store({ current_team: teamSlug, list: listId }), {
            ...options,
            data: { title, due_on: dueOn },
            onSuccess: hooks.onSuccess,
            onError: () => {
                hooks.onError?.();
                toast.error('The task could not be added.');
            },
        });

    return { setDone, reschedule, add };
}
