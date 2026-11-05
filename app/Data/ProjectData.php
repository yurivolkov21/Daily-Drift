<?php

namespace App\Data;

use App\Models\Project;
use App\Models\TaskList;
use App\Models\User;

readonly class ProjectData
{
    /**
     * @param  array<int, TaskListData>  $lists
     */
    public function __construct(
        public int $id,
        public string $name,
        public ?string $description,
        public string $color,
        public ?string $archivedAt,
        public ?string $updatedAt,
        public ?string $creatorName,
        public array $lists,
        public ProjectAbilities $can,
    ) {
        //
    }

    /**
     * Build the data for a project, as seen by the given user.
     */
    public static function from(Project $project, User $user): self
    {
        return new self(
            id: $project->id,
            name: $project->name,
            description: $project->description,
            color: $project->color->value,
            archivedAt: $project->archived_at?->toISOString(),
            updatedAt: $project->updated_at?->toISOString(),
            creatorName: $project->creator?->name,
            lists: $project->lists->map(fn (TaskList $list) => TaskListData::from($list))->values()->all(),
            can: ProjectAbilities::for($user, $project),
        );
    }
}
