<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One step of a task's checklist (spec 0010).
 *
 * @property int $id
 * @property int $task_id
 * @property string $body
 * @property int $position
 * @property Carbon|null $completed_at
 * @property int|null $completed_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Task $task
 * @property-read User|null $completer
 */
#[Fillable(['body', 'position'])]
class ChecklistItem extends Model
{
    /**
     * The most items a task's checklist holds.
     */
    public const int LIMIT = 50;

    /**
     * Changing an item counts as an update of its task.
     *
     * @var list<string>
     */
    protected $touches = ['task'];

    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Who checked the item.
     *
     * @return BelongsTo<User, $this>
     */
    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function isChecked(): bool
    {
        return $this->completed_at !== null;
    }

    /**
     * Check or uncheck the item, by the given person.
     */
    public function check(bool $checked, ?User $by): void
    {
        $this->forceFill([
            'completed_at' => $checked ? now() : null,
            'completed_by' => $checked ? $by?->id : null,
        ]);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'completed_at' => 'datetime',
        ];
    }
}
