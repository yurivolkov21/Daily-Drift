<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use App\Support\Positions;
use Illuminate\Support\Facades\DB;

class DeleteTask
{
    /**
     * Delete the task and close the gap it leaves in its list.
     */
    public function handle(Task $task): void
    {
        DB::transaction(function () use ($task) {
            $task->delete();

            Positions::rewrite(
                Task::query()
                    ->where('task_list_id', $task->task_list_id)
                    ->orderBy('position')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
            );
        });
    }
}
