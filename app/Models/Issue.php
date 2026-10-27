<?php

namespace App\Models;

use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
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
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read string $identifier
 * @property-read Project $project
 * @property-read User|null $assignee
 * @property-read User|null $creator
 * @property-read Collection<int, Label> $labels
 */
#[Fillable(['title', 'description', 'status', 'priority', 'assignee_id', 'due_date'])]
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
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Issue $issue) {
            $issue->number ??= $issue->project->reserveIssueNumber();
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
        ];
    }
}
