import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { shortDay } from '@/lib/project-views';
import { nextDue } from '@/lib/repeat';
import { complete } from '@/routes/tasks';
import type { Project, Task } from '@/types';

/**
 * Complete or reopen a task from the board, the sheet, the list or the
 * calendar (spec 0010). Completing moves it to the project's Done list and,
 * for a recurring task, creates the next one; a toast says so and offers
 * Undo.
 */
export function completeTask(
    teamSlug: string,
    task: Pick<Task, 'id' | 'title' | 'listId' | 'dueOn' | 'repeat'>,
    completed: boolean,
    context: { project?: Pick<Project, 'lists'>; today: string },
    hooks: { onSuccess?: () => void } = {},
): void {
    const doneList = context.project?.lists.find((list) => list.isDone);
    const moves =
        completed && doneList !== undefined && doneList.id !== task.listId;
    const next =
        completed && task.repeat && task.dueOn
            ? nextDue(
                  task.dueOn,
                  task.repeat,
                  context.today,
                  task.repeat.anchorOn ?? task.dueOn,
              )
            : null;

    router.visit(complete({ current_team: teamSlug, task: task.id }), {
        data: { completed },
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
            hooks.onSuccess?.();

            if (!moves && next === null) {
                return;
            }

            const where = moves
                ? `Done, and moved to ${doneList.name}.`
                : 'Done.';
            const repeat = next
                ? ` The next one is due ${shortDay(next)}.`
                : '';

            toast(`${where}${repeat}`, {
                action: {
                    label: 'Undo',
                    onClick: () => completeTask(teamSlug, task, false, context),
                },
            });
        },
        onError: () => toast.error('The task could not be saved.'),
    });
}
