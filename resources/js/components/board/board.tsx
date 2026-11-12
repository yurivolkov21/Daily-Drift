import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AddList } from '@/components/board/add-list';
import {
    ListColumn,
    columnKey,
    listIdFromKey,
} from '@/components/board/list-column';
import type { TaskStep } from '@/components/board/task-card';
import { TaskCard, itemKey, taskIdFromKey } from '@/components/board/task-card';
import { TaskSheet } from '@/components/board/task-sheet';
import type { KanbanCommitMeta } from '@/components/reui/kanban';
import { Kanban, KanbanBoard, KanbanOverlay } from '@/components/reui/kanban';
import { move as moveList } from '@/routes/lists';
import { move as moveTask } from '@/routes/tasks';
import type { Project, Task } from '@/types';

type Columns = Record<string, Task[]>;

type Props = {
    teamSlug: string;
    project: Project;
};

export function Board({ teamSlug, project }: Props) {
    const canManage = project.can.manageLists;
    const saved: Columns = Object.fromEntries(
        project.lists.map((list) => [columnKey(list.id), list.tasks ?? []]),
    );

    // The board as shown while a drag is on its way to the server. Back to
    // null when the request ends: the new props then hold the saved board,
    // or the old one if the move failed.
    const [pending, setPending] = useState<Columns | null>(null);
    const committed = useRef(false);
    const columns = pending && sameColumns(pending, saved) ? pending : saved;
    const lists = Object.keys(columns).flatMap((key) => {
        const list = project.lists.find((item) => columnKey(item.id) === key);

        return list ? [list] : [];
    });

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
    };

    const [folded, setFolded] = useFoldedLists(project.id);
    const unfold = (listId: number) =>
        setFolded((ids) => ids.filter((id) => id !== listId));
    const toggleFold = (listId: number) =>
        setFolded((ids) =>
            ids.includes(listId)
                ? ids.filter((id) => id !== listId)
                : [...ids, listId],
        );

    const saveMove = (
        url: ReturnType<typeof moveList>,
        data: Record<string, number>,
        what: string,
        onSuccess?: () => void,
    ) =>
        router.visit(url, {
            data,
            preserveScroll: true,
            preserveState: true,
            onSuccess,
            onError: () => toast.error(`The ${what} could not be moved.`),
            onFinish: () => setPending(null),
        });

    const moveTaskTo = (
        task: Task,
        listId: number,
        index: number,
        onSuccess?: () => void,
    ) =>
        saveMove(
            moveTask({ current_team: teamSlug, task: task.id }),
            { list_id: listId, index },
            'task',
            onSuccess,
        );

    // A task dropped on a folded list disappears from view, so say where it
    // went and offer to show the list or put the task back.
    const announceFoldedDrop = (task: Task, meta: KanbanCommitMeta<Task>) => {
        const target = lists.find(
            (list) => columnKey(list.id) === meta.overContainer,
        );

        if (!target) {
            return;
        }

        toast(`“${task.title}” moved to ${target.name}`, {
            action: { label: 'Show', onClick: () => unfold(target.id) },
            cancel: {
                label: 'Undo',
                onClick: () =>
                    moveTaskTo(
                        task,
                        listIdFromKey(meta.activeContainer),
                        meta.activeIndex,
                    ),
            },
        });
    };

    /** Alt + arrow keys: one place up or down, or into the next unfolded list. */
    const stepTask = (task: Task, step: TaskStep) => {
        const position = lists.findIndex((list) => list.id === task.listId);
        const items = columns[columnKey(task.listId)] ?? [];
        const index = items.findIndex((item) => item.id === task.id);
        const refocus = () =>
            requestAnimationFrame(() =>
                document
                    .querySelector<HTMLElement>(`[data-task-id="${task.id}"]`)
                    ?.focus(),
            );

        if (step === 'up' || step === 'down') {
            const target = step === 'up' ? index - 1 : index + 1;

            if (target >= 0 && target < items.length) {
                moveTaskTo(task, task.listId, target, refocus);
            }

            return;
        }

        const direction = step === 'left' ? -1 : 1;

        for (
            let next = position + direction;
            next >= 0 && next < lists.length;
            next += direction
        ) {
            if (!folded.includes(lists[next].id)) {
                const length = (columns[columnKey(lists[next].id)] ?? [])
                    .length;

                moveTaskTo(
                    task,
                    lists[next].id,
                    Math.min(index, length),
                    refocus,
                );

                return;
            }
        }
    };

    const commit = (_next: Columns, meta: KanbanCommitMeta<Task>) => {
        committed.current = true;

        if (meta.kind === 'column') {
            saveMove(
                moveList({
                    current_team: teamSlug,
                    list: listIdFromKey(meta.activeContainer),
                }),
                { index: meta.overIndex },
                'list',
            );

            return;
        }

        const taskId = taskIdFromKey(String(meta.event.active.id));
        const task = Object.values(meta.previousValue)
            .flat()
            .find((item) => item.id === taskId);
        const intoFolded =
            meta.activeContainer !== meta.overContainer &&
            folded.includes(listIdFromKey(meta.overContainer));

        saveMove(
            moveTask({ current_team: teamSlug, task: taskId }),
            {
                list_id: listIdFromKey(meta.overContainer),
                index: meta.overIndex,
            },
            'task',
            intoFolded && task
                ? () => announceFoldedDrop(task, meta)
                : undefined,
        );
    };

    return (
        <>
            <Kanban
                value={columns}
                onValueChange={setPending}
                getItemValue={itemKey}
                onValueCommit={commit}
                onDragStart={() => {
                    committed.current = false;
                }}
                onDragEnd={() => {
                    // onDragEnd runs before the commit; drop the preview only
                    // when the drag ended without one (same place, no target).
                    setTimeout(() => {
                        if (!committed.current) {
                            setPending(null);
                        }
                    });
                }}
                onDragCancel={() => setPending(null)}
            >
                <KanbanBoard className="flex scrollbar-thin snap-x items-start gap-3 overflow-x-auto pb-3">
                    {lists.map((list, position) => (
                        <ListColumn
                            key={list.id}
                            teamSlug={teamSlug}
                            list={list}
                            tasks={columns[columnKey(list.id)] ?? []}
                            canManage={canManage}
                            onOpenTask={showTask}
                            onStepTask={stepTask}
                            folded={folded.includes(list.id)}
                            onToggleFold={() => toggleFold(list.id)}
                            className="animate-rise [animation-fill-mode:backwards]"
                            style={{
                                animationDelay: `${160 + position * 70}ms`,
                            }}
                        />
                    ))}
                    {canManage && (
                        <AddList teamSlug={teamSlug} projectId={project.id} />
                    )}
                </KanbanBoard>
                <KanbanOverlay>
                    {({ value: key, variant }) => {
                        if (variant === 'column') {
                            const list = lists.find(
                                (item) => columnKey(item.id) === String(key),
                            );

                            return list ? (
                                <ListColumn
                                    teamSlug={teamSlug}
                                    list={list}
                                    tasks={columns[columnKey(list.id)] ?? []}
                                    canManage={canManage}
                                    isOverlay
                                />
                            ) : null;
                        }

                        const task = Object.values(columns)
                            .flat()
                            .find((item) => itemKey(item) === String(key));

                        return task ? (
                            <TaskCard
                                teamSlug={teamSlug}
                                task={task}
                                canManage={canManage}
                                isOverlay
                            />
                        ) : null;
                    }}
                </KanbanOverlay>
            </Kanban>

            <TaskSheet
                teamSlug={teamSlug}
                project={project}
                task={openTask}
                canManage={canManage}
                onClose={() => showTask(null)}
            />
        </>
    );
}

/**
 * The lists a person has folded on this project, kept in the browser so the
 * board opens the way they left it.
 */
function useFoldedLists(projectId: number) {
    const key = `board.folded.${projectId}`;
    const [folded, setFolded] = useState<number[]>(() => {
        try {
            const stored: unknown = JSON.parse(
                localStorage.getItem(key) ?? '[]',
            );

            return Array.isArray(stored)
                ? stored.filter((id): id is number => typeof id === 'number')
                : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(folded));
        } catch {
            // Storage can be unavailable (private windows); folding still works.
        }
    }, [key, folded]);

    return [folded, setFolded] as const;
}

/** The preview only applies while it holds the same columns and tasks as the saved board. */
function sameColumns(preview: Columns, saved: Columns): boolean {
    const ids = (columns: Columns) =>
        Object.values(columns)
            .flat()
            .map((task) => task.id)
            .sort((a, b) => a - b)
            .join(',');

    return (
        Object.keys(preview).sort().join(',') ===
            Object.keys(saved).sort().join(',') && ids(preview) === ids(saved)
    );
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
