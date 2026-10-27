<?php

namespace App\Http\Resources;

use App\Models\IssueActivity;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IssueActivity
 */
class IssueActivityResource extends JsonResource
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
            'type' => $this->type->value,
            'properties' => $this->properties,
            'actor' => $this->whenLoaded('actor', fn (User $actor) => [
                'id' => $actor->id,
                'name' => $actor->name,
            ]),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
