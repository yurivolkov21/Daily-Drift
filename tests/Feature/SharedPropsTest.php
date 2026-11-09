<?php

namespace Tests\Feature;

use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SharedPropsTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_header_and_sidebar_get_the_team_people_and_active_project_count()
    {
        $team = Team::factory()->create();
        $users = User::factory()->count(6)->create();

        foreach ($users as $user) {
            $team->members()->attach($user, ['role' => TeamRole::Member->value]);
        }

        $viewer = $users->first();
        $viewer->switchTeam($team);
        Project::factory()->count(2)->for($team)->create();
        Project::factory()->for($team)->archived()->create();

        $this->actingAs($viewer)
            ->get(route('projects.index', ['current_team' => $team->slug]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeProjectCount', 2)
                ->where('teamPeople.total', 6)
                ->has('teamPeople.names', 4)
                ->where('teamPeople.names.0', $viewer->name)
            );
    }
}
