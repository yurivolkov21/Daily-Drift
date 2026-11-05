import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AddList } from '@/components/board/add-list';
import {
    ListColumn,
    columnKey,
    listIdFromKey,
} from '@/components/board/list-column';
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

    const saveMove = (
        url: ReturnType<typeof moveList>,
        data: Record<string, number>,
        what: string,
    ) =>
        router.visit(url, {
            data,
            preserveScroll: true,
            preserveState: true,
            onError: () => toast.error(`The ${what} could not be moved.`),
            onFinish: () => setPending(null),
        });

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

        saveMove(
            moveTask({
                current_team: teamSlug,
                task: taskIdFromKey(String(meta.event.active.id)),
            }),
            {
                list_id: listIdFromKey(meta.overContainer),
                index: meta.overIndex,
            },
            'task',
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
                <KanbanBoard className="-mx-4 flex snap-x scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-4 md:-mx-6 md:scroll-px-6 md:px-6">
                    {lists.map((list) => (
                        <ListColumn
                            key={list.id}
                            teamSlug={teamSlug}
                            list={list}
                            tasks={columns[columnKey(list.id)] ?? []}
                            canManage={canManage}
                            onOpenTask={showTask}
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
    } else {
        url.searchParams.set('task', String(id));
    }

    window.history.replaceState(window.history.state, '', url);
}
