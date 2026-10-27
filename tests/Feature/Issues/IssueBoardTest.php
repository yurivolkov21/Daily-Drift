<?php

use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\Subtask;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('moving an issue within its column saves its board position without adding history', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create(['board_position' => 1]);

    $this
        ->actingAs($user)
        ->patch(route('issues.update', [$user->currentTeam, $issue->identifier]), [
            'board_position' => 2.5,
        ]);

    expect($issue->fresh()->board_position)->toBe(2.5);
    expect($issue->activities()->count())->toBe(0);
});

test('board positions must be numbers', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create(['board_position' => 1]);

    $response = $this
        ->actingAs($user)
        ->patch(route('issues.update', [$user->currentTeam, $issue->identifier]), [
            'board_position' => 'top',
        ]);

    $response->assertSessionHasErrors('board_position');
    expect($issue->fresh()->board_position)->toBe(1.0);
});

test('new issues go to the top of their team\'s board', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    Issue::factory()->for($project)->create(['board_position' => 3]);
    Issue::factory()->create(['board_position' => -10]);

    $issue = Issue::factory()->for($project)->create();

    expect($issue->board_position)->toBe(2.0);
});

test('the board gets each issue\'s position and comment count, and no quick view by default', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create(['board_position' => 4.5]);
    Comment::factory()->count(2)->for($issue)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', [$user->currentTeam, 'view' => 'board']));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('issues.0.boardPosition', 4.5)
        ->where('issues.0.commentsCount', 2)
        ->where('peek', null),
    );
});

test('the quick view shows the issue with its sub-tasks', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();
    Subtask::factory()->for($issue)->create(['title' => 'Second', 'position' => 2]);
    Subtask::factory()->for($issue)->completed()->create(['title' => 'First', 'position' => 1]);

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', [$user->currentTeam, 'view' => 'board', 'peek' => 'DD-1']));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('peek.issue.identifier', 'DD-1')
        ->has('peek.subtasks', 2)
        ->where('peek.subtasks.0.title', 'First')
        ->where('peek.subtasks.0.completed', true),
    );
});

test('the quick view does not show another team\'s issue', function () {
    $user = User::factory()->create();
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();
    $otherIssue = Issue::factory()->for(Project::factory()->create(['key' => 'XY']))->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', [$user->currentTeam, 'view' => 'board', 'peek' => $otherIssue->identifier]));

    $response->assertInertia(fn (Assert $page) => $page->where('peek', null));
});
