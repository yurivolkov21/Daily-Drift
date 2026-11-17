<?php

namespace App\Data;

use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\TaskList;
use App\Models\User;

readonly class ProjectAbilities
{
    public function __construct(
        public bool $update,
        public bool $archive,
        public bool $restore,
        public bool $delete,
        public bool $manageLists,
        public bool $deleteAnyFile,
        public bool $summarize,
    ) {
        //
    }

    /**
     * Resolve what the user may do with the project.
     */
    public static function for(User $user, Project $project): self
    {
        return new self(
            update: $user->can('update', $project),
            archive: $user->can('archive', $project),
            restore: $user->can('restore', $project),
            delete: $user->can('delete', $project),
            manageLists: $user->can('create', [TaskList::class, $project]),
            // Spec 0010: owners and admins delete anyone's files.
            deleteAnyFile: ! $project->isArchived()
                && $user->teamRole($project->team)?->isAtLeast(TeamRole::Admin) === true,
            // Spec 0011: write a new weekly summary.
            summarize: $user->can('summarize', $project),
        );
    }
}
