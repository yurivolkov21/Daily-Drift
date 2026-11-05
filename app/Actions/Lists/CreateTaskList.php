<?php

namespace App\Actions\Lists;

use App\Enums\Hue;
use App\Models\Project;
use App\Models\TaskList;
use Illuminate\Support\Facades\DB;

class CreateTaskList
{
    /**
     * Add a list at the end of the project's board, in the first color
     * the project does not use yet.
     */
    public function handle(Project $project, string $name): TaskList
    {
        return DB::transaction(function () use ($project, $name) {
            $lists = $project->lists()->lockForUpdate()->get();

            return $project->lists()->create([
                'name' => $name,
                'color' => $this->nextColor($lists->pluck('color')->all()),
                'position' => $lists->count(),
            ]);
        });
    }

    /**
     * The first palette color not in use, or the palette again from the start.
     *
     * @param  array<int, Hue>  $used
     */
    private function nextColor(array $used): Hue
    {
        foreach (Hue::cases() as $hue) {
            if (! in_array($hue, $used, true)) {
                return $hue;
            }
        }

        return Hue::cases()[count($used) % count(Hue::cases())];
    }
}
