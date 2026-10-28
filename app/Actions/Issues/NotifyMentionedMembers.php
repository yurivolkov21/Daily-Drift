<?php

namespace App\Actions\Issues;

use App\Models\Comment;
use App\Models\User;
use App\Notifications\MentionedInComment;
use Illuminate\Support\Facades\Notification;

class NotifyMentionedMembers
{
    /**
     * Notify the team members a comment mentions, other than its author.
     *
     * @param  array<int, int>  $alreadyNotified  People an earlier version of the comment mentioned, who heard about it then.
     */
    public function handle(Comment $comment, User $author, array $alreadyNotified = []): void
    {
        $mentionedIds = array_diff($comment->mentionedUserIds(), $alreadyNotified, [$author->id]);

        if ($mentionedIds === []) {
            return;
        }

        $members = $comment->issue->project->team->members()->whereKey($mentionedIds)->get();

        Notification::send($members, new MentionedInComment($comment, $author));
    }
}
