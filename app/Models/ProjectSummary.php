<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * The weekly summary Claude wrote for a project (spec 0011). A project has
 * at most one; writing a new one replaces it.
 *
 * @property int $id
 * @property int $project_id
 * @property int|null $user_id
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property array{headline: string, done: list<string>, risks: list<string>, next: list<string>} $content
 * @property string $model
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Project $project
 * @property-read User|null $user
 */
#[Fillable(['user_id', 'starts_on', 'ends_on', 'content', 'model'])]
class ProjectSummary extends Model
{
    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Who asked for the summary.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'content' => 'array',
        ];
    }
}
