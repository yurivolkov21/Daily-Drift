<?php

namespace App\Http\Controllers\Issues;

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

        return back();
    }

    /**
     * Delete the given sub-task.
     */
    public function destroy(Team $currentTeam, string $identifier, string $subtaskId): RedirectResponse
    {
        $this->findSubtask($currentTeam, $identifier, $subtaskId)->delete();

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
