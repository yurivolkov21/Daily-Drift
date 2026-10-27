<?php

namespace App\Models;

use App\Enums\IssueStatus;
use App\Enums\ProjectStatus;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @property string $id
 * @property int $team_id
 * @property string $name
 * @property string $key
 * @property string|null $description
 * @property string $icon
 * @property string $color
 * @property ProjectStatus $status
 * @property int|null $lead_id
 * @property Carbon|null $target_date
 * @property int $last_issue_number
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User|null $lead
 * @property-read Collection<int, Issue> $issues
 * @property-read Collection<int, Issue> $openIssues
 * @property-read Collection<int, Issue> $completedIssues
 * @property-read Collection<int, Issue> $canceledIssues
 */
#[Fillable(['name', 'key', 'description', 'icon', 'color', 'status', 'lead_id', 'target_date'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory, HasUlids;

    /**
     * Get the team that owns the project.
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Get the member who leads the project.
     *
     * @return BelongsTo<User, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_id');
    }

    /**
     * Get all issues in this project.
     *
     * @return HasMany<Issue, $this>
     */
    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class);
    }

    /**
     * Get the issues in this project that are not done or canceled.
     *
     * @return HasMany<Issue, $this>
     */
    public function openIssues(): HasMany
    {
        return $this->issues()->whereNotIn('status', IssueStatus::closed());
    }

    /**
     * Get the issues in this project that are done.
     *
     * @return HasMany<Issue, $this>
     */
    public function completedIssues(): HasMany
    {
        return $this->issues()->where('status', IssueStatus::Done);
    }

    /**
     * Get the issues in this project that were canceled.
     *
     * @return HasMany<Issue, $this>
     */
    public function canceledIssues(): HasMany
    {
        return $this->issues()->where('status', IssueStatus::Canceled);
    }

    /**
     * Reserve the next issue number in this project.
     *
     * The increment runs first so the row stays locked until the surrounding
     * transaction commits, keeping numbers unique under concurrent creates.
     */
    public function reserveIssueNumber(): int
    {
        return DB::transaction(function (): int {
            static::query()->whereKey($this->getKey())->increment('last_issue_number');

            return (int) static::query()->whereKey($this->getKey())->value('last_issue_number');
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ProjectStatus::class,
            'target_date' => 'date',
        ];
    }
}
