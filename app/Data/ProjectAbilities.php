<?php

namespace App\Data;

use App\Models\Project;
use App\Models\User;

readonly class ProjectAbilities
{
    public function __construct(
        public bool $update,
        public bool $archive,
        public bool $restore,
        public bool $delete,
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
        );
    }
}
