<?php

namespace App\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskActivityController extends Controller
{
    /**
     * The task's comments and events, oldest first (spec 0005). The task
     * sheet asks for them when it opens.
     */
    public function __invoke(Request $request, Team $current_team, Task $task): JsonResponse
    {
        Gate::authorize('view', $task->project);

        $user = $request->user();
        $events = $task->activities()
            ->where('type', '!=', Activity::COMMENT_ADDED)
            ->with('user:id,name')
            ->get();

        return response()->json([
            'comments' => $task->comments()->with('author:id,name')->get()->map(fn (Comment $comment) => [
                'id' => $comment->id,
                'body' => $comment->body,
                'mentions' => $comment->mentions,
                'author' => $comment->author ? ['id' => $comment->author->id, 'name' => $comment->author->name] : null,
                'createdAt' => $comment->created_at?->toISOString(),
                'edited' => $comment->isEdited(),
                'canEdit' => $user->can('update', $comment),
                'canDelete' => $user->can('delete', $comment),
            ]),
            'events' => $events->map(fn (Activity $event) => [
                'id' => $event->id,
                'type' => $event->type,
                'properties' => (object) $event->properties,
                'actor' => $event->user ? ['id' => $event->user->id, 'name' => $event->user->name] : null,
                'createdAt' => $event->created_at?->toISOString(),
            ]),
            // Tasks older than the event log have no "created" event.
            'historyStartsAt' => $events->contains('type', Activity::TASK_CREATED)
                ? null
                : Activity::query()->oldest()->value('created_at')?->toISOString(),
            'canComment' => $user->can('create', [Comment::class, $task]),
        ]);
    }
}
