<?php

namespace App\Http\Controllers\Issues;

use App\Events\WorkspaceChanged;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreSubtaskRequest;
use App\Http\Requests\Issues\UpdateSubtaskRequest;
use App\Models\Subtask;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;

class SubtaskController extends Controller
{
    /**
     * Add a sub-task to the end of the given issue's list.
     */
    public function store(StoreSubtaskRequest $request, Team $currentTeam, string $identifier): RedirectResponse
    {
        $issue = $currentTeam->issues()->identifiedBy($identifier)->firstOrFail();

        $issue->subtasks()->create([
            'title' => $request->validated('title'),
            'position' => (int) $issue->subtasks()->max('position') + 1,
        ]);

        broadcast(WorkspaceChanged::forIssue($issue, 'subtask', 'created'))->toOthers();

        return back();
    }

    /**
     * Rename the given sub-task, or tick it off and on again.
     */
    public function update(UpdateSubtaskRequest $request, Team $currentTeam, string $identifier, string $subtaskId): RedirectResponse
    {
        $subtask = $this->findSubtask($currentTeam, $identifier, $subtaskId);

        if ($request->safe()->has('title')) {
            $subtask->title = $request->safe()->string('title')->toString();
        }

        if ($request->safe()->has('completed')) {
            $subtask->completed_at = $request->safe()->boolean('completed') ? ($subtask->completed_at ?? now()) : null;
        }

        $subtask->save();

        broadcast(WorkspaceChanged::forIssue($subtask->issue, 'subtask', 'updated'))->toOthers();

        return back();
    }

    /**
     * Delete the given sub-task.
     */
    public function destroy(Team $currentTeam, string $identifier, string $subtaskId): RedirectResponse
    {
        $subtask = $this->findSubtask($currentTeam, $identifier, $subtaskId);

        $subtask->delete();

        broadcast(WorkspaceChanged::forIssue($subtask->issue, 'subtask', 'deleted'))->toOthers();

        return back();
    }

    /**
     * Find a sub-task of the team's issue with the given identifier.
     */
    protected function findSubtask(Team $team, string $identifier, string $subtaskId): Subtask
    {
        return $team->issues()
            ->identifiedBy($identifier)
            ->firstOrFail()
            ->subtasks()
            ->findOrFail($subtaskId);
    }
}
