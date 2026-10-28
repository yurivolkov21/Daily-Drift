<?php

namespace App\Models;

use Database\Factories\GithubWebhookFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Where a team's GitHub repositories send their events. Its id is part of
 * the payload URL, and GitHub signs every delivery with the secret.
 *
 * @property string $id
 * @property int $team_id
 * @property string $secret
 * @property Carbon|null $last_delivery_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 */
#[Fillable(['secret'])]
#[Hidden(['secret'])]
class GithubWebhook extends Model
{
    /** @use HasFactory<GithubWebhookFactory> */
    use HasFactory, HasUlids;

    /**
     * Make a new random secret for signing deliveries.
     */
    public static function generateSecret(): string
    {
        return Str::random(40);
    }

    /**
     * Get the team the webhook belongs to.
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Determine if a delivery was signed with this webhook's secret, as
     * GitHub does in the X-Hub-Signature-256 header.
     */
    public function hasValidSignature(string $payload, ?string $signature): bool
    {
        return $signature !== null
            && hash_equals('sha256='.hash_hmac('sha256', $payload, $this->secret), $signature);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'secret' => 'encrypted',
            'last_delivery_at' => 'datetime',
        ];
    }
}
