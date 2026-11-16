<?php

namespace App\Models;

use App\Enums\Hue;
use Database\Factories\TaskListFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A Kanban column. Named TaskList because "list" is a reserved word in PHP.
 *
 * @property int $id
 * @property int $project_id
 * @property string $name
 * @property Hue $color
 * @property int $position
 * @property bool $is_done
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Project $project
 * @property-read Collection<int, Task> $tasks
 */
#[Fillable(['name', 'color', 'position', 'is_done'])]
class TaskList extends Model
{
    /** @use HasFactory<TaskListFactory> */
    use HasFactory;

    /**
     * Changing a list counts as an update of its project.
     *
     * @var list<string>
     */
    protected $touches = ['project'];

    /**
     * The database deletes the list's tasks; their files leave the disk too
     * (spec 0010).
     */
    protected static function booted(): void
    {
        static::deleting(function (TaskList $list) {
            $project = $list->project;

            $list->tasks()->pluck('id')->each(fn (int $taskId) => Attachment::deleteDirectoryLater(
                Attachment::directory($project->team_id, $project->id, $taskId),
            ));
        });
    }

    /**
     * Get the project the list belongs to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the list's tasks, in column order.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class)->orderBy('position');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'color' => Hue::class,
            'position' => 'integer',
            'is_done' => 'boolean',
        ];
    }
}
