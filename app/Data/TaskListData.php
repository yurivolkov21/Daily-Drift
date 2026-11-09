<?php

namespace App\Data;

use App\Models\Task;
use App\Models\TaskList;

readonly class TaskListData
{
    /**
     * @param  array<int, TaskData>|null  $tasks  Null when the tasks were not loaded.
     * @param  int|null  $taskCount  Null when the tasks were not counted.
     */
    public function __construct(
        public int $id,
        public string $name,
        public string $color,
        public int $position,
        public ?array $tasks,
        public ?int $taskCount = null,
    ) {
        //
    }

    /**
     * Build the data for a list, with its tasks when they are loaded.
     */
    public static function from(TaskList $list): self
    {
        return new self(
            id: $list->id,
            name: $list->name,
            color: $list->color->value,
            position: $list->position,
            tasks: $list->relationLoaded('tasks')
                ? $list->tasks->map(fn (Task $task) => TaskData::from($task))->values()->all()
                : null,
            taskCount: $list->getAttribute('tasks_count') !== null ? (int) $list->getAttribute('tasks_count') : null,
        );
    }
}
