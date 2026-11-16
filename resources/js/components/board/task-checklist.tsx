import { router } from '@inertiajs/react';
import {
    Check,
    Eye,
    EyeOff,
    GripVertical,
    ListChecks,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import type { ClipboardEvent, DragEvent, KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { destroy, move, store, update } from '@/routes/checklist-items';
import type { ChecklistItem, Task } from '@/types';

/** The most items a checklist holds (spec 0010). */
const LIMIT = 50;

const HIDE_KEY = 'checklist.hideChecked';

const readHidden = (): boolean => {
    try {
        return localStorage.getItem(HIDE_KEY) === '1';
    } catch {
        return false;
    }
};

/** Small saves that must not cancel each other or show the page bar. */
const quiet = {
    preserveScroll: true,
    preserveState: true,
    async: true,
    showProgress: false,
} as const;

/**
 * The task sheet's checklist (spec 0010, round 10): progress, items to check,
 * edit in place, reorder (drag, or Alt and an arrow key) and delete with
 * Undo, and an Add field that turns pasted lines into one item each.
 * Checked items can fold away; the choice is remembered in the browser.
 */
export function TaskChecklist({
    teamSlug,
    task,
    canManage,
}: {
    teamSlug: string;
    task: Pick<Task, 'id' | 'checklist' | 'completedAt'>;
    canManage: boolean;
}) {
    const [items, setItems] = useState<ChecklistItem[]>(task.checklist);
    const [hideChecked, setHideChecked] = useState(readHidden);
    const [editing, setEditing] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const [adding, setAdding] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [dragId, setDragId] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    // The server's list wins whenever it arrives.
    useEffect(() => setItems(task.checklist), [task.checklist]);

    const item = (id: number) => ({ current_team: teamSlug, item: id });
    const checked = items.filter((entry) => entry.checked).length;
    const percent =
        items.length === 0 ? 0 : Math.round((checked / items.length) * 100);
    const full = items.length >= LIMIT;
    const shown = hideChecked ? items.filter((entry) => !entry.checked) : items;

    const toggleHidden = () => {
        const next = !hideChecked;
        setHideChecked(next);

        try {
            localStorage.setItem(HIDE_KEY, next ? '1' : '0');
        } catch {
            // Storage can be unavailable (private windows); folding still works.
        }
    };

    const add = (
        body: string,
        options: { index?: number; checked?: boolean } = {},
    ) => {
        if (body.trim() === '') {
            return;
        }

        setError(null);
        router.visit(store({ current_team: teamSlug, task: task.id }), {
            ...quiet,
            data: { body, ...options },
            onError: (errors) =>
                setError(errors.body ?? 'The item could not be added.'),
        });
    };

    const check = (entry: ChecklistItem, value: boolean) => {
        setItems((current) =>
            current.map((other) =>
                other.id === entry.id ? { ...other, checked: value } : other,
            ),
        );
        router.visit(update(item(entry.id)), {
            ...quiet,
            data: { checked: value },
        });
    };

    const save = (entry: ChecklistItem) => {
        const body = draft.replace(/\s*\n\s*/g, ' ').trim();
        setEditing(null);

        if (body === '' || body === entry.body) {
            return;
        }

        setItems((current) =>
            current.map((other) =>
                other.id === entry.id ? { ...other, body } : other,
            ),
        );
        router.visit(update(item(entry.id)), { ...quiet, data: { body } });
    };

    const remove = (entry: ChecklistItem) => {
        const index = items.findIndex((other) => other.id === entry.id);
        setItems((current) => current.filter((other) => other.id !== entry.id));
        router.visit(destroy(item(entry.id)), quiet);
        toast(`Deleted “${entry.body}”`, {
            action: {
                label: 'Undo',
                onClick: () =>
                    add(entry.body, { index, checked: entry.checked }),
            },
        });
    };

    const reorder = (id: number, index: number) => {
        const from = items.findIndex((entry) => entry.id === id);

        if (from < 0 || index === from) {
            return;
        }

        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(index, 0, moved);
        setItems(next);
        router.visit(move(item(id)), { ...quiet, data: { index } });
    };

    const onHandleKey = (
        event: KeyboardEvent<HTMLButtonElement>,
        entry: ChecklistItem,
    ) => {
        const step =
            event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;

        if (!event.altKey || step === 0) {
            return;
        }

        event.preventDefault();
        const from = items.findIndex((other) => other.id === entry.id);
        const to = from + step;

        if (to >= 0 && to < items.length) {
            reorder(entry.id, to);
            // Keep the focus on the handle that moved.
            requestAnimationFrame(() =>
                document
                    .querySelector<HTMLButtonElement>(
                        `[data-checklist-handle="${entry.id}"]`,
                    )
                    ?.focus(),
            );
        }
    };

    const onAddKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            add(adding);
            setAdding('');
        } else if (event.key === 'Escape' && adding !== '') {
            event.stopPropagation();
            setAdding('');
        }
    };

    // Several pasted lines become one item each (the server splits them).
    const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
        const text = event.clipboardData.getData('text');

        if (/\r|\n/.test(text.trim())) {
            event.preventDefault();
            add(`${adding}${text}`);
            setAdding('');
        }
    };

    const dragProps = (entry: ChecklistItem, index: number) =>
        canManage
            ? {
                  draggable: true,
                  onDragStart: (event: DragEvent<HTMLLIElement>) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', entry.body);
                      setDragId(entry.id);
                  },
                  onDragOver: (event: DragEvent<HTMLLIElement>) => {
                      if (dragId === null) {
                          return;
                      }

                      event.preventDefault();
                      setOverIndex(index);
                  },
                  onDrop: (event: DragEvent<HTMLLIElement>) => {
                      event.preventDefault();

                      if (dragId !== null) {
                          reorder(
                              dragId,
                              items.findIndex((other) => other.id === entry.id),
                          );
                      }

                      setDragId(null);
                      setOverIndex(null);
                  },
                  onDragEnd: () => {
                      setDragId(null);
                      setOverIndex(null);
                  },
              }
            : {};

    if (!canManage && items.length === 0) {
        return null;
    }

    return (
        <section
            aria-labelledby={`checklist-${task.id}`}
            className="flex flex-col gap-2.5"
        >
            <div className="flex min-h-8 items-center gap-2.5">
                <h3
                    id={`checklist-${task.id}`}
                    className="flex items-center gap-2 text-sm font-medium"
                >
                    <ListChecks className="size-4 text-muted-foreground" />
                    Checklist
                </h3>
                {items.length > 0 && (
                    <span className="text-[12.5px] font-semibold text-muted-foreground tabular-nums">
                        {checked} of {items.length}
                    </span>
                )}
                {checked > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-pressed={hideChecked}
                        onClick={toggleHidden}
                        className="ml-auto h-7 gap-1.5 px-2 text-[12.5px] text-muted-foreground"
                    >
                        {hideChecked ? <Eye /> : <EyeOff />}
                        {hideChecked ? 'Show checked' : 'Hide checked'}
                    </Button>
                )}
            </div>

            {items.length > 0 && (
                <div
                    role="progressbar"
                    aria-label="Checklist progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="h-1.5 overflow-hidden rounded-full bg-secondary"
                >
                    <span
                        className={cn(
                            'block h-full rounded-full transition-[width] duration-450 ease-panel',
                            checked === items.length
                                ? 'bg-green-500'
                                : 'bg-primary',
                        )}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            )}

            {items.length > 0 &&
                checked === items.length &&
                task.completedAt === null && (
                    <p className="animate-pop text-[12.5px] text-green-700 dark:text-green-400">
                        Every item is checked. The task stays open until you
                        complete it.
                    </p>
                )}

            {shown.length > 0 && (
                <ul
                    aria-label="Checklist items"
                    className="flex flex-col gap-px"
                >
                    {shown.map((entry) => {
                        const index = items.findIndex(
                            (other) => other.id === entry.id,
                        );

                        return (
                            <li
                                key={entry.id}
                                {...dragProps(entry, index)}
                                className={cn(
                                    'group/item relative flex min-h-[38px] items-center gap-1.5 rounded-[10px] px-1 transition-colors hover:bg-secondary/60',
                                    dragId === entry.id && 'opacity-40',
                                    overIndex === index &&
                                        dragId !== entry.id &&
                                        'shadow-[inset_0_2px_0_var(--primary)]',
                                )}
                            >
                                {canManage && (
                                    <button
                                        type="button"
                                        data-checklist-handle={entry.id}
                                        aria-label={`Move ${entry.body}. Drag, or press Alt and an arrow key`}
                                        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                                        onKeyDown={(event) =>
                                            onHandleKey(event, entry)
                                        }
                                        className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/60 opacity-0 outline-none group-hover/item:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:hidden"
                                    >
                                        <GripVertical className="size-4" />
                                    </button>
                                )}
                                <Checkbox
                                    checked={entry.checked}
                                    disabled={!canManage}
                                    aria-label={entry.body}
                                    onCheckedChange={(value) =>
                                        check(entry, value === true)
                                    }
                                    className="size-5 rounded-md data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                                />
                                {editing === entry.id ? (
                                    <input
                                        autoFocus
                                        aria-label="Edit the item"
                                        value={draft}
                                        maxLength={300}
                                        onChange={(event) =>
                                            setDraft(event.target.value)
                                        }
                                        onBlur={() => save(entry)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                save(entry);
                                            } else if (event.key === 'Escape') {
                                                event.stopPropagation();
                                                setEditing(null);
                                            }
                                        }}
                                        className="h-8 min-w-0 flex-1 rounded-lg border border-ring bg-card px-2 text-[13.5px] ring-[3px] ring-ring/15 outline-none"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        disabled={!canManage}
                                        onClick={() => {
                                            setDraft(entry.body);
                                            setEditing(entry.id);
                                        }}
                                        className={cn(
                                            'min-w-0 flex-1 cursor-text px-1 py-1.5 text-left text-[13.5px] leading-snug outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
                                            entry.checked &&
                                                'text-muted-foreground line-through decoration-muted-foreground/50',
                                        )}
                                    >
                                        {entry.body}
                                    </button>
                                )}
                                {canManage && editing !== entry.id && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`More for ${entry.body}`}
                                                className="shrink-0 text-muted-foreground opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
                                            >
                                                <MoreHorizontal />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onSelect={() => {
                                                    setDraft(entry.body);
                                                    setEditing(entry.id);
                                                }}
                                            >
                                                <Pencil /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onSelect={() => remove(entry)}
                                            >
                                                <Trash2 /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {hideChecked && checked > 0 && (
                <p className="flex min-h-9 animate-pop items-center gap-2.5 pl-8 text-[13px] text-muted-foreground">
                    <Check
                        className="size-3.5 text-green-600"
                        strokeWidth={3}
                    />
                    {checked} checked {checked === 1 ? 'item' : 'items'}
                    <button
                        type="button"
                        onClick={toggleHidden}
                        className="rounded-md px-1.5 font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        Show
                    </button>
                </p>
            )}

            {canManage && (
                <label
                    className={cn(
                        'flex min-h-10 items-center gap-2.5 rounded-[10px] border border-dashed border-input px-3 text-muted-foreground transition-colors focus-within:border-ring focus-within:bg-card',
                        full && 'opacity-60',
                    )}
                >
                    <Plus className="size-4 shrink-0" />
                    <input
                        aria-label="Add an item"
                        placeholder={
                            full
                                ? 'A checklist holds up to 50 items'
                                : 'Add an item, or paste several lines'
                        }
                        disabled={full}
                        value={adding}
                        maxLength={300}
                        onChange={(event) => setAdding(event.target.value)}
                        onKeyDown={onAddKey}
                        onPaste={onPaste}
                        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/80"
                    />
                    {adding !== '' && (
                        <kbd className="rounded-md border px-1.5 font-sans text-[11px] text-muted-foreground">
                            Enter
                        </kbd>
                    )}
                </label>
            )}
            {error && <p className="text-[12.5px] text-destructive">{error}</p>}
        </section>
    );
}
