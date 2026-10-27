<?php

use App\Models\Issue;
use App\Models\Label;
use App\Models\Project;
use App\Models\User;

test('labels can be created', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('projects.index', $user->currentTeam))
        ->post(route('labels.store', $user->currentTeam), [
            'name' => 'Bug',
            'color' => '#eb5757',
        ]);

    $response->assertRedirect(route('projects.index', $user->currentTeam));
    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Label Bug created.']);
    $this->assertDatabaseHas('labels', [
        'team_id' => $user->currentTeam->id,
        'name' => 'Bug',
        'color' => '#eb5757',
    ]);
});

test('label names must be unique within a team', function () {
    $user = User::factory()->create();
    Label::factory()->for($user->currentTeam)->create(['name' => 'Bug']);

    $response = $this
        ->actingAs($user)
        ->post(route('labels.store', $user->currentTeam), [
            'name' => 'Bug',
            'color' => '#eb5757',
        ]);

    $response->assertSessionHasErrors(['name' => 'The name has already been taken.']);
});

test('label colors must be six digit hex codes', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('labels.store', $user->currentTeam), [
            'name' => 'Bug',
            'color' => 'red',
        ]);

    $response->assertSessionHasErrors(['color' => 'The color field format is invalid.']);
});

test('deleting a label removes it from its issues', function () {
    $user = User::factory()->create();
    $label = Label::factory()->for($user->currentTeam)->create(['name' => 'Bug']);
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $issue->labels()->attach($label);

    $response = $this
        ->actingAs($user)
        ->delete(route('labels.destroy', [$user->currentTeam, $label]));

    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Label Bug deleted.']);
    $this->assertModelMissing($label);
    expect($issue->labels()->count())->toBe(0);
});

test('labels of another team cannot be deleted through the current team', function () {
    $user = User::factory()->create();
    $label = Label::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('labels.destroy', [$user->currentTeam, $label]));

    $response->assertNotFound();
    $this->assertModelExists($label);
});
