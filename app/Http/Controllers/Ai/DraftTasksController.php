<?php

namespace App\Http\Controllers\Ai;

use App\Actions\Tasks\AddDraftedTasks;
use App\Ai\DraftTasks;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\AddDraftedTasksRequest;
use App\Http\Requests\Ai\DraftTasksRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class DraftTasksController extends Controller
{
    /**
     * Draft tasks for the project from a brief (spec 0011). Nothing is
     * saved yet.
     */
    public function draft(DraftTasksRequest $request, Team $current_team, Project $project, DraftTasks $draft): JsonResponse
    {
        Gate::authorize('create', [Task::class, $this->list($project)]);

        return response()->json(['tasks' => $draft->handle($project, $request->string('brief')->toString())]);
    }

    /**
     * Add the drafted tasks the person kept to the first list that is not
     * the Done list.
     */
    public function store(AddDraftedTasksRequest $request, Team $current_team, Project $project, AddDraftedTasks $add): RedirectResponse
    {
        $list = $this->list($project);
        Gate::authorize('create', [Task::class, $list]);

        $add->handle($list, $request->user(), $request->drafts());

        return back();
    }

    private function list(Project $project): TaskList
    {
        return $project->firstOpenList() ?? throw ValidationException::withMessages([
            'list' => __('Add a list to the project first.'),
        ]);
    }
}
