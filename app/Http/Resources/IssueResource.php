<?php

namespace App\Http\Resources;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Issue
 */
class IssueResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'identifier' => $this->identifier,
            'number' => $this->number,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status->value,
            'priority' => $this->priority->value,
            'dueDate' => $this->due_date?->toDateString(),
            'projectId' => $this->project_id,
            'assignee' => $this->whenLoaded('assignee', fn (User $assignee) => [
                'id' => $assignee->id,
                'name' => $assignee->name,
            ]),
            'creator' => $this->whenLoaded('creator', fn (User $creator) => [
                'id' => $creator->id,
                'name' => $creator->name,
            ]),
            'labelIds' => $this->whenLoaded('labels', fn () => $this->labels->modelKeys()),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
