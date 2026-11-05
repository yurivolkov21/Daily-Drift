<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use App\Models\TaskList;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateTask
{
    /**
     * Add a task at the bottom of the list.
     */
    public function handle(TaskList $list, User $creator, string $title): Task
    {
        return DB::transaction(function () use ($list, $creator, $title) {
            $count = $list->tasks()->lockForUpdate()->count();

            $task = $list->tasks()->make(['title' => $title, 'position' => $count]);
            $task->project()->associate($list->project_id);
            $task->creator()->associate($creator);
            $task->save();

            return $task;
        });
    }
}
