<?php

namespace App\Actions\Tasks;

use App\Models\Activity;
use App\Models\Label;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

class SyncTaskLabels
{
    /**
     * Give the task exactly these labels, recording one event per label
     * added or removed with a copy of its name and icon (spec 0007).
     *
     * @param  array<int, int>  $labelIds
     */
    public function handle(Task $task, array $labelIds): void
    {
        DB::transaction(function () use ($task, $labelIds) {
            $before = $task->labels()->pluck('labels.id')->all();
            $added = array_values(array_diff($labelIds, $before));
            $removed = array_values(array_diff($before, $labelIds));

            if ($added === [] && $removed === []) {
                return;
            }

            $task->labels()->sync($labelIds);

            Label::query()->whereKey([...$added, ...$removed])->get()->each(function (Label $label) use ($task, $added) {
                Activity::record(
                    $task,
                    in_array($label->id, $added, true) ? Activity::TASK_LABELED : Activity::TASK_UNLABELED,
                    ['id' => $label->id, 'name' => $label->name, 'icon' => $label->icon],
                );
            });

            $task->touch();
        });
    }
}
