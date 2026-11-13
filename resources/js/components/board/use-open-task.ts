import { useState } from 'react';
import { rememberRecent } from '@/lib/recent';
import type { Project, Task } from '@/types';

/**
 * The task open in the sheet, shared by the board, the list and the
 * calendar (spec 0008). It lives in `?task={id}`, so an open task can be
 * linked to, and opening one adds it to the search box's recent items.
 */
export function useOpenTask(teamSlug: string, project: Project) {
    const [openTaskId, setOpenTaskId] = useState<number | null>(() =>
        taskFromUrl(),
    );
    const openTask =
        project.lists
            .flatMap((list) => list.tasks ?? [])
            .find((task) => task.id === openTaskId) ?? null;

    const showTask = (task: Task | null) => {
        setOpenTaskId(task?.id ?? null);
        setTaskInUrl(task?.id ?? null);

        if (task) {
            rememberRecent(teamSlug, {
                kind: 'task',
                id: task.id,
                title: task.title,
                projectId: project.id,
                projectName: project.name,
            });
        }
    };

    return { openTask, showTask };
}

function taskFromUrl(): number | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const id = Number(new URLSearchParams(window.location.search).get('task'));

    return Number.isInteger(id) && id > 0 ? id : null;
}

/** Keep `?task={id}` in the address bar, so an open task can be linked to. */
function setTaskInUrl(id: number | null): void {
    const url = new URL(window.location.href);

    if (id === null) {
        url.searchParams.delete('task');
        url.searchParams.delete('comment');
    } else {
        url.searchParams.set('task', String(id));
    }

    window.history.replaceState(window.history.state, '', url);
}
