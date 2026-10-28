<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * An API token that acts as its owner on one of the owner's teams.
 *
 * @property int $id
 * @property string $tokenable_type
 * @property int $tokenable_id
 * @property int $team_id
 * @property string $name
 * @property string $token
 * @property array<int, string>|null $abilities
 * @property Carbon|null $last_used_at
 * @property Carbon|null $expires_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    /**
     * Get the team the token works on.
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Determine if the token's owner is still a member of the token's team.
     */
    public function ownerBelongsToTeam(): bool
    {
        return $this->tokenable instanceof User
            && $this->tokenable->teams()->whereKey($this->team_id)->exists();
    }
}
