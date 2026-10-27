<?php

use App\Enums\IssueStatus;
use App\Enums\ProjectStatus;
use App\Enums\TeamRole;
use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the projects page lists the team\'s projects with their details and issue counts', function () {
    $user = User::factory()->create();
    $teammate = User::factory()->create();
    $user->currentTeam->members()->attach($teammate, ['role' => TeamRole::Member->value]);
    $project = Project::factory()->for($user->currentTeam)->withStatus(ProjectStatus::InProgress)->create([
        'key' => 'DD',
        'name' => 'Daily Drift',
        'icon' => 'rocket',
        'color' => '#5e6ad2',
        'lead_id' => $user->id,
        'target_date' => '2026-11-30',
    ]);
    Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create(['assignee_id' => $teammate->id]);
    Issue::factory()->for($project)->withStatus(IssueStatus::Done)->create(['assignee_id' => $user->id]);
    Issue::factory()->for($project)->withStatus(IssueStatus::Done)->create(['assignee_id' => $user->id]);
    Issue::factory()->for($project)->withStatus(IssueStatus::Canceled)->create(['assignee_id' => null]);
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
        ->where('projects.0.icon', 'rocket')
        ->where('projects.0.color', '#5e6ad2')
        ->where('projects.0.status', 'in_progress')
        ->where('projects.0.leadId', $user->id)
        ->where('projects.0.targetDate', '2026-11-30')
        ->where('projects.0.issuesCount', 4)
        ->where('projects.0.openIssuesCount', 1)
        ->where('projects.0.completedIssuesCount', 2)
        ->where('projects.0.canceledIssuesCount', 1)
        ->where('projects.0.assigneeIds', [$user->id, $teammate->id])
        ->where('canDeleteProjects', true),
    );
});

test('projects can be created with an icon, a color, a status, a lead and a target date', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('projects.store', $user->currentTeam), [
            'name' => 'Payments API',
            'key' => 'PAY',
            'icon' => 'credit-card',
            'color' => '#12AB7F',
            'status' => 'in_progress',
            'lead_id' => $user->id,
            'target_date' => '2026-12-31',
        ]);

    $response->assertSessionHasNoErrors();
    $project = $user->currentTeam->projects()->sole();
    expect($project->icon)->toBe('credit-card')
        ->and($project->color)->toBe('#12ab7f')
        ->and($project->status)->toBe(ProjectStatus::InProgress)
        ->and($project->lead_id)->toBe($user->id)
        ->and($project->target_date->toDateString())->toBe('2026-12-31');
});

test('new projects start planned with the default icon and color', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->post(route('projects.store', $user->currentTeam), [
            'name' => 'Daily Drift',
            'key' => 'DD',
        ]);

    $project = $user->currentTeam->projects()->sole();
    expect($project->icon)->toBe('box')
        ->and($project->color)->toBe('#5e6ad2')
        ->and($project->status)->toBe(ProjectStatus::Planned)
        ->and($project->lead_id)->toBeNull()
        ->and($project->target_date)->toBeNull();
});

test('a project can be updated one field at a time', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD', 'name' => 'Daily Drift']);

    $response = $this
        ->actingAs($user)
        ->patch(route('projects.update', [$user->currentTeam, $project]), [
            'status' => 'paused',
        ]);

    $response->assertSessionHasNoErrors();
    $project->refresh();
    expect($project->status)->toBe(ProjectStatus::Paused)
        ->and($project->name)->toBe('Daily Drift')
        ->and($project->key)->toBe('DD');
});

test('project details are validated', function (string $field, mixed $value, string $message) {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('projects.store', $user->currentTeam), [
            'name' => 'Daily Drift',
            'key' => 'DD',
            $field => $value,
        ]);

    $response->assertSessionHasErrors([$field => $message]);
})->with([
    'an icon that is not an icon name' => ['icon', 'Rocket Ship', 'The icon must be the name of an icon, like rocket.'],
    'a color that is not a hex color' => ['color', 'blue', 'The color must be a hex color, like #5e6ad2.'],
    'a short hex color' => ['color', '#fff', 'The color must be a hex color, like #5e6ad2.'],
    'an unknown status' => ['status', 'done', 'The selected status is invalid.'],
    'a date that is not a date' => ['target_date', 'someday', 'The target date field must be a valid date.'],
]);

test('the lead must be a member of the team', function () {
    $user = User::factory()->create();
    $outsider = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('projects.store', $user->currentTeam), [
            'name' => 'Daily Drift',
            'key' => 'DD',
            'lead_id' => $outsider->id,
        ]);

    $response->assertSessionHasErrors(['lead_id' => 'The lead must be a member of this team.']);
});

test('a project keeps going without a lead when the lead\'s account is deleted', function () {
    $user = User::factory()->create();
    $lead = User::factory()->create();
    $user->currentTeam->members()->attach($lead, ['role' => TeamRole::Member->value]);
    $project = Project::factory()->for($user->currentTeam)->create(['lead_id' => $lead->id]);

    $lead->delete();

    $this->assertModelExists($project);
    expect($project->fresh()->lead_id)->toBeNull();
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
