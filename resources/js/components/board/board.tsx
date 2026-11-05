import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AddList } from '@/components/board/add-list';
import {
    ListColumn,
    columnKey,
    listIdFromKey,
} from '@/components/board/list-column';
import type { KanbanCommitMeta } from '@/components/reui/kanban';
import { Kanban, KanbanBoard, KanbanOverlay } from '@/components/reui/kanban';
import { move } from '@/routes/lists';
import type { Project, TaskList } from '@/types';

/** Cards arrive with the tasks feature; until then every column is empty. */
type BoardItem = { id: string };

type Props = {
    teamSlug: string;
    project: Project;
};

export function Board({ teamSlug, project }: Props) {
    const canManage = project.can.manageLists;
    // The column order shown while a move is on its way to the server. Back to
    // null when the request ends: the new props then hold the saved order, or
    // the old one if the move failed.
    const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);

    const lists = orderLists(project.lists, pendingOrder);
    const value = Object.fromEntries(
        lists.map((list): [string, BoardItem[]] => [columnKey(list.id), []]),
    );

    const commit = (
        _next: Record<string, BoardItem[]>,
        meta: KanbanCommitMeta<BoardItem>,
    ) => {
        if (meta.kind !== 'column') {
            return;
        }

        router.visit(
            move({
                current_team: teamSlug,
                list: listIdFromKey(meta.activeContainer),
            }),
            {
                data: { index: meta.overIndex },
                preserveScroll: true,
                preserveState: true,
                onError: () => toast.error('The list could not be moved.'),
                onFinish: () => setPendingOrder(null),
            },
        );
    };

    return (
        <Kanban
            value={value}
            onValueChange={(next) => setPendingOrder(Object.keys(next))}
            getItemValue={(item) => item.id}
            onValueCommit={commit}
        >
            <KanbanBoard className="-mx-4 flex snap-x scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-4 md:-mx-6 md:scroll-px-6 md:px-6">
                {lists.map((list) => (
                    <ListColumn
                        key={list.id}
                        teamSlug={teamSlug}
                        list={list}
                        canManage={canManage}
                    />
                ))}
                {canManage && (
                    <AddList teamSlug={teamSlug} projectId={project.id} />
                )}
            </KanbanBoard>
            <KanbanOverlay>
                {({ value: key, variant }) => {
                    const list = lists.find(
                        (item) => columnKey(item.id) === String(key),
                    );

                    return variant === 'column' && list ? (
                        <ListColumn
                            teamSlug={teamSlug}
                            list={list}
                            canManage={canManage}
                            isOverlay
                        />
                    ) : null;
                }}
            </KanbanOverlay>
        </Kanban>
    );
}

/** The lists in the pending order when it still matches them, else as saved. */
function orderLists(lists: TaskList[], order: string[] | null): TaskList[] {
    if (!order || order.length !== lists.length) {
        return lists;
    }

    const byKey = new Map(lists.map((list) => [columnKey(list.id), list]));
    const ordered = order.flatMap((key) => {
        const list = byKey.get(key);

        return list ? [list] : [];
    });

    return ordered.length === lists.length ? ordered : lists;
}
