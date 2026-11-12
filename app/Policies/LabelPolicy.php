<?php

namespace App\Policies;

use App\Enums\TeamPermission;
use App\Models\Label;
use App\Models\Team;
use App\Models\User;

/**
 * Spec 0007: everyone in the team creates labels; owners and admins rename,
 * change the icon and delete them, since that changes every project.
 */
class LabelPolicy
{
    public function create(User $user, Team $team): bool
    {
        return $user->belongsToTeam($team);
    }

    public function update(User $user, Label $label): bool
    {
        return $user->hasTeamPermission($label->team, TeamPermission::ManageLabels);
    }

    public function delete(User $user, Label $label): bool
    {
        return $this->update($user, $label);
    }
}
