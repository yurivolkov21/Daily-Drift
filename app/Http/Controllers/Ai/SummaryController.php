<?php

namespace App\Http\Controllers\Ai;

use App\Ai\SummarizeWeek;
use App\Data\ProjectSummaryData;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Team;
use App\Support\LocalTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SummaryController extends Controller
{
    /**
     * The project's saved weekly summary, if there is one (spec 0011).
     */
    public function show(Team $current_team, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json([
            'summary' => $project->summary ? ProjectSummaryData::from($project->summary) : null,
        ]);
    }

    /**
     * Write a new summary of the last 7 days, in place of the saved one.
     */
    public function store(Request $request, Team $current_team, Project $project, SummarizeWeek $summarize): JsonResponse
    {
        Gate::authorize('summarize', $project);

        $summary = $summarize->handle($project, $request->user(), LocalTime::today($request), LocalTime::zone($request));

        return response()->json(['summary' => ProjectSummaryData::from($summary)]);
    }
}
