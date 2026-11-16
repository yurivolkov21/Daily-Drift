<?php

namespace App\Actions\Lists;

use App\Models\TaskList;
use Illuminate\Support\Facades\DB;

class MarkDoneList
{
    /**
     * Make the list its project's Done list, or stop it being one. A project
     * has at most one, so marking a list moves the mark (spec 0010). Tasks
     * stay where they are; the rule applies from their next change.
     */
    public function handle(TaskList $list, bool $done): void
    {
        DB::transaction(function () use ($list, $done) {
            if ($done) {
                // Clear the old mark first: the unique index allows one.
                TaskList::query()
                    ->where('project_id', $list->project_id)
                    ->whereKeyNot($list->getKey())
                    ->where('is_done', true)
                    ->update(['is_done' => false]);
            }

            $list->update(['is_done' => $done]);
        });
    }
}
