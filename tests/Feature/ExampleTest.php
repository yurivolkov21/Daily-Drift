<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_site_root_sends_guests_to_sign_in()
    {
        $this->get(route('home'))->assertRedirect(route('login'));
    }

    public function test_the_site_root_opens_the_current_teams_dashboard()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('home'))
            ->assertRedirect(route('dashboard', ['current_team' => $user->refresh()->currentTeam->slug]));
    }
}
