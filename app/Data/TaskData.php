<?php

namespace App\Data;

use App\Models\Task;

readonly class TaskData
{
    public function __construct(
        public int $id,
        public int $listId,
        public string $title,
        public ?string $description,
        public string $priority,
        public ?string $dueOn,
        public ?string $completedAt,
        public int $position,
        public ?string $creatorName,
        public ?int $assigneeId,
        public ?string $assigneeName,
        public int $commentCount,
        public ?string $createdAt,
        public ?string $updatedAt,
    ) {
        //
    }

    /**
     * Build the data for a task.
     */
    public static function from(Task $task): self
    {
        return new self(
            id: $task->id,
            listId: $task->task_list_id,
            title: $task->title,
            description: $task->description,
            priority: $task->priority->value,
            dueOn: $task->due_on?->toDateString(),
            completedAt: $task->completed_at?->toISOString(),
            position: $task->position,
            creatorName: $task->creator?->name,
            assigneeId: $task->assignee_id,
            assigneeName: $task->assignee?->name,
            commentCount: (int) ($task->getAttribute('comments_count') ?? 0),
            createdAt: $task->created_at?->toISOString(),
            updatedAt: $task->updated_at?->toISOString(),
        );
    }
}
