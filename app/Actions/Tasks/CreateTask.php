<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use App\Models\TaskList;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateTask
{
    /**
     * Add a task at the bottom of the list, with a due date when one is given.
     *
     * @param  array{description?: string|null, priority?: string}  $attributes  More fields, such as those of a drafted task.
     * @param  bool  $drafted  Whether the task comes from an AI draft (spec 0011), which its history notes.
     */
    public function handle(TaskList $list, User $creator, string $title, ?string $dueOn = null, array $attributes = [], bool $drafted = false): Task
    {
        return DB::transaction(function () use ($list, $creator, $title, $dueOn, $attributes, $drafted) {
            $count = $list->tasks()->lockForUpdate()->count();

            $task = $list->tasks()->make([...$attributes, 'title' => $title, 'position' => $count, 'due_on' => $dueOn]);
            $task->project()->associate($list->project_id);
            $task->creator()->associate($creator);
            $task->drafted = $drafted;
            $task->save();

            return $task;
        });
    }
}
