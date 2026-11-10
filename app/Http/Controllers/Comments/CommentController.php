<?php

namespace App\Http\Controllers\Comments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comments\SaveCommentRequest;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class CommentController extends Controller
{
    /**
     * Add a comment to the task.
     */
    public function store(SaveCommentRequest $request, Team $current_team, Task $task): RedirectResponse
    {
        Gate::authorize('create', [Comment::class, $task]);

        DB::transaction(function () use ($request, $task) {
            $comment = $task->comments()->make([
                'body' => $request->string('body')->trim()->toString(),
                'mentions' => $request->mentions(),
            ]);
            $comment->author()->associate($request->user());
            $comment->save();

            Activity::record($task, Activity::COMMENT_ADDED, ['comment_id' => $comment->id]);
        });

        return back();
    }

    /**
     * Edit one's own comment.
     */
    public function update(SaveCommentRequest $request, Team $current_team, Comment $comment): RedirectResponse
    {
        $this->ensureInTeam($current_team, $comment);
        Gate::authorize('update', $comment);

        $comment->update([
            'body' => $request->string('body')->trim()->toString(),
            'mentions' => $request->mentions(),
        ]);

        return back();
    }

    /**
     * Delete a comment.
     */
    public function destroy(Team $current_team, Comment $comment): RedirectResponse
    {
        $this->ensureInTeam($current_team, $comment);
        Gate::authorize('delete', $comment);

        $comment->delete();

        return back();
    }

    /**
     * A comment of another team is not found, like its project (ADR 0006).
     */
    private function ensureInTeam(Team $team, Comment $comment): void
    {
        abort_unless($comment->task->project->team_id === $team->id, 404);
    }
}
