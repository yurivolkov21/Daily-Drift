<?php

namespace App\Http\Controllers\Projects;

use App\Actions\Projects\CreateProject;
use App\Data\ProjectData;
use App\Data\ProjectStats;
use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\SaveProjectRequest;
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
     * Display the team's projects, active and archived.
     */
    public function index(Request $request, Team $current_team): Response
    {
        Gate::authorize('viewAny', [Project::class, $current_team]);

        $user = $request->user();

        $projects = $current_team->projects()
            ->with(['creator', 'lists', 'team'])
            ->withCount(ProjectStats::counts())
            ->latest('updated_at')
            ->get();

        return Inertia::render('projects/index', [
            'projects' => $projects->map(fn (Project $project) => ProjectData::from($project, $user))->values(),
            'canCreate' => $user->can('create', [Project::class, $current_team]),
        ]);
    }

    /**
     * Create a project with its default lists.
     */
    public function store(SaveProjectRequest $request, Team $current_team, CreateProject $createProject): RedirectResponse
    {
        Gate::authorize('create', [Project::class, $current_team]);

        $project = $createProject->handle($current_team, $request->user(), $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project created.')]);

        return to_route('projects.show', ['current_team' => $current_team->slug, 'project' => $project->id]);
    }

    /**
     * Show the project board.
     */
    public function show(Request $request, Team $current_team, Project $project): Response
    {
        Gate::authorize('view', $project);

        $project->load(['creator', 'lists.tasks.creator', 'team'])->loadCount(ProjectStats::counts());

        return Inertia::render('projects/show', [
            'project' => ProjectData::from($project, $request->user()),
        ]);
    }

    /**
     * Update the project's name, description and color.
     */
    public function update(SaveProjectRequest $request, Team $current_team, Project $project): RedirectResponse
    {
        Gate::authorize('update', $project);

        $project->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project updated.')]);

        return back();
    }

    /**
     * Delete the project with its lists.
     */
    public function destroy(Team $current_team, Project $project): RedirectResponse
    {
        Gate::authorize('delete', $project);

        $project->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project deleted.')]);

        return to_route('projects.index', ['current_team' => $current_team->slug]);
    }
}
