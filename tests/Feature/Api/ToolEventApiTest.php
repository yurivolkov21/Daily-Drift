<?php

use App\Enums\IssueActivityType;
use App\Enums\IssueStatus;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ToolEvent;
use App\Models\User;

test('an event moves the issue its branch names to in progress', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()
        ->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))
        ->create(['number' => 12, 'status' => IssueStatus::Todo]);

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.events.store'), [
            'tool' => 'codex',
            'event' => 'session_started',
            'branch' => 'dd-12-fix-login-redirect',
        ]);

    $response->assertAccepted();
    $response->assertExactJson(['data' => ['issues' => ['DD-12'], 'started' => ['DD-12']]]);

    expect($issue->fresh()->status)->toBe(IssueStatus::InProgress);

    $this->assertDatabaseHas('issue_activities', [
        'issue_id' => $issue->id,
        'user_id' => $user->id,
        'type' => IssueActivityType::StatusChanged->value,
    ]);

    $event = ToolEvent::query()->sole();

    expect($event->team_id)->toBe($user->currentTeam->id)
        ->and($event->user_id)->toBe($user->id)
        ->and($event->issue_id)->toBe($issue->id)
        ->and($event->tool)->toBe('codex')
        ->and($event->event)->toBe('session_started')
        ->and($event->branch)->toBe('dd-12-fix-login-redirect');
});

test('an event never moves an issue that has already started', function (IssueStatus $status) {
    $user = User::factory()->create();
    $issue = Issue::factory()
        ->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))
        ->create(['number' => 12, 'status' => $status]);

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.events.store'), [
            'tool' => 'claude-code',
            'event' => 'session_started',
            'branch' => 'dd-12-fix-login-redirect',
        ]);

    $response->assertAccepted();
    $response->assertJsonPath('data.started', []);

    expect($issue->fresh()->status)->toBe($status)
        ->and(ToolEvent::query()->sole()->issue_id)->toBe($issue->id);
})->with([
    IssueStatus::InProgress,
    IssueStatus::InReview,
    IssueStatus::Done,
    IssueStatus::Canceled,
]);

test('the issue a report names wins over the one its branch names', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create(['number' => 3, 'status' => IssueStatus::Backlog]);
    $branchIssue = Issue::factory()->for($project)->create(['number' => 12, 'status' => IssueStatus::Backlog]);

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.events.store'), [
            'tool' => 'my-script',
            'event' => 'working',
            'branch' => 'dd-12-fix-login-redirect',
            'issue' => 'dd-3',
        ]);

    $response->assertExactJson(['data' => ['issues' => ['DD-3'], 'started' => ['DD-3']]]);

    expect($branchIssue->fresh()->status)->toBe(IssueStatus::Backlog);
});

test('events about no issue are kept without moving anything', function () {
    $user = User::factory()->create();

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.events.store'), [
            'tool' => 'git',
            'event' => 'branch_switched',
            'branch' => 'main',
        ]);

    $response->assertAccepted();
    $response->assertExactJson(['data' => ['issues' => [], 'started' => []]]);

    expect(ToolEvent::query()->sole()->issue_id)->toBeNull();
});

test('events only reach the issues of the token\'s team', function () {
    $user = User::factory()->create();
    $otherIssue = Issue::factory()
        ->for(Project::factory()->create(['key' => 'DD']))
        ->create(['number' => 12, 'status' => IssueStatus::Todo]);

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.events.store'), [
            'tool' => 'codex',
            'event' => 'session_started',
            'branch' => 'dd-12-fix-login-redirect',
        ]);

    $response->assertJsonPath('data.issues', []);

    expect($otherIssue->fresh()->status)->toBe(IssueStatus::Todo);
});

test('events need a tool and an event with short names, and a well-formed issue', function () {
    $user = User::factory()->create();

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.events.store'), [
            'tool' => 'claude code',
            'issue' => 'twelve',
        ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors([
        'tool' => 'The tool must be a short name, like claude-code.',
        'event' => 'The event field is required.',
        'issue' => 'The issue must be an identifier, like DD-12.',
    ]);

    expect(ToolEvent::query()->count())->toBe(0);
});
