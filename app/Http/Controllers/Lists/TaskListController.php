<?php

namespace App\Http\Controllers\Lists;

use App\Actions\Lists\CreateTaskList;
use App\Actions\Lists\DeleteTaskList;
use App\Actions\Lists\MoveTaskList;
use App\Http\Controllers\Controller;
use App\Http\Requests\Lists\MoveTaskListRequest;
use App\Http\Requests\Lists\StoreTaskListRequest;
use App\Http\Requests\Lists\UpdateTaskListRequest;
use App\Models\Project;
use App\Models\TaskList;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TaskListController extends Controller
{
    /**
     * Add a list at the end of the project's board.
     */
    public function store(StoreTaskListRequest $request, Team $current_team, Project $project, CreateTaskList $createTaskList): RedirectResponse
    {
        Gate::authorize('create', [TaskList::class, $project]);

        $createTaskList->handle($project, $request->string('name')->toString());

        return back();
    }

    /**
     * Rename or recolor the list.
     */
    public function update(UpdateTaskListRequest $request, Team $current_team, TaskList $list): RedirectResponse
    {
        Gate::authorize('update', $list);

        $list->update($request->validated());

        return back();
    }

    /**
     * Move the list to another column index.
     */
    public function move(MoveTaskListRequest $request, Team $current_team, TaskList $list, MoveTaskList $moveTaskList): RedirectResponse
    {
        Gate::authorize('update', $list);

        $moveTaskList->handle($list, $request->integer('index'));

        return back();
    }

    /**
     * Delete the list with its tasks.
     */
    public function destroy(Team $current_team, TaskList $list, DeleteTaskList $deleteTaskList): RedirectResponse
    {
        Gate::authorize('delete', $list);

        $deleteTaskList->handle($list);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('List deleted.')]);

        return back();
    }
}
