<?php

namespace App\Actions\Issues;

use App\Enums\IssueActivityType;
use App\Events\WorkspaceChanged;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Notifications\IssueAssigned;
use Illuminate\Support\Facades\DB;

class CreateIssue
{
    /**
     * Create a new issue in the given project.
     *
     * @param  array<string, mixed>  $attributes
     * @param  array<int, string>  $labelIds
     */
    public function handle(User $creator, Project $project, array $attributes, array $labelIds = []): Issue
    {
        return DB::transaction(function () use ($creator, $project, $attributes, $labelIds) {
            $issue = new Issue($attributes);

            $issue->project()->associate($project);
            $issue->creator()->associate($creator);
            $issue->save();

            $issue->labels()->sync($labelIds);

            $issue->recordActivity(IssueActivityType::Created, $creator);

            if ($issue->assignee !== null && $issue->assignee->isNot($creator)) {
                $issue->assignee->notify(new IssueAssigned($issue, $creator));
            }

            broadcast(WorkspaceChanged::forIssue($issue, 'issue', 'created'))->toOthers();

            return $issue;
        });
    }
}
