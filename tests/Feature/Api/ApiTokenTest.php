<?php

use App\Enums\IssueStatus;
use App\Enums\TeamRole;
use App\Enums\TokenAbility;
use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;

test('requests without a token get 401', function () {
    $response = $this->getJson(route('api.v1.user'));

    $response->assertUnauthorized();
});

test('a signed-in browser session gets 401 without a token', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson(route('api.v1.user'));

    $response->assertUnauthorized();
});

test('a token shows who it acts as, on which team and what it may do', function () {
    $user = User::factory()->create(['name' => 'Ada Lovelace', 'email' => 'ada@example.com']);
    $team = $user->currentTeam;

    $response = $this
        ->withToken(apiToken($user, [TokenAbility::Read]))
        ->getJson(route('api.v1.user'));

    $response->assertOk();
    $response->assertExactJson([
        'data' => [
            'user' => ['id' => $user->id, 'name' => 'Ada Lovelace', 'email' => 'ada@example.com'],
            'team' => ['id' => $team->id, 'name' => $team->name, 'slug' => $team->slug],
            'token' => ['name' => 'Claude Code', 'abilities' => ['read'], 'expires_at' => null],
        ],
    ]);
});

test('expired tokens get 401', function () {
    $user = User::factory()->create();
    $token = $user->createTeamToken($user->currentTeam, 'Claude Code', [TokenAbility::Read], now()->subMinute());

    $response = $this->withToken($token->plainTextToken)->getJson(route('api.v1.user'));

    $response->assertUnauthorized();
});

test('a token gets 401 once its owner is no longer a member of its team', function () {
    $user = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($user, ['role' => TeamRole::Member->value]);
    $token = apiToken($user, team: $team);

    $team->memberships()->where('user_id', $user->id)->delete();

    $response = $this->withToken($token)->getJson(route('api.v1.user'));

    $response->assertUnauthorized();
});

test('read tokens get 403 when they try to change an issue', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()
        ->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))
        ->create(['status' => IssueStatus::Todo]);

    $response = $this
        ->withToken(apiToken($user, [TokenAbility::Read]))
        ->patchJson(route('api.v1.issues.update', 'DD-1'), ['status' => IssueStatus::Done->value]);

    $response->assertForbidden();

    expect($issue->fresh()->status)->toBe(IssueStatus::Todo);
});
