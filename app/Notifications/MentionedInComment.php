<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\User;

/**
 * Someone else mentioned you in a comment.
 */
class MentionedInComment extends TeamNotification
{
    public const string KIND = 'mentioned';

    private const int EXCERPT_LENGTH = 120;

    public function __construct(Comment $comment, User $actor)
    {
        parent::__construct($comment->task, $actor);

        $this->snapshot['comment'] = ['id' => $comment->id, 'excerpt' => self::excerpt($comment->body)];
    }

    /**
     * The comment's first line that has text, up to 120 characters.
     */
    public static function excerpt(string $body): string
    {
        $line = collect(preg_split('/\R/', $body) ?: [])->map(fn (string $line) => trim($line))->first(fn (string $line) => $line !== '', '');

        return str($line)->squish()->limit(self::EXCERPT_LENGTH)->toString();
    }
}
