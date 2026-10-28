<?php

namespace App\Http\Resources;

use App\Models\IssueLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IssueLink
 */
class IssueLinkResource extends JsonResource
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
            'repository' => $this->repository,
            'externalId' => $this->external_id,
            'title' => $this->title,
            'url' => $this->url,
            'state' => $this->state?->value,
            'author' => $this->author,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
