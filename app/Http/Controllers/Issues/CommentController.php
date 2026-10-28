<?php

namespace App\Http\Controllers\Issues;

use App\Actions\Issues\NotifyMentionedMembers;
use App\Events\WorkspaceChanged;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\SaveCommentRequest;
use App\Models\Comment;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class CommentController extends Controller
{
    /**
     * Add a comment to the given issue.
     */
    public function store(SaveCommentRequest $request, Team $currentTeam, string $identifier, NotifyMentionedMembers $notifyMentionedMembers): RedirectResponse
    {
        $issue = $currentTeam->issues()->identifiedBy($identifier)->firstOrFail();

        $comment = $issue->comments()->make($request->validated());
        $comment->author()->associate($request->user());
        $comment->save();

        $notifyMentionedMembers->handle($comment, $request->user());

        broadcast(WorkspaceChanged::forIssue($issue, 'comment', 'created'))->toOthers();

        return back();
    }

    /**
     * Edit the given comment.
     */
    public function update(SaveCommentRequest $request, Team $currentTeam, string $identifier, string $commentId, NotifyMentionedMembers $notifyMentionedMembers): RedirectResponse
    {
        $comment = $this->findComment($currentTeam, $identifier, $commentId);

        Gate::authorize('update', $comment);

        $previouslyMentioned = $comment->mentionedUserIds();

        $comment->update($request->validated());

        $notifyMentionedMembers->handle($comment, $request->user(), $previouslyMentioned);

        broadcast(WorkspaceChanged::forIssue($comment->issue, 'comment', 'updated'))->toOthers();

        return back();
    }

    /**
     * Delete the given comment.
     */
    public function destroy(Team $currentTeam, string $identifier, string $commentId): RedirectResponse
    {
        $comment = $this->findComment($currentTeam, $identifier, $commentId);

        Gate::authorize('delete', $comment);

        $comment->delete();

        broadcast(WorkspaceChanged::forIssue($comment->issue, 'comment', 'deleted'))->toOthers();

        return back();
    }

    /**
     * Find a comment on the team's issue with the given identifier.
     */
    protected function findComment(Team $team, string $identifier, string $commentId): Comment
    {
        return $team->issues()
            ->identifiedBy($identifier)
            ->firstOrFail()
            ->comments()
            ->findOrFail($commentId);
    }
}
