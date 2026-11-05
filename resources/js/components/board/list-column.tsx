import { Form, router } from '@inertiajs/react';
import {
    Check,
    ListTodo,
    MoreHorizontal,
    Palette,
    Pencil,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    KanbanColumn,
    KanbanColumnContent,
    KanbanColumnHandle,
} from '@/components/reui/kanban';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { HUE_NAMES, HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { destroy, update } from '@/routes/lists';
import type { TaskList } from '@/types';

/**
 * Kanban column keys. Plain numeric keys would be reordered by JavaScript,
 * which sorts integer-like object keys, so every key gets a prefix.
 */
export const columnKey = (id: number) => `list-${id}`;

export const listIdFromKey = (key: string) => Number(key.replace('list-', ''));

type Props = {
    teamSlug: string;
    list: TaskList;
    canManage: boolean;
    isOverlay?: boolean;
};

export function ListColumn({
    teamSlug,
    list,
    canManage,
    isOverlay = false,
}: Props) {
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const parameters = { current_team: teamSlug, list: list.id };

    const title = (
        <>
            <span
                className={cn(
                    'size-2.5 shrink-0 rounded-full',
                    HUES[list.color].dot,
                )}
            />
            <span className="truncate text-sm font-semibold">{list.name}</span>
            <span
                className={cn(
                    'rounded-full px-2 py-px text-xs font-medium tabular-nums',
                    HUES[list.color].pill,
                )}
            >
                0
            </span>
        </>
    );

    return (
        <KanbanColumn
            value={columnKey(list.id)}
            disabled={!canManage}
            aria-label={list.name}
            className={cn(
                'flex w-[19rem] shrink-0 snap-start flex-col gap-2 rounded-2xl border p-2',
                HUES[list.color].column,
                isOverlay && 'shadow-lg',
            )}
        >
            <div className="flex min-h-8 items-center gap-2 px-1.5 pt-1">
                {renaming ? (
                    <RenameListForm
                        teamSlug={teamSlug}
                        list={list}
                        onDone={() => setRenaming(false)}
                    />
                ) : (
                    <>
                        {canManage ? (
                            <KanbanColumnHandle asChild>
                                <button
                                    type="button"
                                    aria-label={`Move ${list.name}`}
                                    className="flex min-w-0 items-center gap-2 rounded-md opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {title}
                                </button>
                            </KanbanColumnHandle>
                        ) : (
                            <div className="flex min-w-0 items-center gap-2">
                                {title}
                            </div>
                        )}
                        {canManage && !isOverlay && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="ml-auto"
                                        aria-label={`Actions for ${list.name}`}
                                    >
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onSelect={() => setRenaming(true)}
                                    >
                                        <Pencil /> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Palette /> Color
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {HUE_NAMES.map((hue) => (
                                                <DropdownMenuItem
                                                    key={hue}
                                                    onSelect={() =>
                                                        router.visit(
                                                            update(parameters),
                                                            {
                                                                data: {
                                                                    color: hue,
                                                                },
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <span
                                                        className={cn(
                                                            'size-3 rounded-full',
                                                            HUES[hue].dot,
                                                        )}
                                                    />
                                                    {HUES[hue].label}
                                                    {list.color === hue && (
                                                        <Check className="ml-auto" />
                                                    )}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={() => setDeleting(true)}
                                    >
                                        <Trash2 /> Delete list
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </>
                )}
            </div>

            <KanbanColumnContent
                value={columnKey(list.id)}
                className="flex min-h-28 flex-col gap-2"
            >
                <div className="flex min-h-28 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-current/10 text-center text-xs text-muted-foreground">
                    <ListTodo className="size-4" />
                    No tasks yet
                </div>
            </KanbanColumnContent>

            {canManage && !isOverlay && (
                <AlertDialog open={deleting} onOpenChange={setDeleting}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete “{list.name}”?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                The list and every task in it are deleted. This
                                cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                onClick={() =>
                                    router.visit(destroy(parameters), {
                                        preserveScroll: true,
                                    })
                                }
                            >
                                Delete list
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </KanbanColumn>
    );
}

function RenameListForm({
    teamSlug,
    list,
    onDone,
}: {
    teamSlug: string;
    list: TaskList;
    onDone: () => void;
}) {
    return (
        <Form
            {...update.form({ current_team: teamSlug, list: list.id })}
            options={{ preserveScroll: true }}
            onSuccess={onDone}
            className="flex w-full flex-col gap-1"
        >
            {({ errors, processing }) => (
                <>
                    <div className="flex items-center gap-1">
                        <Input
                            name="name"
                            defaultValue={list.name}
                            aria-label="List name"
                            maxLength={80}
                            required
                            autoFocus
                            onFocus={(event) => event.currentTarget.select()}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    onDone();
                                }
                            }}
                            className="h-8 bg-background"
                        />
                        <Button
                            type="submit"
                            size="icon-sm"
                            disabled={processing}
                            aria-label="Save name"
                        >
                            <Check />
                        </Button>
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={onDone}
                            aria-label="Cancel renaming"
                        >
                            <X />
                        </Button>
                    </div>
                    <InputError message={errors.name} />
                </>
            )}
        </Form>
    );
}
