<?php

namespace App\Actions\Lists;

use App\Models\TaskList;
use Illuminate\Support\Facades\DB;

class DeleteTaskList
{
    /**
     * Delete the list, with its tasks, and close the gap it leaves.
     */
    public function handle(TaskList $list): void
    {
        DB::transaction(function () use ($list) {
            $list->delete();

            Positions::rewrite(
                TaskList::query()
                    ->where('project_id', $list->project_id)
                    ->orderBy('position')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
            );
        });
    }
}
