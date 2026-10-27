<?php

namespace App\Models;

use App\Enums\IssueActivityType;
use Database\Factories\IssueActivityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $issue_id
 * @property int|null $user_id
 * @property IssueActivityType $type
 * @property array<string, mixed>|null $properties
 * @property Carbon|null $created_at
 * @property-read Issue $issue
 * @property-read User|null $actor
 */
#[Fillable(['type', 'properties'])]
class IssueActivity extends Model
{
    /** @use HasFactory<IssueActivityFactory> */
    use HasFactory, HasUlids;

    /**
     * Activities are never edited, so they only keep a creation time.
     */
    public const UPDATED_AT = null;

    /**
     * Get the issue the activity belongs to.
     *
     * @return BelongsTo<Issue, $this>
     */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    /**
     * Get the user who made the change.
     *
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => IssueActivityType::class,
            'properties' => 'array',
        ];
    }
}
