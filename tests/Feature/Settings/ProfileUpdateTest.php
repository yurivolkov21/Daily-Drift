<?php

use App\Actions\Teams\CreateTeam;
use App\Enums\TeamRole;
use App\Enums\TokenAbility;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\PersonalAccessToken;
use App\Models\Project;
use App\Models\User;
use App\Notifications\IssueAssigned;
use Illuminate\Notifications\DatabaseNotification;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('deleting an account deletes the teams it owns with their issues, and its tokens and notifications', function () {
    $user = User::factory()->create();
    $personalTeam = $user->currentTeam;
    $soloTeam = app(CreateTeam::class)->handle($user, 'Side project');

    $issue = Issue::factory()->for(Project::factory()->for($personalTeam))->create();
    Issue::factory()->for(Project::factory()->for($soloTeam))->create();
    $user->createTeamToken($personalTeam, 'Claude Code', [TokenAbility::Read]);
    $user->notify(new IssueAssigned($issue, User::factory()->create()));

    $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertSoftDeleted($personalTeam);
    $this->assertSoftDeleted($soloTeam);

    expect(Project::query()->whereIn('team_id', [$personalTeam->id, $soloTeam->id])->exists())->toBeFalse()
        ->and(Issue::query()->count())->toBe(0)
        ->and(PersonalAccessToken::query()->count())->toBe(0)
        ->and(DatabaseNotification::query()->count())->toBe(0);
});

test('owners of teams with other people cannot delete their account', function () {
    $user = User::factory()->create();
    $team = app(CreateTeam::class)->handle($user, 'Acme');
    $team->members()->attach(User::factory()->create(), ['role' => TeamRole::Member->value]);

    $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ])
        ->assertSessionHasErrors(['teams' => 'Delete these teams or remove their other members first: Acme.'])
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
    $this->assertNotSoftDeleted($team);
});

test('deleting an account leaves the teams it only belongs to, keeping what it wrote there', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $team = app(CreateTeam::class)->handle($owner, 'Acme');
    $team->members()->attach($member, ['role' => TeamRole::Admin->value]);
    $comment = Comment::factory()
        ->for(Issue::factory()->for(Project::factory()->for($team)))
        ->for($member, 'author')
        ->create();

    $this
        ->actingAs($member)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ])
        ->assertSessionHasNoErrors();

    $this->assertNotSoftDeleted($team);
    expect($team->members()->pluck('users.id')->all())->toBe([$owner->id])
        ->and($comment->fresh()->user_id)->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});
