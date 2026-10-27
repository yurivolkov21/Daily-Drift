<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\Subtask;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('members can add sub-tasks to the end of an issue\'s list', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();
    Subtask::factory()->for($issue)->create(['title' => 'Write the migration', 'position' => 1]);

    $response = $this
        ->actingAs($user)
        ->from(route('issues.show', [$user->currentTeam, 'DD-1']))
        ->post(route('issues.subtasks.store', [$user->currentTeam, 'DD-1']), [
            'title' => 'Add the endpoints',
        ]);

    $response->assertRedirect(route('issues.show', [$user->currentTeam, 'DD-1']));

    expect($issue->subtasks()->orderBy('position')->pluck('title')->all())
        ->toBe(['Write the migration', 'Add the endpoints']);
});

test('sub-tasks need a title', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();

    $response = $this
        ->actingAs($user)
        ->post(route('issues.subtasks.store', [$user->currentTeam, $issue->identifier]), [
            'title' => '',
        ]);

    $response->assertSessionHasErrors(['title' => 'The title field is required.']);
    expect($issue->subtasks()->count())->toBe(0);
});

test('members can tick a sub-task off and on again', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $subtask = Subtask::factory()->for($issue)->create();

    $this
        ->actingAs($user)
        ->patch(route('issues.subtasks.update', [$user->currentTeam, $issue->identifier, $subtask->id]), [
            'completed' => true,
        ]);

    expect($subtask->fresh()->completed_at)->not->toBeNull();

    $this
        ->actingAs($user)
        ->patch(route('issues.subtasks.update', [$user->currentTeam, $issue->identifier, $subtask->id]), [
            'completed' => false,
        ]);

    expect($subtask->fresh()->completed_at)->toBeNull();
});

test('ticking a done sub-task again keeps when it was finished', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $subtask = Subtask::factory()->for($issue)->create(['completed_at' => now()->subDays(2)]);
    $finishedAt = $subtask->completed_at->toDateTimeString();

    $this
        ->actingAs($user)
        ->patch(route('issues.subtasks.update', [$user->currentTeam, $issue->identifier, $subtask->id]), [
            'completed' => true,
        ]);

    expect($subtask->fresh()->completed_at->toDateTimeString())->toBe($finishedAt);
});

test('members can rename a sub-task without changing whether it is done', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $subtask = Subtask::factory()->for($issue)->completed()->create(['title' => 'Wrtie tests']);

    $this
        ->actingAs($user)
        ->patch(route('issues.subtasks.update', [$user->currentTeam, $issue->identifier, $subtask->id]), [
            'title' => 'Write tests',
        ]);

    expect($subtask->fresh())
        ->title->toBe('Write tests')
        ->completed_at->not->toBeNull();
});

test('members can delete a sub-task', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $subtask = Subtask::factory()->for($issue)->create();

    $this
        ->actingAs($user)
        ->delete(route('issues.subtasks.destroy', [$user->currentTeam, $issue->identifier, $subtask->id]));

    $this->assertModelMissing($subtask);
});

test('non members cannot change another team\'s sub-tasks', function () {
    $user = User::factory()->create();
    $subtask = Subtask::factory()->create(['title' => 'Keep me']);
    $issue = $subtask->issue;
    $team = $issue->project->team;

    $this->actingAs($user)
        ->post(route('issues.subtasks.store', [$team, $issue->identifier]), ['title' => 'Sneaky'])
        ->assertForbidden();
    $this->actingAs($user)
        ->patch(route('issues.subtasks.update', [$team, $issue->identifier, $subtask->id]), ['title' => 'Changed'])
        ->assertForbidden();
    $this->actingAs($user)
        ->delete(route('issues.subtasks.destroy', [$team, $issue->identifier, $subtask->id]))
        ->assertForbidden();

    expect($issue->subtasks()->pluck('title')->all())->toBe(['Keep me']);
});

test('sub-tasks are only found on their own issue', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create();
    $otherIssue = Issue::factory()->for($project)->create();
    $subtask = Subtask::factory()->for($otherIssue)->create(['title' => 'Belongs to DD-2']);

    $response = $this
        ->actingAs($user)
        ->patch(route('issues.subtasks.update', [$user->currentTeam, 'DD-1', $subtask->id]), [
            'title' => 'Moved',
        ]);

    $response->assertNotFound();
    expect($subtask->fresh()->title)->toBe('Belongs to DD-2');
});

test('deleting an issue deletes its sub-tasks', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $subtask = Subtask::factory()->for($issue)->create();

    $this
        ->actingAs($user)
        ->delete(route('issues.destroy', [$user->currentTeam, $issue->identifier]));

    $this->assertModelMissing($subtask);
});

test('the issue page lists sub-tasks in order', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    Subtask::factory()->for($issue)->create(['title' => 'Second', 'position' => 2]);
    Subtask::factory()->for($issue)->completed()->create(['title' => 'First', 'position' => 1]);

    $response = $this
        ->actingAs($user)
        ->get(route('issues.show', [$user->currentTeam, $issue->identifier]));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('issues/show')
        ->has('subtasks', 2)
        ->where('subtasks.0.title', 'First')
        ->where('subtasks.0.completed', true)
        ->where('subtasks.1.title', 'Second')
        ->where('subtasks.1.completed', false),
    );
});

test('the issue list shows how many sub-tasks are done', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    Subtask::factory()->for($issue)->completed()->create();
    Subtask::factory()->count(2)->for($issue)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', $user->currentTeam));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('issues.0.subtasksCount', 3)
        ->where('issues.0.completedSubtasksCount', 1),
    );
});
