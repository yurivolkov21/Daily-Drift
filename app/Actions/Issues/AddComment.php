<?php

namespace App\Actions\Issues;

use App\Events\WorkspaceChanged;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;

class AddComment
{
    public function __construct(protected NotifyMentionedMembers $notifyMentionedMembers) {}

    /**
     * Add a comment to the issue and notify the members it mentions.
     */
    public function handle(User $author, Issue $issue, string $body): Comment
    {
        $comment = $issue->comments()->make(['body' => $body]);
        $comment->author()->associate($author);
        $comment->save();

        $this->notifyMentionedMembers->handle($comment, $author);

        broadcast(WorkspaceChanged::forIssue($issue, 'comment', 'created'))->toOthers();

        return $comment;
    }
}
