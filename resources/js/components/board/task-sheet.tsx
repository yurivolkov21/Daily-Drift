import { Form, router, usePage } from '@inertiajs/react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
    AlignLeft,
    CalendarDays,
    Circle,
    CircleCheck,
    Columns3,
    Flag,
    Tag,
    Trash2,
    User,
    UserRoundCheck,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { LabelField } from '@/components/labels/label-field';
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
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useLocalTime } from '@/hooks/use-local-time';
import { HUES } from '@/lib/hues';
import { dueState, PRIORITIES, PRIORITY_NAMES } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { complete, destroy, move, update } from '@/routes/tasks';
import type { Priority, Project, Task } from '@/types';
import type { Member } from './assignee-field';
import { AssigneeField } from './assignee-field';
import { TaskActivity } from './task-activity';
import { CreatorAvatar } from './task-badges';

type Props = {
    teamSlug: string;
    project: Project;
    task: Task | null;
    canManage: boolean;
    onClose: () => void;
};

export function TaskSheet({
    teamSlug,
    project,
    task,
    canManage,
    onClose,
}: Props) {
    return (
        <Sheet open={task !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-0 bg-card shadow-[0_40px_80px_-30px_rgb(23_21_59/0.55)] duration-450 ease-panel sm:inset-y-3.5 sm:right-3.5 sm:h-auto sm:max-w-lg sm:rounded-card">
                {task && (
                    <TaskForm
                        key={task.id}
                        teamSlug={teamSlug}
                        project={project}
                        task={task}
                        canManage={canManage}
                        onClose={onClose}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}

function TaskForm({
    teamSlug,
    project,
    task,
    canManage,
    onClose,
}: {
    teamSlug: string;
    project: Project;
    task: Task;
    canManage: boolean;
    onClose: () => void;
}) {
    const [priority, setPriority] = useState<Priority>(task.priority);
    const [dueOn, setDueOn] = useState<string | null>(task.dueOn);
    const [deleting, setDeleting] = useState(false);
    const parameters = { current_team: teamSlug, task: task.id };
    const list = project.lists.find((item) => item.id === task.listId);
    const completed = task.completedAt !== null;
    const { today } = useLocalTime();
    const state = dueState({ dueOn, completedAt: task.completedAt }, today);

    const members = (usePage().props.members as Member[] | undefined) ?? [];
    const openCounts: Record<number, number> = {};

    project.lists.forEach((item) =>
        item.tasks?.forEach((other) => {
            if (other.assigneeId !== null && other.completedAt === null) {
                openCounts[other.assigneeId] =
                    (openCounts[other.assigneeId] ?? 0) + 1;
            }
        }),
    );

    // Assigning saves at once, like moving to another list (spec 0004).
    const assign = (assigneeId: number | null) =>
        router.visit(update(parameters), {
            data: { assignee_id: assigneeId },
            preserveScroll: true,
            preserveState: true,
        });

    const moveTo = (listId: number) => {
        const target = project.lists.find((item) => item.id === listId);

        router.visit(move(parameters), {
            data: { list_id: listId, index: target?.tasks?.length ?? 0 },
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <Form
            {...update.form(parameters)}
            options={{ preserveScroll: true, preserveState: true }}
            onSuccess={onClose}
            className="flex min-h-0 flex-1 flex-col"
        >
            {({ errors, processing }) => (
                <>
                    <SheetHeader className="gap-4 border-b pb-5">
                        <SheetDescription className="flex items-center gap-2 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5">
                                <span
                                    className={cn(
                                        'size-2 shrink-0 rounded-full',
                                        HUES[project.color].dot,
                                    )}
                                />
                                <span className="truncate">{project.name}</span>
                            </span>
                            <span aria-hidden>/</span>
                            {list && (
                                <span
                                    className={cn(
                                        'rounded px-1.5 py-px font-medium',
                                        HUES[list.color].pill,
                                    )}
                                >
                                    {list.name}
                                </span>
                            )}
                        </SheetDescription>
                        <SheetTitle className="sr-only">
                            {task.title}
                        </SheetTitle>
                        <div>
                            <Textarea
                                name="title"
                                defaultValue={task.title}
                                aria-label="Title"
                                maxLength={255}
                                required
                                readOnly={!canManage}
                                className="min-h-0 resize-none border-none px-0 py-0 text-xl leading-snug font-semibold shadow-none focus-visible:ring-0 md:text-xl dark:bg-transparent"
                            />
                            <InputError message={errors.title} />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!canManage}
                                onClick={() =>
                                    router.visit(complete(parameters), {
                                        data: { completed: !completed },
                                        preserveScroll: true,
                                        preserveState: true,
                                    })
                                }
                                className={cn(
                                    'rounded-full',
                                    completed &&
                                        'border-green-600/30 bg-green-500/10 text-green-700 hover:bg-green-500/15 dark:text-green-400',
                                )}
                            >
                                {completed ? <CircleCheck /> : <Circle />}
                                {completed ? 'Completed' : 'Mark complete'}
                            </Button>
                            {task.updatedAt && (
                                <span className="text-xs text-muted-foreground">
                                    Updated{' '}
                                    {formatDistanceToNow(
                                        new Date(task.updatedAt),
                                        { addSuffix: true },
                                    )}
                                </span>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="flex thin-scrollbar flex-1 flex-col gap-6 overflow-y-auto p-4">
                        <div className="divide-y rounded-xl border">
                            <Property icon={<Columns3 />} label="List">
                                <Select
                                    value={String(task.listId)}
                                    onValueChange={(value) =>
                                        moveTo(Number(value))
                                    }
                                    disabled={!canManage}
                                >
                                    <SelectTrigger className="w-full border-none shadow-none hover:bg-accent dark:bg-transparent">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {project.lists.map((item) => (
                                            <SelectItem
                                                key={item.id}
                                                value={String(item.id)}
                                            >
                                                <span
                                                    className={cn(
                                                        'size-2 rounded-full',
                                                        HUES[item.color].dot,
                                                    )}
                                                />
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Property>

                            <Property icon={<Flag />} label="Priority">
                                <Select
                                    name="priority"
                                    value={priority}
                                    onValueChange={(value) =>
                                        setPriority(value as Priority)
                                    }
                                    disabled={!canManage}
                                >
                                    <SelectTrigger className="w-full border-none shadow-none hover:bg-accent dark:bg-transparent">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORITY_NAMES.map((key) => (
                                            <SelectItem key={key} value={key}>
                                                <Flag
                                                    className={
                                                        PRIORITIES[key].flag
                                                    }
                                                />
                                                {PRIORITIES[key].label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Property>

                            <Property icon={<CalendarDays />} label="Due date">
                                <input
                                    type="hidden"
                                    name="due_on"
                                    value={dueOn ?? ''}
                                />
                                <div className="flex items-center">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                disabled={!canManage}
                                                className={cn(
                                                    'min-w-0 flex-1 justify-start px-3 font-normal',
                                                    !dueOn &&
                                                        'text-muted-foreground',
                                                    state === 'overdue' &&
                                                        'text-red-600 dark:text-red-400',
                                                    state === 'today' &&
                                                        'text-amber-600 dark:text-amber-400',
                                                )}
                                            >
                                                {dueOn ? (
                                                    // Short on a phone, so the row fits beside the remove button.
                                                    <span className="truncate">
                                                        <span className="sm:hidden">
                                                            {format(
                                                                parseISO(dueOn),
                                                                'EEE d MMM yyyy',
                                                            )}
                                                        </span>
                                                        <span className="max-sm:hidden">
                                                            {format(
                                                                parseISO(dueOn),
                                                                'EEEE, d MMM yyyy',
                                                            )}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    'Add a due date'
                                                )}
                                                {state === 'today' && (
                                                    <span className="ml-auto rounded bg-amber-500/15 px-1.5 text-xs font-medium">
                                                        Today
                                                    </span>
                                                )}
                                                {state === 'overdue' && (
                                                    <span className="ml-auto rounded bg-red-500/10 px-1.5 text-xs font-medium">
                                                        Overdue
                                                    </span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                today={parseISO(today)}
                                                selected={
                                                    dueOn
                                                        ? parseISO(dueOn)
                                                        : undefined
                                                }
                                                defaultMonth={
                                                    dueOn
                                                        ? parseISO(dueOn)
                                                        : undefined
                                                }
                                                onSelect={(date) =>
                                                    setDueOn(
                                                        date
                                                            ? format(
                                                                  date,
                                                                  'yyyy-MM-dd',
                                                              )
                                                            : null,
                                                    )
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {dueOn && canManage && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Remove the due date"
                                            onClick={() => setDueOn(null)}
                                        >
                                            <X />
                                        </Button>
                                    )}
                                </div>
                                <InputError message={errors.due_on} />
                            </Property>

                            <Property
                                icon={<UserRoundCheck />}
                                label="Assignee"
                            >
                                <AssigneeField
                                    members={members}
                                    value={task.assigneeId}
                                    openCounts={openCounts}
                                    disabled={!canManage}
                                    onChange={assign}
                                />
                                <InputError message={errors.assignee_id} />
                            </Property>

                            <Property icon={<Tag />} label="Labels">
                                <LabelField
                                    teamSlug={teamSlug}
                                    task={task}
                                    disabled={!canManage}
                                />
                            </Property>

                            <Property icon={<User />} label="Created by">
                                <span className="flex items-center gap-2 px-3 text-sm">
                                    <CreatorAvatar name={task.creatorName} />
                                    <span className="truncate">
                                        {task.creatorName ?? 'Removed user'}
                                    </span>
                                    {task.createdAt && (
                                        <span className="shrink-0 text-muted-foreground">
                                            ·{' '}
                                            {format(
                                                new Date(task.createdAt),
                                                'd MMM',
                                            )}
                                        </span>
                                    )}
                                </span>
                            </Property>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="task-description"
                                className="flex items-center gap-2 text-sm font-medium"
                            >
                                <AlignLeft className="size-4 text-muted-foreground" />
                                Description
                            </label>
                            <Textarea
                                id="task-description"
                                name="description"
                                defaultValue={task.description ?? ''}
                                placeholder={
                                    canManage
                                        ? 'Add more detail'
                                        : 'No description'
                                }
                                maxLength={10000}
                                readOnly={!canManage}
                                className="min-h-36"
                            />
                            <InputError message={errors.description} />
                        </div>

                        <TaskActivity
                            teamSlug={teamSlug}
                            taskId={task.id}
                            members={members}
                        />
                    </div>

                    <SheetFooter className="flex-row justify-between border-t">
                        {canManage ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setDeleting(true)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 /> Delete
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                {canManage ? 'Cancel' : 'Close'}
                            </Button>
                            {canManage && (
                                <Button type="submit" disabled={processing}>
                                    Save changes
                                </Button>
                            )}
                        </div>
                    </SheetFooter>

                    <AlertDialog open={deleting} onOpenChange={setDeleting}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Delete this task?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    “{task.title}” is deleted for everyone in
                                    the team. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    variant="destructive"
                                    onClick={() =>
                                        router.visit(destroy(parameters), {
                                            preserveScroll: true,
                                            preserveState: true,
                                            onSuccess: onClose,
                                        })
                                    }
                                >
                                    Delete task
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </Form>
    );
}

function Property({
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[7rem_1fr] items-center gap-3 px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4">
                {icon}
                {label}
            </span>
            <div className="min-w-0">{children}</div>
        </div>
    );
}
