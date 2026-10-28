<?php

namespace App\Http\Controllers\Issues;

use App\Concerns\PresentsProjectSummaries;
use App\Enums\TeamPermission;
use App\Events\WorkspaceChanged;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\SaveProjectRequest;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    use PresentsProjectSummaries;

    /**
     * Display the team's projects.
     */
    public function index(Request $request, Team $currentTeam): Response
    {
        return Inertia::render('projects/index', [
            'projects' => $this->projectSummaries($currentTeam),
            'canDeleteProjects' => $request->user()->hasTeamPermission($currentTeam, TeamPermission::DeleteProject),
        ]);
    }

    /**
     * Store a newly created project.
     */
    public function store(SaveProjectRequest $request, Team $currentTeam): RedirectResponse
    {
        $project = $currentTeam->projects()->create($request->validated());

        broadcast(new WorkspaceChanged($currentTeam->id, 'project', 'created'))->toOthers();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project :name created.', ['name' => $project->name])]);

        return back();
    }

    /**
     * Update the given project.
     */
    public function update(SaveProjectRequest $request, Team $currentTeam, Project $project): RedirectResponse
    {
        $project->update($request->validated());

        broadcast(new WorkspaceChanged($currentTeam->id, 'project', 'updated'))->toOthers();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project updated.')]);

        return back();
    }

    /**
     * Delete the given project along with its issues.
     */
    public function destroy(Team $currentTeam, Project $project): RedirectResponse
    {
        Gate::authorize('delete', $project);

        $project->delete();

        broadcast(new WorkspaceChanged($currentTeam->id, 'project', 'deleted'))->toOthers();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project :name deleted.', ['name' => $project->name])]);

        return to_route('projects.index', ['current_team' => $currentTeam->slug]);
    }
}
