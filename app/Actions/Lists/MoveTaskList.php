<?php

namespace App\Actions\Lists;

use App\Models\TaskList;
use App\Support\Positions;
use Illuminate\Support\Facades\DB;

class MoveTaskList
{
    /**
     * Move the list to the given 0-based index and rewrite the positions of
     * the project's lists so they stay dense (0, 1, 2, ...).
     */
    public function handle(TaskList $list, int $index): void
    {
        DB::transaction(function () use ($list, $index) {
            $lists = TaskList::query()
                ->where('project_id', $list->project_id)
                ->orderBy('position')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $moving = $lists->firstOrFail(fn (TaskList $item) => $item->is($list));
            $others = $lists->reject(fn (TaskList $item) => $item->is($list))->values();
            $index = max(0, min($index, $others->count()));

            $others->splice($index, 0, [$moving]);

            Positions::rewrite($others);
        });
    }
}
