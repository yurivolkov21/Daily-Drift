<?php

use App\Enums\IssueActivityType;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Enums\TeamRole;
use App\Models\Issue;
use App\Models\Label;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;

test('the issue list holds the token team\'s issues only', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create(['title' => 'Ship the API']);
    Issue::factory()->create(['title' => 'Another team issue']);

    $response = $this->withToken(apiToken($user))->getJson(route('api.v1.issues.index'));

    $response->assertOk();
    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.identifier', 'DD-1');
    $response->assertJsonPath('data.0.title', 'Ship the API');
});

test('the issue list can be narrowed to a project by its key', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    Issue::factory()->for(Project::factory()->for($team)->create(['key' => 'DD']))->create();
    Issue::factory()->for(Project::factory()->for($team)->create(['key' => 'WEB']))->create();

    $response = $this
        ->withToken(apiToken($user))
        ->getJson(route('api.v1.issues.index', ['project' => 'web']));

    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.identifier', 'WEB-1');
});

test('the issue list can be narrowed to several statuses at once', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create(['status' => IssueStatus::Todo]);
    Issue::factory()->for($project)->create(['status' => IssueStatus::InProgress]);
    Issue::factory()->for($project)->create(['status' => IssueStatus::Done]);

    $response = $this
        ->withToken(apiToken($user))
        ->getJson(route('api.v1.issues.index', ['status' => 'todo, in_progress']));

    $response->assertJsonCount(2, 'data');
    expect(collect($response->json('data'))->pluck('identifier')->sort()->values()->all())->toBe(['DD-1', 'DD-2']);
});

test('the issue list can be narrowed to the token owner\'s issues', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create();
    Issue::factory()->for($project)->for($user, 'assignee')->create();

    $response = $this
        ->withToken(apiToken($user))
        ->getJson(route('api.v1.issues.index', ['assignee' => 'me']));

    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.identifier', 'DD-2');
    $response->assertJsonPath('data.0.assignee', ['id' => $user->id, 'name' => $user->name]);
});

test('the issue list rejects unknown filters with 422', function (array $query, string $field, string $message) {
    $user = User::factory()->create();

    $response = $this
        ->withToken(apiToken($user))
        ->getJson(route('api.v1.issues.index', $query));

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors([$field => $message]);
})->with([
    'unknown project' => [['project' => 'NOPE'], 'project', 'The selected project is invalid.'],
    'unknown status' => [['status' => 'todo,shipped'], 'status.1', 'The selected status is invalid.'],
    'someone else' => [['assignee' => 'ada'], 'assignee', 'The selected assignee is invalid.'],
    'too large a page' => [['per_page' => 101], 'per_page', 'The per page field must be between 1 and 100.'],
]);

test('an issue is shown by its identifier', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $label = Label::factory()->for($team)->create(['name' => 'Backend', 'color' => '#5e6ad2']);
    $issue = Issue::factory()
        ->for(Project::factory()->for($team)->create(['key' => 'DD', 'name' => 'Daily Drift']))
        ->create([
            'title' => 'Ship the API',
            'description' => 'Tokens for Claude Code hooks.',
            'status' => IssueStatus::InProgress,
            'priority' => IssuePriority::High,
            'due_date' => '2026-11-15',
        ]);
    $issue->labels()->attach($label);

    $response = $this
        ->withToken(apiToken($user))
        ->getJson(route('api.v1.issues.show', 'dd-1'));

    $response->assertOk();
    $response->assertJson(['data' => [
        'id' => $issue->id,
        'identifier' => 'DD-1',
        'title' => 'Ship the API',
        'description' => 'Tokens for Claude Code hooks.',
        'status' => 'in_progress',
        'priority' => 3,
        'project' => ['key' => 'DD', 'name' => 'Daily Drift'],
        'assignee' => null,
        'labels' => [['id' => $label->id, 'name' => 'Backend', 'color' => '#5e6ad2']],
        'due_date' => '2026-11-15',
        'url' => route('issues.show', [$team, 'DD-1']),
    ]]);
});

test('issues of other teams return 404', function () {
    $user = User::factory()->create();
    Issue::factory()->for(Project::factory()->create(['key' => 'DD']))->create();

    $response = $this
        ->withToken(apiToken($user))
        ->getJson(route('api.v1.issues.show', 'DD-1'));

    $response->assertNotFound();
});

test('issues can be created as the token owner', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $assignee = User::factory()->create();
    $team->members()->attach($assignee, ['role' => TeamRole::Member->value]);
    Project::factory()->for($team)->create(['key' => 'DD']);
    $label = Label::factory()->for($team)->create();

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.issues.store'), [
            'project' => 'dd',
            'title' => 'Report Claude Code sessions',
            'description' => 'Started from a hook.',
            'status' => IssueStatus::Todo->value,
            'priority' => IssuePriority::High->value,
            'assignee_id' => $assignee->id,
            'due_date' => '2026-11-15',
            'label_ids' => [$label->id],
        ]);

    $response->assertCreated();
    $response->assertJsonPath('data.identifier', 'DD-1');
    $response->assertJsonPath('data.assignee', ['id' => $assignee->id, 'name' => $assignee->name]);

    $issue = Issue::query()->sole();

    expect($issue->title)->toBe('Report Claude Code sessions')
        ->and($issue->status)->toBe(IssueStatus::Todo)
        ->and($issue->priority)->toBe(IssuePriority::High)
        ->and($issue->creator_id)->toBe($user->id)
        ->and($issue->labels->modelKeys())->toBe([$label->id]);

    $this->assertDatabaseHas('issue_activities', [
        'issue_id' => $issue->id,
        'user_id' => $user->id,
        'type' => IssueActivityType::Created->value,
    ]);
});

test('issues created without a status or priority start in the backlog with none', function () {
    $user = User::factory()->create();
    Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.issues.store'), [
            'project' => 'DD',
            'title' => 'Report Claude Code sessions',
        ]);

    $response->assertCreated();
    $response->assertJsonPath('data.status', 'backlog');
    $response->assertJsonPath('data.priority', 0);
});

test('creating an issue requires a project and a title', function () {
    $user = User::factory()->create();

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.issues.store'), []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors([
        'project' => 'The project field is required.',
        'title' => 'The title field is required.',
    ]);
});

test('issues cannot be created in another team\'s project or for someone outside the team', function () {
    $user = User::factory()->create();
    Project::factory()->create(['key' => 'DD']);
    $outsider = User::factory()->create();

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.issues.store'), [
            'project' => 'DD',
            'title' => 'Report Claude Code sessions',
            'assignee_id' => $outsider->id,
        ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors([
        'project' => 'The selected project is invalid.',
        'assignee_id' => 'The selected assignee is invalid.',
    ]);

    expect(Issue::query()->count())->toBe(0);
});

test('issues can be changed and the change is recorded as the token owner', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()
        ->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))
        ->create(['status' => IssueStatus::Todo]);

    $response = $this
        ->withToken(apiToken($user))
        ->patchJson(route('api.v1.issues.update', 'DD-1'), ['status' => IssueStatus::InProgress->value]);

    $response->assertOk();
    $response->assertJsonPath('data.status', 'in_progress');

    expect($issue->fresh()->status)->toBe(IssueStatus::InProgress);

    $this->assertDatabaseHas('issue_activities', [
        'issue_id' => $issue->id,
        'user_id' => $user->id,
        'type' => IssueActivityType::StatusChanged->value,
    ]);
});

test('changing an issue rejects an unknown status with 422', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()
        ->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))
        ->create(['status' => IssueStatus::Todo]);

    $response = $this
        ->withToken(apiToken($user))
        ->patchJson(route('api.v1.issues.update', 'DD-1'), ['status' => 'shipped']);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['status' => 'The selected status is invalid.']);

    expect($issue->fresh()->status)->toBe(IssueStatus::Todo);
});

test('changing an issue of another team returns 404', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()
        ->for(Project::factory()->for(Team::factory())->create(['key' => 'DD']))
        ->create(['status' => IssueStatus::Todo]);

    $response = $this
        ->withToken(apiToken($user))
        ->patchJson(route('api.v1.issues.update', 'DD-1'), ['status' => IssueStatus::Done->value]);

    $response->assertNotFound();

    expect($issue->fresh()->status)->toBe(IssueStatus::Todo);
});
