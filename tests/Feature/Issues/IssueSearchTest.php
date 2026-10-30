<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\User;

test('issues can be searched by title', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create(['title' => 'Fix the login redirect']);
    Issue::factory()->for($project)->create(['title' => 'Polish the board view']);

    $response = $this
        ->actingAs($user)
        ->getJson(route('issues.search', ['current_team' => $user->currentTeam, 'query' => 'login']));

    $response->assertOk();
    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.title', 'Fix the login redirect');
});

test('issues can be found by identifier', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->count(2)->create();

    $response = $this
        ->actingAs($user)
        ->getJson(route('issues.search', ['current_team' => $user->currentTeam, 'query' => 'dd-2']));

    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.identifier', 'DD-2');
});

test('percent signs, underscores and exclamation marks are searched as written', function (string $query, string $title) {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    Issue::factory()->for($project)->create(['title' => 'Raise coverage to 80%']);
    Issue::factory()->for($project)->create(['title' => 'Raise coverage to 80 tests']);
    Issue::factory()->for($project)->create(['title' => 'Rename the user_id column']);
    Issue::factory()->for($project)->create(['title' => 'Rename the user id column']);
    Issue::factory()->for($project)->create(['title' => 'Ship it now!']);

    $response = $this
        ->actingAs($user)
        ->getJson(route('issues.search', ['current_team' => $user->currentTeam, 'query' => $query]));

    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.title', $title);
})->with([
    'percent sign' => ['80%', 'Raise coverage to 80%'],
    'underscore' => ['user_id', 'Rename the user_id column'],
    'exclamation mark' => ['now!', 'Ship it now!'],
]);

test('search only returns issues of the current team', function () {
    $user = User::factory()->create();
    Issue::factory()->create(['title' => 'Login page for another team']);

    $response = $this
        ->actingAs($user)
        ->getJson(route('issues.search', ['current_team' => $user->currentTeam, 'query' => 'login']));

    $response->assertJsonCount(0, 'data');
});

test('the most recently updated issues are returned without a query', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    Issue::factory()->for($project)->create(['title' => 'Older', 'updated_at' => now()->subDay()]);
    Issue::factory()->for($project)->create(['title' => 'Newer', 'updated_at' => now()]);

    $response = $this
        ->actingAs($user)
        ->getJson(route('issues.search', $user->currentTeam));

    $response->assertJsonPath('data.0.title', 'Newer');
    $response->assertJsonPath('data.1.title', 'Older');
});
