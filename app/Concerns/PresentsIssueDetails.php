<?php

namespace App\Concerns;

use App\Http\Resources\CommentResource;
use App\Http\Resources\IssueActivityResource;
use App\Http\Resources\IssueResource;
use App\Http\Resources\SubtaskResource;
use App\Models\Issue;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait PresentsIssueDetails
{
    /**
     * Get the issue with everything its page shows: its properties, comments,
     * history and sub-tasks.
     *
     * @return array{issue: array<string, mixed>, comments: array<int|string, mixed>, activities: array<int|string, mixed>, subtasks: array<int, array<string, mixed>>}
     */
    protected function issueDetails(Issue $issue): array
    {
        $issue->loadMissing('project')->load([
            'assignee',
            'creator',
            'labels',
            'comments' => fn (HasMany $query) => $query->with('author')->oldest()->orderBy('id'),
            'activities' => fn (HasMany $query) => $query->with('actor')->oldest()->orderBy('id'),
        ]);

        return [
            'issue' => IssueResource::make($issue)->resolve(),
            'comments' => CommentResource::collection($issue->comments)->resolve(),
            'activities' => IssueActivityResource::collection($issue->activities)->resolve(),
            'subtasks' => $this->subtasksOf($issue),
        ];
    }

    /**
     * Get the issue's sub-tasks in order, kept apart from the issue itself so
     * pages that edit them get one copy.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function subtasksOf(Issue $issue): array
    {
        return SubtaskResource::collection($issue->subtasks()->orderBy('position')->orderBy('id')->get())->resolve();
    }
}
