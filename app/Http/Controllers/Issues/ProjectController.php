<?php

namespace App\Http\Controllers\Issues;

use App\Enums\TeamPermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\SaveProjectRequest;
use App\Models\Label;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display the team's projects and labels.
     */
    public function index(Request $request, Team $currentTeam): Response
    {
        $projects = $currentTeam->projects()
            ->withCount(['issues', 'openIssues'])
            ->orderBy('name')
            ->get();

        $labels = $currentTeam->labels()
            ->withCount('issues')
            ->orderBy('name')
            ->get();

        return Inertia::render('projects/index', [
            'projects' => $projects->map(fn (Project $project) => [
                'id' => $project->id,
                'key' => $project->key,
                'name' => $project->name,
                'description' => $project->description,
                'issuesCount' => $project->issues_count,
                'openIssuesCount' => $project->open_issues_count,
            ]),
            'labels' => $labels->map(fn (Label $label) => [
                'id' => $label->id,
                'name' => $label->name,
                'color' => $label->color,
                'issuesCount' => $label->issues_count,
            ]),
            'canDeleteProjects' => $request->user()->hasTeamPermission($currentTeam, TeamPermission::DeleteProject),
        ]);
    }

    /**
     * Store a newly created project.
     */
    public function store(SaveProjectRequest $request, Team $currentTeam): RedirectResponse
    {
        $project = $currentTeam->projects()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project :name created.', ['name' => $project->name])]);

        return back();
    }

    /**
     * Update the given project.
     */
    public function update(SaveProjectRequest $request, Team $currentTeam, Project $project): RedirectResponse
    {
        $project->update($request->validated());

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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project :name deleted.', ['name' => $project->name])]);

        return to_route('projects.index', ['current_team' => $currentTeam->slug]);
    }
}
