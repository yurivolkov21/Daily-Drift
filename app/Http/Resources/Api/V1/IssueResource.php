<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Issue;
use App\Models\Label;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An issue as the API shows it. It is kept apart from the resource the app's
 * pages use, so the pages can change without breaking scripts.
 *
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
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status->value,
            'priority' => $this->priority->value,
            'project' => [
                'key' => $this->project->key,
                'name' => $this->project->name,
            ],
            'assignee' => $this->whenLoaded('assignee', fn (User $assignee) => [
                'id' => $assignee->id,
                'name' => $assignee->name,
            ]),
            'labels' => $this->whenLoaded('labels', fn () => $this->labels->map(fn (Label $label) => [
                'id' => $label->id,
                'name' => $label->name,
                'color' => $label->color,
            ])->all()),
            'due_date' => $this->due_date?->toDateString(),
            'url' => route('issues.show', ['current_team' => $this->project->team->slug, 'issue' => $this->identifier]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
