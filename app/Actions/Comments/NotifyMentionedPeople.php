<?php

namespace App\Actions\Comments;

use App\Models\Comment;
use App\Models\User;
use App\Notifications\MentionedInComment;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;

class NotifyMentionedPeople
{
    /**
     * Notify the people a comment mentions (spec 0006): never its author, and
     * after an edit only the people it newly mentions. Anyone already
     * notified about this comment is not notified again.
     *
     * @param  array<int, int>  $before  the mentions before an edit
     */
    public function handle(Comment $comment, User $author, array $before = []): void
    {
        $ids = array_values(array_diff($comment->mentions, $before, [$author->id]));

        if ($ids === []) {
            return;
        }

        $teamId = $comment->task->project->team_id;
        $notified = DatabaseNotification::query()
            ->where('type', MentionedInComment::class)
            ->where('team_id', $teamId)
            ->where('data->comment->id', $comment->id)
            ->whereIn('notifiable_id', $ids)
            ->pluck('notifiable_id')
            ->all();

        $recipients = User::query()
            ->whereKey(array_diff($ids, $notified))
            // Only people who are still in the team (validation checks this too).
            ->whereHas('teams', fn ($query) => $query->whereKey($teamId))
            ->get();

        Notification::send($recipients, new MentionedInComment($comment, $author));
    }
}
