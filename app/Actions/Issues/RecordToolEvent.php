<?php

namespace App\Actions\Issues;

use App\Enums\IssueStatus;
use App\Models\Issue;
use App\Models\Team;
use App\Models\ToolEvent;
use App\Models\User;
use Illuminate\Support\Collection;

class RecordToolEvent
{
    public function __construct(
        protected FindMentionedIssues $findMentionedIssues,
        protected UpdateIssue $updateIssue,
    ) {}

    /**
     * Record what a coding tool reported, once for each issue it is about,
     * and move those issues that have not started yet to In Progress.
     *
     * Any event counts as work on the issue, whichever tool sends it. Issues
     * that are already in progress, in review, done or canceled stay where
     * they are, so a hook can never move an issue backwards.
     *
     * @param  array{tool: string, event: string, branch: string|null, issue: string|null}  $report
     * @return array{issues: Collection<int, Issue>, started: Collection<int, Issue>}
     */
    public function handle(User $user, Team $team, array $report): array
    {
        // The issue the report names wins over the ones its branch names.
        $issues = $this->findMentionedIssues->handle($team, $report['issue'] ?? $report['branch'] ?? '');

        // An event about no issue, such as a session on main, is kept too.
        foreach ($issues->isEmpty() ? [null] : $issues as $issue) {
            $event = new ToolEvent([
                'tool' => $report['tool'],
                'event' => $report['event'],
                'branch' => $report['branch'],
            ]);

            $event->team()->associate($team);
            $event->user()->associate($user);
            $event->issue()->associate($issue);
            $event->save();
        }

        $started = $issues->filter(fn (Issue $issue) => in_array($issue->status, [IssueStatus::Backlog, IssueStatus::Todo], true))->values();

        foreach ($started as $issue) {
            $this->updateIssue->handle($user, $issue, ['status' => IssueStatus::InProgress]);
        }

        return ['issues' => $issues, 'started' => $started];
    }
}
