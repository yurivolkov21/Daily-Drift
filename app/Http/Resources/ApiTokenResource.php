<?php

namespace App\Http\Resources;

use App\Models\PersonalAccessToken;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An API token as the settings page lists it. The token itself is never
 * sent again after it is created.
 *
 * @mixin PersonalAccessToken
 */
class ApiTokenResource extends JsonResource
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
            'name' => $this->name,
            'team' => [
                'id' => $this->team->id,
                'name' => $this->team->name,
            ],
            'abilities' => $this->abilities ?? [],
            'lastUsedAt' => $this->last_used_at?->toISOString(),
            'expiresAt' => $this->expires_at?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
