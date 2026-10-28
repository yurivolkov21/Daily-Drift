<?php

namespace App\Models;

use App\Enums\IssueLinkType;
use App\Enums\PullRequestState;
use Database\Factories\IssueLinkFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A pull request or a commit on GitHub that names the issue.
 *
 * @property string $id
 * @property string $issue_id
 * @property IssueLinkType $type
 * @property string $repository
 * @property string $external_id The pull request's number or the commit's SHA.
 * @property string $title
 * @property string $url
 * @property PullRequestState|null $state
 * @property bool $closes Whether the pull request's branch or title names the issue, so merging it finishes the issue.
 * @property string|null $author
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Issue $issue
 */
#[Fillable(['type', 'repository', 'external_id', 'title', 'url', 'state', 'closes', 'author'])]
class IssueLink extends Model
{
    /** @use HasFactory<IssueLinkFactory> */
    use HasFactory, HasUlids;

    /**
     * Get the issue the link belongs to.
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
            'type' => IssueLinkType::class,
            'state' => PullRequestState::class,
            'closes' => 'boolean',
        ];
    }
}
