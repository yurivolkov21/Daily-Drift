<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use App\Models\TaskList;
use Illuminate\Support\Facades\DB;

/**
 * Completing moves a task to its project's Done list, and reopening moves it
 * back (spec 0010). The checkbox and the Done list always agree.
 */
class CompleteTask
{
    public function __construct(private readonly MoveTask $moveTask)
    {
        //
    }

    /**
     * Complete or reopen the task.
     *
     * Without a place, completing puts the task at the top of the Done list
     * and reopening at the bottom of the list it came from. A move on the
     * board gives the list and index where the card was dropped instead.
     */
    public function handle(Task $task, bool $completed, ?TaskList $list = null, ?int $index = null): void
    {
        if ($completed === $task->isCompleted()) {
            if ($list !== null) {
                $this->moveTask->handle($task, $list, $index ?? PHP_INT_MAX);
            }

            return;
        }

        DB::transaction(function () use ($task, $completed, $list, $index) {
            $completed
                ? $this->complete($task, $list, $index)
                : $this->reopen($task, $list, $index);
        });
    }

    private function complete(Task $task, ?TaskList $list, ?int $index): void
    {
        $done = $list ?? $task->project->doneList();

        if ($done === null) {
            // A project without a Done list: the task stays where it is.
            $task->update(['completed_at' => now()]);

            return;
        }

        $this->moveTask->handle($task, $done, $index ?? 0, [
            'completed_at' => now(),
            'completed_from_list_id' => $task->task_list_id === $done->id ? null : $task->task_list_id,
        ]);
    }

    private function reopen(Task $task, ?TaskList $list, ?int $index): void
    {
        $done = $task->project->doneList();
        $open = ['completed_at' => null, 'completed_from_list_id' => null];

        if ($list === null && ($done === null || $task->task_list_id !== $done->id)) {
            // Not in the Done list: it opens where it is.
            $task->update($open);

            return;
        }

        $target = $list ?? $this->listToReturnTo($task, $done);

        $this->moveTask->handle($task, $target, $index ?? PHP_INT_MAX, $open);
    }

    /**
     * The list the task left when it was completed, or else the project's
     * first list that is not the Done list (or Done itself if it is alone).
     */
    private function listToReturnTo(Task $task, ?TaskList $done): TaskList
    {
        $lists = $task->project->lists()->get();

        return $lists->first(fn (TaskList $list) => $list->id === $task->completed_from_list_id && ! $list->is($done))
            ?? $lists->first(fn (TaskList $list) => ! $list->is($done))
            ?? $task->list;
    }
}
