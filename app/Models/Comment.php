<?php

namespace App\Models;

use Database\Factories\CommentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $issue_id
 * @property int|null $user_id
 * @property string $body
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Issue $issue
 * @property-read User|null $author
 */
#[Fillable(['body'])]
class Comment extends Model
{
    /** @use HasFactory<CommentFactory> */
    use HasFactory, HasUlids;

    /**
     * How a mention is written in a comment body, such as
     * "@[Ada Lovelace](user:12)": the name as it read when written, then the
     * user id, so a later rename does not break the link to the person.
     */
    public const string MENTION_PATTERN = '/@\[([^\]\n]+)\]\(user:(\d+)\)/';

    /**
     * Get the issue the comment belongs to.
     *
     * @return BelongsTo<Issue, $this>
     */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    /**
     * Get the user who wrote the comment.
     *
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the ids of the people the comment mentions.
     *
     * @return array<int, int>
     */
    public function mentionedUserIds(): array
    {
        preg_match_all(self::MENTION_PATTERN, $this->body, $matches);

        return array_values(array_unique(array_map(intval(...), $matches[2])));
    }

    /**
     * Get the body with each mention written as a plain "@Name".
     */
    public function plainBody(): string
    {
        return preg_replace(self::MENTION_PATTERN, '@$1', $this->body) ?? $this->body;
    }
}
