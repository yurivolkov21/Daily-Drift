<?php

namespace App\Actions\Github;

use App\Actions\Issues\FindMentionedIssues;
use App\Actions\Issues\UpdateIssue;
use App\Enums\IssueLinkType;
use App\Enums\IssueStatus;
use App\Enums\PullRequestState;
use App\Events\WorkspaceChanged;
use App\Models\Issue;
use App\Models\IssueLink;
use App\Models\Team;
use Illuminate\Support\Fluent;

class LinkPullRequest
{
    public function __construct(
        protected FindMentionedIssues $findMentionedIssues,
        protected UpdateIssue $updateIssue,
    ) {}

    /**
     * Link a pull request to the team's issues named in its branch, title or
     * description, keep its state current on every later event, and move the
     * issues it works on along, as Linear does by default.
     *
     * Only an issue named in the branch or the title counts as the one the
     * pull request works on. One named only in the description is linked as
     * a reference, and its status is left alone.
     *
     * @param  Fluent<string, mixed>  $payload  A "pull_request" event.
     */
    public function handle(Team $team, Fluent $payload): void
    {
        $pullRequest = new Fluent($payload->array('pull_request'));
        $state = PullRequestState::fromGithub($pullRequest->toArray());

        $worksOn = $this->findMentionedIssues->handle(
            $team,
            $pullRequest->string('head.ref')->toString(),
            $pullRequest->string('title')->toString(),
        );

        $issues = $worksOn
            ->concat($this->findMentionedIssues->handle($team, $pullRequest->string('body')->toString()))
            ->unique('id');

        foreach ($issues as $issue) {
            $link = $issue->links()->updateOrCreate([
                'type' => IssueLinkType::PullRequest,
                'repository' => $payload->string('repository.full_name')->toString(),
                'external_id' => $pullRequest->string('number')->toString(),
            ], [
                'title' => $pullRequest->string('title')->limit(250)->toString(),
                'url' => $pullRequest->string('html_url')->toString(),
                'state' => $state,
                'closes' => $worksOn->contains('id', $issue->id),
                'author' => $pullRequest->string('user.login')->toString() ?: null,
            ]);

            if ($link->closes) {
                $this->moveIssue($issue, $link);
            }

            broadcast(WorkspaceChanged::forIssue($issue, 'link', 'updated'))->toOthers();
        }
    }

    /**
     * Move the issue to In Progress when its pull request opens, and to Done
     * when it is merged. An issue never moves backwards, and drafts or pull
     * requests closed without merging leave it where it is.
     */
    protected function moveIssue(Issue $issue, IssueLink $link): void
    {
        $status = match ($link->state) {
            PullRequestState::Open => in_array($issue->status, [IssueStatus::Backlog, IssueStatus::Todo], true)
                ? IssueStatus::InProgress
                : null,
            PullRequestState::Merged => in_array($issue->status, IssueStatus::closed(), true)
                ? null
                : IssueStatus::Done,
            default => null,
        };

        if ($status === null) {
            return;
        }

        $this->updateIssue->handle(null, $issue, ['status' => $status], via: [
            'pull_request' => (int) $link->external_id,
            'repository' => $link->repository,
            'url' => $link->url,
        ]);
    }
}
