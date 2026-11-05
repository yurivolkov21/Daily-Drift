<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\TaskList;
use App\Models\User;

/**
 * Every member of the team works on tasks (spec 0001), as long as the
 * project is not archived.
 */
class TaskPolicy
{
    /**
     * Determine whether the user can add tasks to the list.
     */
    public function create(User $user, TaskList $list): bool
    {
        return ! $list->project->isArchived() && $user->belongsToTeam($list->project->team);
    }

    /**
     * Determine whether the user can edit, move or complete the task.
     */
    public function update(User $user, Task $task): bool
    {
        return ! $task->project->isArchived() && $user->belongsToTeam($task->project->team);
    }

    /**
     * Determine whether the user can delete the task.
     */
    public function delete(User $user, Task $task): bool
    {
        return $this->update($user, $task);
    }
}
