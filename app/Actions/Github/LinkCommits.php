<?php

namespace App\Actions\Github;

use App\Actions\Issues\FindMentionedIssues;
use App\Enums\IssueLinkType;
use App\Events\WorkspaceChanged;
use App\Models\Issue;
use App\Models\Team;
use Illuminate\Support\Fluent;
use Illuminate\Support\Str;

class LinkCommits
{
    public function __construct(protected FindMentionedIssues $findMentionedIssues) {}

    /**
     * Link each pushed commit to the team's issues its message names.
     *
     * @param  Fluent<string, mixed>  $payload  A "push" event.
     */
    public function handle(Team $team, Fluent $payload): void
    {
        /** @var array<string, Issue> $linkedIssues */
        $linkedIssues = [];

        foreach ($payload->array('commits') as $commit) {
            if (! is_array($commit)) {
                continue;
            }

            $commit = new Fluent($commit);
            $message = $commit->string('message')->toString();

            foreach ($this->findMentionedIssues->handle($team, $message) as $issue) {
                $issue->links()->updateOrCreate([
                    'type' => IssueLinkType::Commit,
                    'repository' => $payload->string('repository.full_name')->toString(),
                    'external_id' => $commit->string('id')->toString(),
                ], [
                    'title' => Str::of($message)->before("\n")->limit(250)->toString(),
                    'url' => $commit->string('url')->toString(),
                    'author' => $commit->string('author.username')->toString() ?: $commit->string('author.name')->toString() ?: null,
                ]);

                $linkedIssues[$issue->id] = $issue;
            }
        }

        foreach ($linkedIssues as $issue) {
            broadcast(WorkspaceChanged::forIssue($issue, 'link', 'updated'))->toOthers();
        }
    }
}
