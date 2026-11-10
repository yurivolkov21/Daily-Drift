<?php

namespace App\Policies;

use App\Enums\TeamRole;
use App\Models\Comment;
use App\Models\Task;
use App\Models\User;

/**
 * Comments (spec 0005): every member of the team can add one while the
 * project is active; authors edit and delete their own; owners and admins
 * can delete anyone's.
 */
class CommentPolicy
{
    public function create(User $user, Task $task): bool
    {
        return ! $task->project->isArchived() && $user->belongsToTeam($task->project->team);
    }

    public function update(User $user, Comment $comment): bool
    {
        return $this->create($user, $comment->task) && $comment->user_id === $user->id;
    }

    public function delete(User $user, Comment $comment): bool
    {
        if (! $this->create($user, $comment->task)) {
            return false;
        }

        return $comment->user_id === $user->id
            || $user->teamRole($comment->task->project->team)?->isAtLeast(TeamRole::Admin) === true;
    }
}
