<?php

namespace App\Actions\Projects;

use App\Enums\Hue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateProject
{
    /**
     * The lists every new project starts with, in board order.
     *
     * @var list<array{name: string, color: Hue}>
     */
    public const DEFAULT_LISTS = [
        ['name' => 'To do', 'color' => Hue::Slate],
        ['name' => 'In progress', 'color' => Hue::Amber],
        ['name' => 'Done', 'color' => Hue::Green],
    ];

    /**
     * Create a project in the team, with its default lists.
     *
     * @param  array<string, mixed>  $attributes  Validated name, description and color.
     */
    public function handle(Team $team, User $creator, array $attributes): Project
    {
        return DB::transaction(function () use ($team, $creator, $attributes) {
            $project = $team->projects()->make($attributes);
            $project->creator()->associate($creator);
            $project->save();

            foreach (self::DEFAULT_LISTS as $position => $list) {
                $project->lists()->create([...$list, 'position' => $position]);
            }

            return $project;
        });
    }
}
