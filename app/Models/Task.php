<?php

namespace App\Models;

use App\Enums\Priority;
use App\Observers\TaskObserver;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $project_id
 * @property int $task_list_id
 * @property int|null $created_by
 * @property int|null $assignee_id
 * @property string $title
 * @property string|null $description
 * @property Priority $priority
 * @property Carbon|null $due_on
 * @property Carbon|null $completed_at
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Project $project
 * @property-read TaskList $list
 * @property-read User|null $creator
 * @property-read User|null $assignee
 */
#[ObservedBy(TaskObserver::class)]
#[Fillable(['title', 'description', 'priority', 'due_on', 'completed_at', 'position', 'assignee_id'])]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    /**
     * Changing a task counts as an update of its project.
     *
     * @var list<string>
     */
    protected $touches = ['project'];

    /**
     * Get the project the task belongs to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the list (column) the task is in.
     *
     * @return BelongsTo<TaskList, $this>
     */
    public function list(): BelongsTo
    {
        return $this->belongsTo(TaskList::class, 'task_list_id');
    }

    /**
     * Get the user who created the task.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the team member the task is assigned to.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    /**
     * The team labels on the task, up to 5 (spec 0007).
     *
     * @return BelongsToMany<Label, $this>
     */
    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class)->orderBy('labels.name');
    }

    /**
     * Get the task's comments, oldest first.
     *
     * @return HasMany<Comment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->oldest()->orderBy('id');
    }

    /**
     * Get what happened to the task, oldest first.
     *
     * @return HasMany<Activity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class)->oldest()->orderBy('id');
    }

    /**
     * Determine whether the task is completed.
     */
    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'priority' => Priority::class,
            'due_on' => 'date',
            'completed_at' => 'datetime',
            'position' => 'integer',
        ];
    }
}
