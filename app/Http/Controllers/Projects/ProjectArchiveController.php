<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class ProjectArchiveController extends Controller
{
    /**
     * Archive the project, making it read-only.
     */
    public function store(Team $current_team, Project $project): RedirectResponse
    {
        Gate::authorize('archive', $project);

        $project->update(['archived_at' => now()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project archived.')]);

        return back();
    }

    /**
     * Restore the archived project.
     */
    public function destroy(Team $current_team, Project $project): RedirectResponse
    {
        Gate::authorize('restore', $project);

        $project->update(['archived_at' => null]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project restored.')]);

        return back();
    }
}
