<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Issues\RecordToolEvent;
use App\Http\Requests\Api\V1\StoreToolEventRequest;
use App\Models\Issue;
use Illuminate\Http\JsonResponse;

class ToolEventController extends Controller
{
    /**
     * Take a report from a coding tool's hook: which issues it was about, and
     * which of them it moved to In Progress. The answer is only data.
     */
    public function __invoke(StoreToolEventRequest $request, RecordToolEvent $recordToolEvent): JsonResponse
    {
        $result = $recordToolEvent->handle($request->user(), $this->team($request), $request->report());

        return response()->json([
            'data' => [
                'issues' => $result['issues']->map(fn (Issue $issue) => $issue->identifier)->all(),
                'started' => $result['started']->map(fn (Issue $issue) => $issue->identifier)->all(),
            ],
        ], 202);
    }
}
