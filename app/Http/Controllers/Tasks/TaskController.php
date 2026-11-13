<?php

namespace App\Http\Controllers\Tasks;

use App\Actions\Tasks\CreateTask;
use App\Actions\Tasks\DeleteTask;
use App\Actions\Tasks\MoveTask;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\CompleteTaskRequest;
use App\Http\Requests\Tasks\MoveTaskRequest;
use App\Http\Requests\Tasks\StoreTaskRequest;
use App\Http\Requests\Tasks\UpdateTaskRequest;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TaskController extends Controller
{
    /**
     * Add a task at the bottom of the list, with a due date when the
     * calendar view adds it on a day.
     */
    public function store(StoreTaskRequest $request, Team $current_team, TaskList $list, CreateTask $createTask): RedirectResponse
    {
        Gate::authorize('create', [Task::class, $list]);

        $createTask->handle(
            $list,
            $request->user(),
            $request->string('title')->toString(),
            $request->filled('due_on') ? $request->string('due_on')->toString() : null,
        );

        return back();
    }

    /**
     * Change the task's title, description, priority or due date.
     */
    public function update(UpdateTaskRequest $request, Team $current_team, Task $task): RedirectResponse
    {
        Gate::authorize('update', $task);

        $task->update($request->validated());

        return back();
    }

    /**
     * Move the task to an index of a list in the same project.
     */
    public function move(MoveTaskRequest $request, Team $current_team, Task $task, MoveTask $moveTask): RedirectResponse
    {
        Gate::authorize('update', $task);

        $moveTask->handle($task, $request->targetList(), $request->integer('index'));

        return back();
    }

    /**
     * Mark the task as completed or open again. The list does not change.
     */
    public function complete(CompleteTaskRequest $request, Team $current_team, Task $task): RedirectResponse
    {
        Gate::authorize('update', $task);

        $completed = $request->boolean('completed');

        if ($completed !== $task->isCompleted()) {
            $task->update(['completed_at' => $completed ? now() : null]);
        }

        return back();
    }

    /**
     * Delete the task.
     */
    public function destroy(Team $current_team, Task $task, DeleteTask $deleteTask): RedirectResponse
    {
        Gate::authorize('delete', $task);

        $deleteTask->handle($task);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task deleted.')]);

        return back();
    }
}
