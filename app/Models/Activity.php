<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One thing that happened to a task (spec 0005). Rows are never edited.
 *
 * @property int $id
 * @property int $team_id
 * @property int $project_id
 * @property int|null $task_id
 * @property int|null $user_id
 * @property string $type
 * @property array<string, mixed> $properties
 * @property Carbon|null $created_at
 * @property-read Project $project
 * @property-read Task|null $task
 * @property-read User|null $user
 */
#[Fillable(['team_id', 'project_id', 'task_id', 'user_id', 'type', 'properties'])]
class Activity extends Model
{
    public const UPDATED_AT = null;

    public const string TASK_CREATED = 'task.created';

    public const string TASK_RENAMED = 'task.renamed';

    public const string TASK_DESCRIBED = 'task.described';

    public const string TASK_MOVED = 'task.moved';

    public const string TASK_ASSIGNED = 'task.assigned';

    public const string TASK_UNASSIGNED = 'task.unassigned';

    public const string TASK_PRIORITY_CHANGED = 'task.priority_changed';

    public const string TASK_DUE_CHANGED = 'task.due_changed';

    public const string TASK_COMPLETED = 'task.completed';

    public const string TASK_REOPENED = 'task.reopened';

    public const string TASK_DELETED = 'task.deleted';

    public const string COMMENT_ADDED = 'comment.added';

    /**
     * Record an event for a task. The actor is the signed-in person unless
     * given; pass `false` for a change nobody made (such as leaving a team).
     *
     * @param  array<string, mixed>  $properties
     */
    public static function record(Task $task, string $type, array $properties = [], User|false|null $actor = null, bool $keepTask = true): self
    {
        /** @var Project $project */
        $project = $task->project()->firstOrFail();

        return self::create([
            'team_id' => $project->team_id,
            'project_id' => $project->id,
            'task_id' => $keepTask ? $task->id : null,
            'user_id' => match (true) {
                $actor === false => null,
                $actor instanceof User => $actor->id,
                default => auth()->id(),
            },
            'type' => $type,
            'properties' => $properties,
        ]);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['properties' => 'array'];
    }
}
