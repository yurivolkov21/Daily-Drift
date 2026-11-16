<?php

namespace App\Policies;

use App\Enums\TeamRole;
use App\Models\Attachment;
use App\Models\Task;
use App\Models\User;

/**
 * Files on tasks (spec 0010): every member of the team sees and downloads
 * them, and attaches files while the project is active. People delete the
 * files they attached; owners and admins delete anyone's.
 */
class AttachmentPolicy
{
    public function create(User $user, Task $task): bool
    {
        return ! $task->project->isArchived() && $user->belongsToTeam($task->project->team);
    }

    public function view(User $user, Attachment $attachment): bool
    {
        return $user->belongsToTeam($attachment->task->project->team);
    }

    public function delete(User $user, Attachment $attachment): bool
    {
        if (! $this->create($user, $attachment->task)) {
            return false;
        }

        return $attachment->user_id === $user->id
            || $user->teamRole($attachment->task->project->team)?->isAtLeast(TeamRole::Admin) === true;
    }
}
