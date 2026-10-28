<?php

namespace App\Actions\Github;

use App\Enums\IssueLinkType;
use App\Enums\PullRequestState;
use App\Events\WorkspaceChanged;
use App\Models\Team;
use Illuminate\Support\Fluent;

class LinkPullRequest
{
    public function __construct(protected FindMentionedIssues $findMentionedIssues) {}

    /**
     * Link a pull request to the team's issues named in its branch, title or
     * description, and keep its state current on every later event.
     *
     * @param  Fluent<string, mixed>  $payload  A "pull_request" event.
     */
    public function handle(Team $team, Fluent $payload): void
    {
        $pullRequest = new Fluent($payload->array('pull_request'));

        $issues = $this->findMentionedIssues->handle(
            $team,
            $pullRequest->string('head.ref')->toString(),
            $pullRequest->string('title')->toString(),
            $pullRequest->string('body')->toString(),
        );

        foreach ($issues as $issue) {
            $issue->links()->updateOrCreate([
                'type' => IssueLinkType::PullRequest,
                'repository' => $payload->string('repository.full_name')->toString(),
                'external_id' => $pullRequest->string('number')->toString(),
            ], [
                'title' => $pullRequest->string('title')->limit(250)->toString(),
                'url' => $pullRequest->string('html_url')->toString(),
                'state' => PullRequestState::fromGithub($pullRequest->toArray()),
                'author' => $pullRequest->string('user.login')->toString() ?: null,
            ]);

            broadcast(WorkspaceChanged::forIssue($issue, 'link', 'updated'))->toOthers();
        }
    }
}
