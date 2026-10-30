<?php

namespace App\Models;

use App\Data\IssueFilters;
use App\Enums\DoneFilter;
use App\Enums\DueFilter;
use App\Enums\IssueActivityType;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use Carbon\CarbonInterface;
use Database\Factories\IssueFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property string $id
 * @property string $project_id
 * @property int $number
 * @property string $title
 * @property string|null $description
 * @property IssueStatus $status
 * @property IssuePriority $priority
 * @property int|null $assignee_id
 * @property int|null $creator_id
 * @property Carbon|null $due_date
 * @property float|null $board_position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read string $identifier
 * @property-read Project $project
 * @property-read User|null $assignee
 * @property-read User|null $creator
 * @property-read Collection<int, Label> $labels
 * @property-read Collection<int, Comment> $comments
 * @property-read Collection<int, IssueActivity> $activities
 * @property-read IssueActivity|null $completion
 * @property-read Collection<int, Subtask> $subtasks
 * @property-read Collection<int, IssueLink> $links
 */
#[Fillable(['title', 'description', 'status', 'priority', 'assignee_id', 'due_date', 'board_position'])]
class Issue extends Model
{
    /** @use HasFactory<IssueFactory> */
    use HasFactory, HasUlids;

    /**
     * The route pattern matching issue identifiers such as "DD-123".
     */
    public const string IDENTIFIER_PATTERN = '[A-Za-z][A-Za-z0-9]{1,4}-[0-9]+';

    /**
     * Bootstrap the model and its traits.
     *
     * A new issue takes the next number in its project and the top place on the team's board.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Issue $issue) {
            $issue->number ??= $issue->project->reserveIssueNumber();
            $issue->board_position ??= (float) ($issue->project->team->issues()->min('board_position') ?? 1) - 1;
        });
    }

    /**
     * Get the project the issue belongs to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the user assigned to the issue.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    /**
     * Get the user who created the issue.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    /**
     * Get the labels attached to the issue.
     *
     * @return BelongsToMany<Label, $this>
     */
    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class);
    }

    /**
     * Get the comments on the issue.
     *
     * @return HasMany<Comment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    /**
     * Get the recorded changes to the issue.
     *
     * @return HasMany<IssueActivity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(IssueActivity::class);
    }

    /**
     * Get the latest move of the issue to Done.
     *
     * @return HasOne<IssueActivity, $this>
     */
    public function completion(): HasOne
    {
        return $this->hasOne(IssueActivity::class)->ofMany(
            ['created_at' => 'max', 'id' => 'max'],
            fn (Builder $query) => $query
                ->where('type', IssueActivityType::StatusChanged)
                ->where('properties->to', IssueStatus::Done->value),
        );
    }

    /**
     * Get the sub-tasks that break the issue down.
     *
     * @return HasMany<Subtask, $this>
     */
    public function subtasks(): HasMany
    {
        return $this->hasMany(Subtask::class);
    }

    /**
     * Get the pull requests and commits on GitHub that name the issue.
     *
     * @return HasMany<IssueLink, $this>
     */
    public function links(): HasMany
    {
        return $this->hasMany(IssueLink::class);
    }

    /**
     * Record a change to the issue in its history.
     *
     * @param  array<string, mixed>|null  $properties
     */
    public function recordActivity(IssueActivityType $type, ?User $actor, ?array $properties = null): IssueActivity
    {
        $activity = $this->activities()->make([
            'type' => $type,
            'properties' => $properties,
        ]);

        $activity->actor()->associate($actor);
        $activity->save();

        return $activity;
    }

    /**
     * Get when the issue was done: its latest move to Done, or its creation
     * if it was created done. Null while the issue is not done.
     */
    public function completedAt(): ?CarbonInterface
    {
        if ($this->status !== IssueStatus::Done) {
            return null;
        }

        return $this->completion->created_at ?? $this->created_at;
    }

    /**
     * Scope the query to the issue with the given identifier, such as "DD-123".
     *
     * @param  Builder<Issue>  $query
     */
    #[Scope]
    protected function identifiedBy(Builder $query, string $identifier): void
    {
        $query
            ->where($query->qualifyColumn('number'), (int) Str::afterLast($identifier, '-'))
            ->whereRelation('project', 'key', Str::upper(Str::beforeLast($identifier, '-')));
    }

    /**
     * Scope the query to the issues that are neither done nor canceled.
     *
     * @param  Builder<Issue>  $query
     */
    #[Scope]
    protected function open(Builder $query): void
    {
        $query->whereNotIn($query->qualifyColumn('status'), IssueStatus::closed());
    }

    /**
     * Scope the query to the issues passing the filters of the issues page,
     * for the given reader.
     *
     * @param  Builder<Issue>  $query
     */
    #[Scope]
    protected function filteredBy(Builder $query, IssueFilters $filters, User $reader): void
    {
        $query
            ->when($filters->project, fn (Builder $query, Project $project) => $query->whereBelongsTo($project))
            ->when($filters->assignees !== [], fn (Builder $query) => $query
                ->assignedTo($filters->assigneeIds($reader), $filters->includesUnassigned()))
            ->when($filters->statuses !== [], fn (Builder $query) => $query
                ->whereIn($query->qualifyColumn('status'), $filters->statuses))
            ->when($filters->priorities !== [], fn (Builder $query) => $query
                ->whereIn($query->qualifyColumn('priority'), $filters->priorities))
            ->when($filters->labelIds !== [], fn (Builder $query) => $query
                ->whereHas('labels', fn (Builder $query) => $query->whereKey($filters->labelIds)))
            ->when($filters->due, fn (Builder $query, DueFilter $due) => $query->due($due))
            ->when($filters->done, fn (Builder $query, DoneFilter $done) => $query->doneSince($done->since()));
    }

    /**
     * Scope the query to the issues assigned to any of the given members,
     * and to no one when asked.
     *
     * @param  Builder<Issue>  $query
     * @param  array<int, int>  $userIds
     */
    #[Scope]
    protected function assignedTo(Builder $query, array $userIds, bool $orUnassigned = false): void
    {
        $column = $query->qualifyColumn('assignee_id');

        $query->where(fn (Builder $query) => $query
            ->when($userIds !== [], fn (Builder $query) => $query->whereIn($column, $userIds))
            ->when($orUnassigned, fn (Builder $query) => $query->orWhereNull($column)));
    }

    /**
     * Scope the query to the issues due as the filter says. Whether a date has
     * passed depends on the reader's day, so the open issues come with a day
     * to spare at each end and the browser settles it with the same rules as
     * the dashboard. Undated issues are undated whatever their status.
     *
     * @param  Builder<Issue>  $query
     */
    #[Scope]
    protected function due(Builder $query, DueFilter $filter): void
    {
        $column = $query->qualifyColumn('due_date');
        $today = today();

        match ($filter) {
            DueFilter::None => $query->whereNull($column),
            DueFilter::Overdue => $query->open()
                ->whereDate($column, '<=', $today),
            DueFilter::Today => $query->open()
                ->whereDate($column, '>=', $today->copy()->subDay())
                ->whereDate($column, '<=', $today->copy()->addDay()),
            DueFilter::Week => $query->open()
                ->whereDate($column, '>=', $today->copy()->subDay())
                ->whereDate($column, '<=', $today->copy()->addDay()->endOfWeek(CarbonInterface::SUNDAY)),
        };
    }

    /**
     * Scope the query to the issues done since the given time: moved to Done
     * since then, or created done since then and never moved.
     *
     * @param  Builder<Issue>  $query
     */
    #[Scope]
    protected function doneSince(Builder $query, CarbonInterface $since): void
    {
        $query
            ->where($query->qualifyColumn('status'), IssueStatus::Done)
            ->where(fn (Builder $query) => $query
                ->whereHas('completion', fn (Builder $query) => $query->where('created_at', '>=', $since))
                ->orWhere(fn (Builder $query) => $query
                    ->whereDoesntHave('completion')
                    ->where($query->qualifyColumn('created_at'), '>=', $since)));
    }

    /**
     * Get the human readable identifier of the issue, such as "DD-123".
     *
     * @return Attribute<non-falsy-string, never>
     */
    protected function identifier(): Attribute
    {
        return Attribute::get(fn (): string => $this->project->key.'-'.$this->number);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => IssueStatus::class,
            'priority' => IssuePriority::class,
            'due_date' => 'date',
            'board_position' => 'float',
        ];
    }
}
