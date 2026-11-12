<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Queries\TeamSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Tasks and projects of the current team for the Ctrl K box (spec 0007).
     */
    public function __invoke(Request $request, Team $current_team): JsonResponse
    {
        return response()->json((new TeamSearch($current_team, (string) $request->query('q', '')))->toArray());
    }
}
