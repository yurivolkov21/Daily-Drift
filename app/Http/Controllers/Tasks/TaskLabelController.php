<?php

namespace App\Http\Controllers\Tasks;

use App\Actions\Tasks\SyncTaskLabels;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\SyncTaskLabelsRequest;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class TaskLabelController extends Controller
{
    /**
     * Give the task its whole set of labels (spec 0007).
     */
    public function update(SyncTaskLabelsRequest $request, Team $current_team, Task $task, SyncTaskLabels $sync): RedirectResponse
    {
        Gate::authorize('update', $task);

        $sync->handle($task, $request->labelIds());

        return back();
    }
}
