<?php

namespace Database\Seeders;

use App\Actions\Issues\CreateIssue;
use App\Actions\Teams\CreateTeam;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Enums\TeamRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class IssueTrackerSeeder extends Seeder
{
    /**
     * Seed a shared "Daily Drift" team with two members, a project, labels and sample issues.
     *
     * Both demo accounts use the factory password "password".
     */
    public function run(CreateTeam $createTeam, CreateIssue $createIssue): void
    {
        $owner = User::factory()->create([
            'name' => 'Demo Owner',
            'email' => 'owner@example.com',
        ]);

        $teammate = User::factory()->create([
            'name' => 'Demo Teammate',
            'email' => 'teammate@example.com',
        ]);

        $team = $createTeam->handle($owner, 'Daily Drift');
        $team->members()->attach($teammate, ['role' => TeamRole::Member->value]);
        $teammate->switchTeam($team);

        $project = $team->projects()->create([
            'name' => 'Daily Drift',
            'key' => 'DD',
            'description' => 'The Linear-style issue tracker itself.',
        ]);

        $labels = collect([
            'Bug' => '#eb5757',
            'Feature' => '#5e6ad2',
            'Improvement' => '#4cb782',
        ])->map(fn (string $color, string $name) => $team->labels()->create([
            'name' => $name,
            'color' => $color,
        ]));

        $issues = [
            ['Set up the issue tracker core', IssueStatus::Done, IssuePriority::High, $owner, ['Feature']],
            ['Add the board view with drag and drop', IssueStatus::InReview, IssuePriority::High, $owner, ['Feature']],
            ['Command palette and keyboard shortcuts', IssueStatus::InProgress, IssuePriority::Medium, $teammate, ['Feature']],
            ['Fix team switcher losing the current page', IssueStatus::Todo, IssuePriority::Urgent, $teammate, ['Bug']],
            ['Realtime updates with Reverb', IssueStatus::Backlog, IssuePriority::Low, null, ['Improvement']],
        ];

        foreach ($issues as [$title, $status, $priority, $assignee, $labelNames]) {
            $createIssue->handle($owner, $project, [
                'title' => $title,
                'status' => $status,
                'priority' => $priority,
                'assignee_id' => $assignee?->id,
            ], $labels->only($labelNames)->map->id->values()->all());
        }
    }
}
