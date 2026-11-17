<?php

namespace App\Observers;

use App\Models\Activity;
use App\Models\Attachment;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\User;
use App\Notifications\TaskAssigned;

/**
 * Writes the event log (spec 0005) as tasks change: one event per changed
 * field, and nothing for a reorder inside a list or a save that changes
 * nothing. A new assignee is also notified (spec 0006).
 */
class TaskObserver
{
    public function created(Task $task): void
    {
        Activity::record($task, Activity::TASK_CREATED, [
            'title' => $task->title,
            'list' => $this->listName($task->task_list_id),
            // The next occurrence of a recurring task (spec 0010).
            ...($task->repeated_from_id === null ? [] : ['repeated_from' => $task->repeated_from_id]),
            // A task added from an AI draft (spec 0011).
            ...($task->drafted ? ['drafted' => true] : []),
        ], $task->creator ?? null);
    }

    public function updated(Task $task): void
    {
        if ($task->wasChanged('title')) {
            Activity::record($task, Activity::TASK_RENAMED, ['from' => $task->getOriginal('title'), 'to' => $task->title]);
        }

        if ($task->wasChanged('description')) {
            Activity::record($task, Activity::TASK_DESCRIBED);
        }

        // Completing or reopening moves the task to or from the Done list
        // (spec 0010); that move is part of the one completion event below.
        if ($task->wasChanged('task_list_id') && ! $task->wasChanged('completed_at')) {
            Activity::record($task, Activity::TASK_MOVED, [
                'from' => $this->listName($task->getOriginal('task_list_id')),
                'to' => $this->listName($task->task_list_id),
            ]);
        }

        if ($task->wasChanged('assignee_id')) {
            $this->assignment($task);
        }

        if ($task->wasChanged('priority')) {
            Activity::record($task, Activity::TASK_PRIORITY_CHANGED, [
                'from' => $this->scalar($task->getOriginal('priority')),
                'to' => $task->priority->value,
            ]);
        }

        if ($task->wasChanged('due_on')) {
            Activity::record($task, Activity::TASK_DUE_CHANGED, [
                'from' => $this->date($task->getOriginal('due_on')),
                'to' => $task->due_on?->toDateString(),
            ]);
        }

        // Completing stops a recurring task repeating, and reopening may
        // start it again; that is part of the completion event.
        if (($task->wasChanged('repeat_unit') || $task->wasChanged('repeat_every')) && ! $task->wasChanged('completed_at')) {
            Activity::record($task, Activity::TASK_REPEAT_CHANGED, [
                'from' => $this->rule($task->getOriginal('repeat_unit'), $task->getOriginal('repeat_every')),
                'to' => $this->rule($task->repeat_unit, $task->repeat_every),
            ]);
        }

        if ($task->wasChanged('completed_at')) {
            $this->completion($task);
        }
    }

    /**
     * The event outlives the task: it keeps the title and loses the link.
     */
    public function deleted(Task $task): void
    {
        Activity::record($task, Activity::TASK_DELETED, ['title' => $task->title], keepTask: false);

        // The database deletes the rows; the files leave the disk too (spec 0010).
        Attachment::deleteDirectoryLater(Attachment::directoryFor($task));
    }

    /**
     * One event for completing or reopening, with the list the task left or
     * returned to when it moved (spec 0010).
     */
    private function completion(Task $task): void
    {
        $moved = $task->wasChanged('task_list_id');

        if ($task->completed_at === null) {
            Activity::record($task, Activity::TASK_REOPENED, $moved ? ['to' => $this->listName($task->task_list_id)] : []);

            return;
        }

        Activity::record($task, Activity::TASK_COMPLETED, $moved ? ['from' => $this->listName($task->getOriginal('task_list_id'))] : []);
    }

    private function assignment(Task $task): void
    {
        $previous = $task->getOriginal('assignee_id');

        if ($task->assignee_id === null) {
            Activity::record($task, Activity::TASK_UNASSIGNED, [
                'id' => $previous,
                'name' => User::query()->whereKey($previous)->value('name'),
            ]);

            return;
        }

        $assignee = User::query()->find($task->assignee_id);

        Activity::record($task, Activity::TASK_ASSIGNED, [
            'id' => $task->assignee_id,
            'name' => $assignee?->name,
        ]);

        // Spec 0006: tell the assignee, unless they assigned it to themselves.
        $actor = auth()->user();

        if ($assignee && $actor instanceof User && $actor->isNot($assignee)) {
            $assignee->notify(new TaskAssigned($task, $actor));
        }
    }

    /**
     * A repeat rule as the history keeps it, or null for none.
     *
     * @return array{unit: string, every: int}|null
     */
    private function rule(mixed $unit, mixed $every): ?array
    {
        $unit = $this->scalar($unit);

        return is_string($unit) ? ['unit' => $unit, 'every' => (int) $every] : null;
    }

    private function listName(mixed $id): ?string
    {
        return TaskList::query()->whereKey($id)->value('name');
    }

    private function scalar(mixed $value): mixed
    {
        return $value instanceof \BackedEnum ? $value->value : $value;
    }

    private function date(mixed $value): ?string
    {
        return $value === null ? null : substr((string) ($value instanceof \DateTimeInterface ? $value->format('Y-m-d') : $value), 0, 10);
    }
}
