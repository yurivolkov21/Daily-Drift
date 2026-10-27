<?php

use App\Models\Project;
use App\Models\User;
use Database\Seeders\IssueTrackerSeeder;

test('the demo seeder creates a shared team with numbered issues', function () {
    $this->seed(IssueTrackerSeeder::class);

    $owner = User::where('email', 'owner@example.com')->sole();
    $teammate = User::where('email', 'teammate@example.com')->sole();
    $project = Project::where('key', 'DD')->sole();

    expect($owner->belongsToTeam($project->team))->toBeTrue();
    expect($teammate->isCurrentTeam($project->team))->toBeTrue();
    expect($project->issues()->orderBy('number')->pluck('number')->all())->toBe([1, 2, 3, 4, 5]);

    $palette = $project->issues()->where('title', 'Command palette and keyboard shortcuts')->sole();

    expect($palette->subtasks()->count())->toBe(4);
    expect($palette->subtasks()->whereNotNull('completed_at')->count())->toBe(3);
});
