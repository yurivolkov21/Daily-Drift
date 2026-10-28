<?php

use App\Enums\TeamRole;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Notifications\MentionedInComment;
use Illuminate\Support\Facades\Notification;

test('comments can be added as the token owner', function () {
    $user = User::factory()->create(['name' => 'Ada Lovelace']);
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.issues.comments.store', 'DD-1'), [
            'body' => 'Claude Code finished the session.',
        ]);

    $response->assertCreated();
    $response->assertJsonPath('data.body', 'Claude Code finished the session.');
    $response->assertJsonPath('data.author', ['id' => $user->id, 'name' => 'Ada Lovelace']);

    $this->assertDatabaseHas('comments', [
        'issue_id' => $issue->id,
        'user_id' => $user->id,
        'body' => 'Claude Code finished the session.',
    ]);
});

test('members mentioned in a comment from the api are notified', function () {
    Notification::fake();

    $user = User::factory()->create();
    $teammate = User::factory()->create(['name' => 'Grace Hopper']);
    $user->currentTeam->members()->attach($teammate, ['role' => TeamRole::Member->value]);
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.issues.comments.store', 'DD-1'), [
            'body' => "@[Grace Hopper](user:{$teammate->id}) the tests pass now.",
        ]);

    Notification::assertSentTo($teammate, MentionedInComment::class);
});

test('comments on issues of other teams return 404', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->create(['key' => 'DD']))->create();

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.issues.comments.store', 'DD-1'), [
            'body' => 'Claude Code finished the session.',
        ]);

    $response->assertNotFound();

    expect($issue->comments()->count())->toBe(0);
});

test('empty comments are rejected with 422', function () {
    $user = User::factory()->create();
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $response = $this
        ->withToken(apiToken($user))
        ->postJson(route('api.v1.issues.comments.store', 'DD-1'), ['body' => '']);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['body' => 'The body field is required.']);
});
