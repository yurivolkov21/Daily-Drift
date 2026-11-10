<?php

namespace App\Observers;

use App\Models\Activity;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\User;

/**
 * Writes the event log (spec 0005) as tasks change: one event per changed
 * field, and nothing for a reorder inside a list or a save that changes
 * nothing.
 */
class TaskObserver
{
    public function created(Task $task): void
    {
        Activity::record($task, Activity::TASK_CREATED, [
            'title' => $task->title,
            'list' => $this->listName($task->task_list_id),
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

        if ($task->wasChanged('task_list_id')) {
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

        if ($task->wasChanged('completed_at')) {
            Activity::record($task, $task->completed_at === null ? Activity::TASK_REOPENED : Activity::TASK_COMPLETED);
        }
    }

    /**
     * The event outlives the task: it keeps the title and loses the link.
     */
    public function deleted(Task $task): void
    {
        Activity::record($task, Activity::TASK_DELETED, ['title' => $task->title], keepTask: false);
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

        Activity::record($task, Activity::TASK_ASSIGNED, [
            'id' => $task->assignee_id,
            'name' => User::query()->whereKey($task->assignee_id)->value('name'),
        ]);
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
