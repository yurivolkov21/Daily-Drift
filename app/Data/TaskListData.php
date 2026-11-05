<?php

namespace App\Data;

use App\Models\TaskList;

readonly class TaskListData
{
    public function __construct(
        public int $id,
        public string $name,
        public string $color,
        public int $position,
    ) {
        //
    }

    /**
     * Build the data for a list.
     */
    public static function from(TaskList $list): self
    {
        return new self(
            id: $list->id,
            name: $list->name,
            color: $list->color->value,
            position: $list->position,
        );
    }
}
