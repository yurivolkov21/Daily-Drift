<?php

namespace App\Concerns;

use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;

trait PresentsProjectSummaries
{
    /**
     * Get the team's projects with their details, issue counts and the people
     * assigned to their issues, by name.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function projectSummaries(Team $team): array
    {
        $projects = $team->projects()
            ->withCount(['issues', 'openIssues', 'completedIssues', 'canceledIssues'])
            ->orderBy('name')
            ->get();

        $assigneeIds = Issue::query()
            ->whereIn('project_id', $projects->modelKeys())
            ->whereNotNull('assignee_id')
            ->distinct()
            ->get(['project_id', 'assignee_id'])
            ->groupBy('project_id');

        return $projects->map(fn (Project $project) => [
            'id' => $project->id,
            'key' => $project->key,
            'name' => $project->name,
            'description' => $project->description,
            'icon' => $project->icon,
            'color' => $project->color,
            'status' => $project->status->value,
            'leadId' => $project->lead_id,
            'targetDate' => $project->target_date?->toDateString(),
            'issuesCount' => $project->issues_count,
            'openIssuesCount' => $project->open_issues_count,
            'completedIssuesCount' => $project->completed_issues_count,
            'canceledIssuesCount' => $project->canceled_issues_count,
            'assigneeIds' => $assigneeIds->get($project->id, collect())->pluck('assignee_id')->sort()->values(),
        ])->all();
    }
}
