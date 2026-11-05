<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\TaskList;
use App\Models\User;

/**
 * Every member of the team manages lists (spec 0001), as long as the
 * project is not archived.
 */
class TaskListPolicy
{
    /**
     * Determine whether the user can add lists to the project.
     */
    public function create(User $user, Project $project): bool
    {
        return ! $project->isArchived() && $user->belongsToTeam($project->team);
    }

    /**
     * Determine whether the user can rename, recolor or move the list.
     */
    public function update(User $user, TaskList $list): bool
    {
        return $this->create($user, $list->project);
    }

    /**
     * Determine whether the user can delete the list.
     */
    public function delete(User $user, TaskList $list): bool
    {
        return $this->create($user, $list->project);
    }
}
