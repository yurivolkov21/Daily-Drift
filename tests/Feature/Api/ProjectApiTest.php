<?php

use App\Models\Project;
use App\Models\User;

test('the project list holds the token team\'s projects by name', function () {
    $user = User::factory()->create();
    Project::factory()->for($user->currentTeam)->create(['key' => 'WEB', 'name' => 'Website']);
    Project::factory()->for($user->currentTeam)->create(['key' => 'DD', 'name' => 'Daily Drift']);
    Project::factory()->create(['key' => 'OPS', 'name' => 'Another team project']);

    $response = $this->withToken(apiToken($user))->getJson(route('api.v1.projects.index'));

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('key')->all())->toBe(['DD', 'WEB']);
});
