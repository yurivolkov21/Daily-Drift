<?php

namespace App\Http\Controllers\Tasks;

use App\Actions\Tasks\CompleteTask;
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
     * Move the task to an index of a list in the same project. Moving it into
     * the project's Done list completes it, and moving it out reopens it
     * (spec 0010).
     */
    public function move(MoveTaskRequest $request, Team $current_team, Task $task, MoveTask $moveTask, CompleteTask $completeTask): RedirectResponse
    {
        Gate::authorize('update', $task);

        $target = $request->targetList();
        $index = $request->integer('index');
        $done = $task->project->doneList();
        $inDone = $done !== null && $task->task_list_id === $done->id;
        $toDone = $done !== null && $target->is($done);

        match (true) {
            $toDone && ! $inDone && ! $task->isCompleted() => $completeTask->handle($task, true, $target, $index),
            $inDone && ! $toDone && $task->isCompleted() => $completeTask->handle($task, false, $target, $index),
            default => $moveTask->handle($task, $target, $index),
        };

        return back();
    }

    /**
     * Complete the task or open it again. With a Done list, completing moves
     * the task to its top and reopening moves it back (spec 0010).
     */
    public function complete(CompleteTaskRequest $request, Team $current_team, Task $task, CompleteTask $completeTask): RedirectResponse
    {
        Gate::authorize('update', $task);

        $completeTask->handle($task, $request->boolean('completed'));

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
