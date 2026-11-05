<?php

namespace App\Actions\Tasks;

use App\Models\Task;
use App\Models\TaskList;
use App\Support\Positions;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class MoveTask
{
    /**
     * Move the task to the given 0-based index of the target list, which may
     * be its own list, and keep the positions of both lists dense.
     */
    public function handle(Task $task, TaskList $target, int $index): void
    {
        DB::transaction(function () use ($task, $target, $index) {
            $source = $task->task_list_id;

            $others = $this->tasksIn($target->id)->reject(fn (Task $item) => $item->is($task))->values();
            $index = max(0, min($index, $others->count()));

            $task->task_list_id = $target->id;
            $others->splice($index, 0, [$task]);
            Positions::rewrite($others);

            if ($source !== $target->id) {
                Positions::rewrite($this->tasksIn($source));
            }
        });
    }

    /**
     * The tasks of a list in column order, locked for the move.
     *
     * @return Collection<int, Task>
     */
    private function tasksIn(int $listId): Collection
    {
        return Task::query()
            ->where('task_list_id', $listId)
            ->orderBy('position')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();
    }
}
