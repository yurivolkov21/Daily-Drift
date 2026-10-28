<?php

use App\Enums\TeamRole;
use App\Models\GithubWebhook;
use App\Models\Team;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('owners can give the team a github webhook and see its url and secret', function () {
    $owner = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);

    $response = $this
        ->actingAs($owner)
        ->from(route('teams.edit', $team))
        ->post(route('teams.github.store', $team));

    $response->assertRedirect(route('teams.edit', $team));
    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'GitHub webhook ready.']);

    $webhook = GithubWebhook::query()->sole();

    expect($webhook->team_id)->toBe($team->id)
        ->and(strlen($webhook->secret))->toBe(40);

    $this
        ->actingAs($owner)
        ->get(route('teams.edit', $team))
        ->assertInertia(fn (Assert $page) => $page
            ->where('github.url', route('webhooks.github', $webhook))
            ->where('github.secret', $webhook->secret)
            ->where('github.lastDeliveryAt', null),
        );
});

test('connecting again makes a new secret but keeps the payload url', function () {
    $owner = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);
    $webhook = GithubWebhook::factory()->for($team)->create();
    $oldSecret = $webhook->secret;

    $this->actingAs($owner)->post(route('teams.github.store', $team));

    $updated = GithubWebhook::query()->sole();

    expect($updated->id)->toBe($webhook->id)
        ->and($updated->secret)->not->toBe($oldSecret);
});

test('members cannot connect github or see the secret', function () {
    $member = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($member, ['role' => TeamRole::Member->value]);
    GithubWebhook::factory()->for($team)->create();

    $this
        ->actingAs($member)
        ->post(route('teams.github.store', $team))
        ->assertForbidden();

    $this
        ->actingAs($member)
        ->get(route('teams.edit', $team))
        ->assertInertia(fn (Assert $page) => $page->where('github', null));
});

test('owners can disconnect github', function () {
    $owner = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);
    $webhook = GithubWebhook::factory()->for($team)->create();

    $response = $this
        ->actingAs($owner)
        ->from(route('teams.edit', $team))
        ->delete(route('teams.github.destroy', $team));

    $response->assertRedirect(route('teams.edit', $team));

    $this->assertModelMissing($webhook);
});

test('deleting a team removes its github webhook', function () {
    $owner = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);
    $webhook = GithubWebhook::factory()->for($team)->create();

    $this
        ->actingAs($owner)
        ->delete(route('teams.destroy', $team), ['name' => $team->name]);

    $this->assertModelMissing($webhook);
});
