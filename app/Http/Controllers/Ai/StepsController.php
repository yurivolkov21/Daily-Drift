<?php

namespace App\Http\Controllers\Ai;

use App\Ai\SuggestSteps;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class StepsController extends Controller
{
    /**
     * Suggest checklist steps for the task (spec 0011). Nothing is saved;
     * the sheet adds the steps the person keeps.
     */
    public function __invoke(Team $current_team, Task $task, SuggestSteps $suggest): JsonResponse
    {
        Gate::authorize('update', $task);

        return response()->json(['steps' => $suggest->handle($task)]);
    }
}
