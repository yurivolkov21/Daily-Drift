<?php

use App\Models\Issue;
use App\Models\Label;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the labels settings page lists the current team\'s labels with issue counts', function () {
    $user = User::factory()->create();
    $label = Label::factory()->for($user->currentTeam)->create(['name' => 'Bug', 'color' => '#eb5757']);
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $issue->labels()->attach($label);
    Label::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('labels.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('settings/labels')
        ->where('labels', [
            ['id' => $label->id, 'name' => 'Bug', 'color' => '#eb5757', 'issuesCount' => 1],
        ]),
    );
});

test('labels can be created', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('labels.index'))
        ->post(route('labels.store', $user->currentTeam), [
            'name' => 'Bug',
            'color' => '#eb5757',
        ]);

    $response->assertRedirect(route('labels.index'));
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

test('labels can be renamed and recolored', function () {
    $user = User::factory()->create();
    $label = Label::factory()->for($user->currentTeam)->create(['name' => 'Bug', 'color' => '#eb5757']);

    $response = $this
        ->actingAs($user)
        ->patch(route('labels.update', [$user->currentTeam, $label]), [
            'name' => 'Defect',
            'color' => '#f2994a',
        ]);

    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Label Defect updated.']);
    expect($label->fresh())
        ->name->toBe('Defect')
        ->color->toBe('#f2994a');
});

test('a label can keep its own name when recolored but not take another label\'s name', function () {
    $user = User::factory()->create();
    $label = Label::factory()->for($user->currentTeam)->create(['name' => 'Bug']);
    Label::factory()->for($user->currentTeam)->create(['name' => 'Feature']);

    $this
        ->actingAs($user)
        ->patch(route('labels.update', [$user->currentTeam, $label]), ['name' => 'Bug', 'color' => '#4cb782'])
        ->assertSessionHasNoErrors();

    $this
        ->actingAs($user)
        ->patch(route('labels.update', [$user->currentTeam, $label]), ['name' => 'Feature', 'color' => '#4cb782'])
        ->assertSessionHasErrors(['name' => 'The name has already been taken.']);
});

test('labels of another team cannot be updated through the current team', function () {
    $user = User::factory()->create();
    $label = Label::factory()->create(['name' => 'Untouched']);

    $response = $this
        ->actingAs($user)
        ->patch(route('labels.update', [$user->currentTeam, $label]), [
            'name' => 'Hijacked',
            'color' => '#eb5757',
        ]);

    $response->assertNotFound();
    expect($label->fresh()->name)->toBe('Untouched');
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
