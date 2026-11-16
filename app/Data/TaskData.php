<?php

namespace App\Data;

use App\Models\Attachment;
use App\Models\ChecklistItem;
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
        /** @var array{unit: string, every: int, anchorOn: string|null}|null */
        public ?array $repeat,
        public ?string $completedAt,
        public int $position,
        public ?string $creatorName,
        public ?int $assigneeId,
        public ?string $assigneeName,
        public int $commentCount,
        /** @var array<int, int> */
        public array $labelIds,
        /** @var array<int, array{id: int, body: string, checked: bool}> */
        public array $checklist,
        /** @var array<int, array{id: int, name: string, mimeType: string, size: int, isImage: bool, uploaderId: int|null, uploaderName: string|null, createdAt: string|null}> */
        public array $attachments,
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
            repeat: $task->repeatRule() === null ? null : [
                ...$task->repeatRule()->toArray(),
                'anchorOn' => $task->repeat_anchor?->toDateString(),
            ],
            completedAt: $task->completed_at?->toISOString(),
            position: $task->position,
            creatorName: $task->creator?->name,
            assigneeId: $task->assignee_id,
            assigneeName: $task->assignee?->name,
            commentCount: (int) ($task->getAttribute('comments_count') ?? 0),
            labelIds: $task->relationLoaded('labels') ? $task->labels->pluck('id')->map(intval(...))->all() : [],
            checklist: $task->relationLoaded('checklistItems')
                ? $task->checklistItems->map(fn (ChecklistItem $item) => [
                    'id' => $item->id,
                    'body' => $item->body,
                    'checked' => $item->isChecked(),
                ])->values()->all()
                : [],
            attachments: $task->relationLoaded('attachments')
                ? $task->attachments->map(fn (Attachment $file) => [
                    'id' => $file->id,
                    'name' => $file->name,
                    'mimeType' => $file->mime_type,
                    'size' => $file->size,
                    'isImage' => $file->isImage(),
                    'uploaderId' => $file->user_id,
                    'uploaderName' => $file->uploader?->name,
                    'createdAt' => $file->created_at?->toISOString(),
                ])->values()->all()
                : [],
            createdAt: $task->created_at?->toISOString(),
            updatedAt: $task->updated_at?->toISOString(),
        );
    }
}
