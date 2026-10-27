<?php

use App\Enums\TeamRole;
use App\Models\Label;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('pages share the current team\'s projects, labels and members', function () {
    $user = User::factory()->create(['name' => 'Ada']);
    $team = $user->currentTeam;
    $teammate = User::factory()->create(['name' => 'Grace']);
    $team->members()->attach($teammate, ['role' => TeamRole::Member->value]);
    $project = Project::factory()->for($team)->create(['key' => 'DD', 'name' => 'Daily Drift']);
    $label = Label::factory()->for($team)->create(['name' => 'Bug', 'color' => '#eb5757']);
    Project::factory()->create();
    Label::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard', $team));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('workspace.projects', [
            ['id' => $project->id, 'key' => 'DD', 'name' => 'Daily Drift'],
        ])
        ->where('workspace.labels', [
            ['id' => $label->id, 'name' => 'Bug', 'color' => '#eb5757'],
        ])
        ->where('workspace.members', [
            ['id' => $user->id, 'name' => 'Ada', 'email' => $user->email],
            ['id' => $teammate->id, 'name' => 'Grace', 'email' => $teammate->email],
        ]),
    );
});
