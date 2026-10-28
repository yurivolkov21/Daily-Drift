<?php

use App\Enums\TeamRole;
use App\Enums\TokenAbility;
use App\Models\PersonalAccessToken;
use App\Models\Team;
use App\Models\User;
use Inertia\Support\SessionKey;
use Inertia\Testing\AssertableInertia as Assert;

test('the api tokens page requires password confirmation', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('api-tokens.index'));

    $response->assertRedirect(route('password.confirm'));
});

test('the api tokens page lists the user\'s own tokens, newest first', function () {
    $user = User::factory()->create();
    $team = Team::factory()->create(['name' => 'Daily Drift']);
    $team->members()->attach($user, ['role' => TeamRole::Member->value]);

    $this->freezeSecond();
    $user->createTeamToken($user->currentTeam, 'Status line script', [TokenAbility::Read], now()->addDays(30));
    $user->createTeamToken($team, 'Claude Code on Osiris', [TokenAbility::Read, TokenAbility::Write]);
    User::factory()->create()->createTeamToken($team, 'Someone else', [TokenAbility::Read]);

    $response = $this
        ->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('api-tokens.index'));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('settings/api-tokens')
        ->where('apiUrl', url('/api/v1'))
        ->has('tokens', 2)
        ->where('tokens.0.name', 'Claude Code on Osiris')
        ->where('tokens.0.team', ['id' => $team->id, 'name' => 'Daily Drift'])
        ->where('tokens.0.abilities', ['read', 'write'])
        ->where('tokens.0.expiresAt', null)
        ->where('tokens.1.name', 'Status line script')
        ->where('tokens.1.expiresAt', now()->addDays(30)->toISOString()),
    );
});

test('a new token is shown once and works on the chosen team', function () {
    $user = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($user, ['role' => TeamRole::Member->value]);

    $this->freezeSecond();

    $response = $this
        ->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->from(route('api-tokens.index'))
        ->post(route('api-tokens.store'), [
            'name' => 'Claude Code on Osiris',
            'team_id' => $team->id,
            'access' => 'write',
            'expires_in_days' => 90,
        ]);

    $response->assertRedirect(route('api-tokens.index'));
    $response->assertInertiaFlash('apiToken.plainTextToken');

    $token = PersonalAccessToken::query()->sole();

    expect($token->name)->toBe('Claude Code on Osiris')
        ->and($token->team_id)->toBe($team->id)
        ->and($token->tokenable_id)->toBe($user->id)
        ->and($token->abilities)->toBe(['read', 'write'])
        ->and($token->expires_at?->toISOString())->toBe(now()->addDays(90)->toISOString());

    $plainTextToken = session(SessionKey::FLASH_DATA)['apiToken']['plainTextToken'];

    $this->withToken($plainTextToken)
        ->getJson(route('api.v1.user'))
        ->assertOk()
        ->assertJsonPath('data.team.id', $team->id);
});

test('read-only tokens get only the read ability and no expiry when none is picked', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->post(route('api-tokens.store'), [
            'name' => 'Status line script',
            'team_id' => $user->currentTeam->id,
            'access' => 'read',
            'expires_in_days' => null,
        ]);

    $token = PersonalAccessToken::query()->sole();

    expect($token->abilities)->toBe(['read'])
        ->and($token->expires_at)->toBeNull();
});

test('creating a token rejects a team the user does not belong to and unknown choices', function () {
    $user = User::factory()->create();
    $team = Team::factory()->create();

    $response = $this
        ->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->post(route('api-tokens.store'), [
            'name' => '',
            'team_id' => $team->id,
            'access' => 'admin',
            'expires_in_days' => 7,
        ]);

    $response->assertSessionHasErrors([
        'name' => 'The name field is required.',
        'team_id' => 'Pick one of your teams.',
        'access' => 'The selected access is invalid.',
        'expires_in_days' => 'The selected expiry is invalid.',
    ]);

    expect(PersonalAccessToken::query()->count())->toBe(0);
});

test('tokens can be revoked by their owner', function () {
    $user = User::factory()->create();
    $token = $user->createTeamToken($user->currentTeam, 'Old laptop', [TokenAbility::Read]);

    $response = $this
        ->actingAs($user)
        ->from(route('api-tokens.index'))
        ->delete(route('api-tokens.destroy', $token->accessToken->id));

    $response->assertRedirect(route('api-tokens.index'));
    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Token revoked.']);

    $this->assertModelMissing($token->accessToken);
});

test('revoking someone else\'s token returns 404', function () {
    $user = User::factory()->create();
    $owner = User::factory()->create();
    $token = $owner->createTeamToken($owner->currentTeam, 'Claude Code', [TokenAbility::Read]);

    $response = $this
        ->actingAs($user)
        ->delete(route('api-tokens.destroy', $token->accessToken->id));

    $response->assertNotFound();

    $this->assertModelExists($token->accessToken);
});
