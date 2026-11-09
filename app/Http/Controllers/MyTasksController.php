<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Queries\MyTasks;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyTasksController extends Controller
{
    /**
     * Show the open tasks assigned to the viewer in the current team (spec 0004).
     */
    public function __invoke(Request $request, Team $current_team): Response
    {
        $project = $request->integer('project') ?: null;

        // Only the team's active projects can be a filter.
        if ($project !== null && ! $current_team->projects()->active()->whereKey($project)->exists()) {
            $project = null;
        }

        return Inertia::render('my-tasks', [
            'myTasks' => (new MyTasks($current_team, $request->user(), $project))->toArray(),
            'filters' => ['project' => $project],
        ]);
    }
}
