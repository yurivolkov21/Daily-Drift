<?php

use App\Enums\TeamRole;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;

test('members can comment on an issue', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $response = $this
        ->actingAs($user)
        ->from(route('issues.show', [$user->currentTeam, 'DD-1']))
        ->post(route('issues.comments.store', [$user->currentTeam, 'DD-1']), [
            'body' => 'Looks good to me.',
        ]);

    $response->assertRedirect(route('issues.show', [$user->currentTeam, 'DD-1']));

    $comment = $issue->comments()->sole();

    expect($comment)
        ->body->toBe('Looks good to me.')
        ->user_id->toBe($user->id);
});

test('comments need a body', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();

    $response = $this
        ->actingAs($user)
        ->post(route('issues.comments.store', [$user->currentTeam, $issue->identifier]), [
            'body' => '',
        ]);

    $response->assertSessionHasErrors(['body' => 'The body field is required.']);
    expect($issue->comments()->count())->toBe(0);
});

test('non members cannot comment on another team\'s issue', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('issues.comments.store', [$issue->project->team, $issue->identifier]), [
            'body' => 'Hello',
        ]);

    $response->assertForbidden();
    expect($issue->comments()->count())->toBe(0);
});

test('authors can edit their comments', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $comment = Comment::factory()->for($issue)->for($user, 'author')->create(['body' => 'Frist']);

    $this
        ->actingAs($user)
        ->patch(route('issues.comments.update', [$user->currentTeam, $issue->identifier, $comment->id]), [
            'body' => 'First',
        ]);

    expect($comment->fresh()->body)->toBe('First');
});

test('teammates cannot edit someone else\'s comment', function () {
    $author = User::factory()->create();
    $teammate = User::factory()->create();
    $team = $author->currentTeam;
    $team->members()->attach($teammate, ['role' => TeamRole::Admin->value]);
    $issue = Issue::factory()->for(Project::factory()->for($team))->create();
    $comment = Comment::factory()->for($issue)->for($author, 'author')->create(['body' => 'Original']);

    $response = $this
        ->actingAs($teammate)
        ->patch(route('issues.comments.update', [$team, $issue->identifier, $comment->id]), [
            'body' => 'Changed',
        ]);

    $response->assertForbidden();
    expect($comment->fresh()->body)->toBe('Original');
});

test('authors can delete their comments', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $comment = Comment::factory()->for($issue)->for($user, 'author')->create();

    $this
        ->actingAs($user)
        ->delete(route('issues.comments.destroy', [$user->currentTeam, $issue->identifier, $comment->id]));

    $this->assertModelMissing($comment);
});

test('teammates cannot delete someone else\'s comment', function () {
    $author = User::factory()->create();
    $teammate = User::factory()->create();
    $team = $author->currentTeam;
    $team->members()->attach($teammate, ['role' => TeamRole::Member->value]);
    $issue = Issue::factory()->for(Project::factory()->for($team))->create();
    $comment = Comment::factory()->for($issue)->for($author, 'author')->create();

    $response = $this
        ->actingAs($teammate)
        ->delete(route('issues.comments.destroy', [$team, $issue->identifier, $comment->id]));

    $response->assertForbidden();
    $this->assertModelExists($comment);
});

test('comments are only found on the issue in the url', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $issue = Issue::factory()->for($project)->create();
    $comment = Comment::factory()->for(Issue::factory()->for($project))->for($user, 'author')->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('issues.comments.destroy', [$user->currentTeam, $issue->identifier, $comment->id]));

    $response->assertNotFound();
    $this->assertModelExists($comment);
});
