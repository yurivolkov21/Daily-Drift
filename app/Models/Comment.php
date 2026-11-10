<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A comment on a task (spec 0005): plain text with the ids of the team
 * members it mentions.
 *
 * @property int $id
 * @property int $task_id
 * @property int|null $user_id
 * @property string $body
 * @property array<int, int> $mentions
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Task $task
 * @property-read User|null $author
 */
#[Fillable(['body', 'mentions'])]
class Comment extends Model
{
    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function isEdited(): bool
    {
        return $this->updated_at !== null && $this->created_at !== null && $this->updated_at->gt($this->created_at);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['mentions' => 'array'];
    }
}
