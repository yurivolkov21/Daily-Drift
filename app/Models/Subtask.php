<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\SubtaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $issue_id
 * @property string $title
 * @property CarbonInterface|null $completed_at
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Issue $issue
 */
#[Fillable(['title', 'completed_at', 'position'])]
class Subtask extends Model
{
    /** @use HasFactory<SubtaskFactory> */
    use HasFactory, HasUlids;

    /**
     * Get the issue the sub-task belongs to.
     *
     * @return BelongsTo<Issue, $this>
     */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
            'position' => 'integer',
        ];
    }
}
