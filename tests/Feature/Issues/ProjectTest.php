<?php

use App\Enums\IssueStatus;
use App\Enums\TeamRole;
use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the projects page lists the team\'s projects with issue counts', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD', 'name' => 'Daily Drift']);
    Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create();
    Issue::factory()->for($project)->withStatus(IssueStatus::Done)->create();
    Project::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('projects.index', $user->currentTeam));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('projects/index')
        ->has('projects', 1)
        ->where('projects.0.key', 'DD')
        ->where('projects.0.name', 'Daily Drift')
        ->where('projects.0.issuesCount', 2)
        ->where('projects.0.openIssuesCount', 1)
        ->where('canDeleteProjects', true),
    );
});

test('projects can be created with a lowercase key', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('projects.index', $user->currentTeam))
        ->post(route('projects.store', $user->currentTeam), [
            'name' => 'Daily Drift',
            'key' => 'dd',
            'description' => 'The issue tracker itself.',
        ]);

    $response->assertRedirect(route('projects.index', $user->currentTeam));
    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Project Daily Drift created.']);
    $this->assertDatabaseHas('projects', [
        'team_id' => $user->currentTeam->id,
        'name' => 'Daily Drift',
        'key' => 'DD',
        'description' => 'The issue tracker itself.',
    ]);
});

test('project keys must be unique within a team', function () {
    $user = User::factory()->create();
    Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);

    $response = $this
        ->actingAs($user)
        ->post(route('projects.store', $user->currentTeam), [
            'name' => 'Duplicate',
            'key' => 'DD',
        ]);

    $response->assertSessionHasErrors(['key' => 'The key has already been taken.']);
});

test('different teams can use the same project key', function () {
    $user = User::factory()->create();
    Project::factory()->create(['key' => 'DD']);

    $response = $this
        ->actingAs($user)
        ->post(route('projects.store', $user->currentTeam), [
            'name' => 'Daily Drift',
            'key' => 'DD',
        ]);

    $response->assertSessionHasNoErrors();
    expect($user->currentTeam->projects()->value('key'))->toBe('DD');
});

test('project keys must be short letters and digits starting with a letter', function (string $key) {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('projects.store', $user->currentTeam), [
            'name' => 'Daily Drift',
            'key' => $key,
        ]);

    $response->assertSessionHasErrors([
        'key' => 'The key must be 2 to 5 letters or digits and start with a letter.',
    ]);
})->with([
    'a single letter' => 'D',
    'six characters' => 'DRIFTS',
    'a leading digit' => '1DD',
    'a hyphen' => 'D-D',
]);

test('projects can be updated', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);

    $response = $this
        ->actingAs($user)
        ->patch(route('projects.update', [$user->currentTeam, $project]), [
            'name' => 'Daily Drift Web',
            'key' => 'DD',
        ]);

    $response->assertSessionHasNoErrors();
    expect($project->fresh()->name)->toBe('Daily Drift Web');
});

test('projects of another team cannot be updated through the current team', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['name' => 'Untouched']);

    $response = $this
        ->actingAs($user)
        ->patch(route('projects.update', [$user->currentTeam, $project]), [
            'name' => 'Hijacked',
            'key' => 'HJ',
        ]);

    $response->assertNotFound();
    expect($project->fresh()->name)->toBe('Untouched');
});

test('owners and admins can delete projects with their issues', function (TeamRole $role) {
    $user = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($user, ['role' => $role->value]);
    $project = Project::factory()->for($team)->create(['name' => 'Old project']);
    $issue = Issue::factory()->for($project)->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('projects.destroy', [$team, $project]));

    $response->assertRedirect(route('projects.index', $team));
    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Project Old project deleted.']);
    $this->assertModelMissing($project);
    $this->assertModelMissing($issue);
})->with([
    'owner' => TeamRole::Owner,
    'admin' => TeamRole::Admin,
]);

test('members cannot delete projects', function () {
    $member = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($member, ['role' => TeamRole::Member->value]);
    $project = Project::factory()->for($team)->create();

    $response = $this
        ->actingAs($member)
        ->delete(route('projects.destroy', [$team, $project]));

    $response->assertForbidden();
    $this->assertModelExists($project);
});
