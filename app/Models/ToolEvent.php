<?php

namespace App\Models;

use Database\Factories\ToolEventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Something a coding tool reported through the API, such as Claude Code or
 * Codex starting a session, or a git hook seeing a branch switch.
 *
 * @property string $id
 * @property int $team_id
 * @property int|null $user_id
 * @property string|null $issue_id
 * @property string $tool
 * @property string $event
 * @property string|null $branch
 * @property Carbon|null $created_at
 * @property-read Team $team
 * @property-read User|null $user
 * @property-read Issue|null $issue
 */
#[Fillable(['tool', 'event', 'branch'])]
class ToolEvent extends Model
{
    /** @use HasFactory<ToolEventFactory> */
    use HasFactory, HasUlids;

    /**
     * Events are never edited, so they only keep a creation time.
     */
    public const UPDATED_AT = null;

    /**
     * Get the team the event was reported to.
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Get the person whose token reported the event.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the issue the event's branch names, if any.
     *
     * @return BelongsTo<Issue, $this>
     */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }
}
