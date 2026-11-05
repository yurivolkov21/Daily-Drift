<?php

namespace App\Policies;

use App\Enums\TeamPermission;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;

class ProjectPolicy
{
    /**
     * Determine whether the user can list the team's projects.
     */
    public function viewAny(User $user, Team $team): bool
    {
        return $user->belongsToTeam($team);
    }

    /**
     * Determine whether the user can view the project.
     */
    public function view(User $user, Project $project): bool
    {
        return $user->belongsToTeam($project->team);
    }

    /**
     * Determine whether the user can create projects in the team.
     */
    public function create(User $user, Team $team): bool
    {
        return $user->hasTeamPermission($team, TeamPermission::CreateProject);
    }

    /**
     * Determine whether the user can edit the project. Archived projects are read-only.
     */
    public function update(User $user, Project $project): bool
    {
        return ! $project->isArchived()
            && $user->hasTeamPermission($project->team, TeamPermission::UpdateProject);
    }

    /**
     * Determine whether the user can archive the project.
     */
    public function archive(User $user, Project $project): bool
    {
        return ! $project->isArchived()
            && $user->hasTeamPermission($project->team, TeamPermission::UpdateProject);
    }

    /**
     * Determine whether the user can restore the archived project.
     */
    public function restore(User $user, Project $project): bool
    {
        return $project->isArchived()
            && $user->hasTeamPermission($project->team, TeamPermission::UpdateProject);
    }

    /**
     * Determine whether the user can delete the project.
     */
    public function delete(User $user, Project $project): bool
    {
        return $user->hasTeamPermission($project->team, TeamPermission::DeleteProject);
    }
}
