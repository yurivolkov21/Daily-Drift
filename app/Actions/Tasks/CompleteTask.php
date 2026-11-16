<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use App\Models\TaskList;
use App\Models\User;
use App\Support\LocalTime;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Completing moves a task to its project's Done list, and reopening moves it
 * back (spec 0010). The checkbox and the Done list always agree. Completing a
 * recurring task also creates its next occurrence.
 */
class CompleteTask
{
    /**
     * Saved with completing, so the completed occurrence stops repeating
     * without a separate history event.
     */
    private const array STOP_REPEATING = ['repeat_unit' => null, 'repeat_every' => null, 'repeat_anchor' => null];

    public function __construct(
        private readonly MoveTask $moveTask,
        private readonly RepeatTask $repeatTask,
    ) {
        //
    }

    /**
     * Complete or reopen the task.
     *
     * Without a place, completing puts the task at the top of the Done list
     * and reopening at the bottom of the list it came from. A move on the
     * board gives the list and index where the card was dropped instead.
     * "Today", for a next occurrence's due date, is the day of the person
     * completing the task (spec 0003).
     */
    public function handle(Task $task, bool $completed, ?TaskList $list = null, ?int $index = null, ?string $today = null): void
    {
        if ($completed === $task->isCompleted()) {
            if ($list !== null) {
                $this->moveTask->handle($task, $list, $index ?? PHP_INT_MAX);
            }

            return;
        }

        DB::transaction(function () use ($task, $completed, $list, $index, $today) {
            $completed
                ? $this->complete($task, $list, $index, CarbonImmutable::parse($today ?? LocalTime::today()))
                : $this->reopen($task, $list, $index);
        });
    }

    private function complete(Task $task, ?TaskList $list, ?int $index, CarbonImmutable $today): void
    {
        $done = $list ?? $task->project->doneList();
        $source = $task->list;
        $rule = $task->due_on === null ? null : $task->repeatRule();
        $due = $task->due_on === null ? null : CarbonImmutable::parse($task->due_on->toDateString());
        $anchor = $task->repeat_anchor === null ? $due : CarbonImmutable::parse($task->repeat_anchor->toDateString());
        $stop = $rule === null ? [] : self::STOP_REPEATING;

        if ($done === null) {
            // A project without a Done list: the task stays where it is.
            $task->update(['completed_at' => now(), ...$stop]);
        } else {
            $this->moveTask->handle($task, $done, $index ?? 0, [
                'completed_at' => now(),
                'completed_from_list_id' => $source->is($done) ? null : $source->id,
                ...$stop,
            ]);
        }

        if ($rule !== null && $due !== null && $anchor !== null) {
            $actor = auth()->user();

            $this->repeatTask->next(
                $task,
                $rule,
                $due,
                $anchor,
                $done !== null && $source->is($done) ? $this->listToReturnTo($task, $done) : $source,
                $today,
                $actor instanceof User ? $actor : null,
            );
        }
    }

    private function reopen(Task $task, ?TaskList $list, ?int $index): void
    {
        $done = $task->project->doneList();
        // An untouched next occurrence is taken back, and the task repeats again.
        $open = ['completed_at' => null, 'completed_from_list_id' => null, ...($this->repeatTask->takeBack($task) ?? [])];

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
