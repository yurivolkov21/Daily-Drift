<?php

namespace Tests\Feature\Production;

use App\Actions\Fortify\CreateNewUser;
use App\Enums\TeamRole;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Models\Team;
use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * Spec 0012: limits on sign-ups, invitations and every other request.
 */
class RateLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_address_signs_up_5_times_an_hour(): void
    {
        RateLimiter::increment(CreateNewUser::limiterKey('127.0.0.1'), 3600, CreateNewUser::PER_HOUR);

        $this->post(route('register.store'), $this->signUp('sixth@example.com'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'sixth@example.com']);
    }

    public function test_only_sign_ups_that_go_through_count(): void
    {
        $key = CreateNewUser::limiterKey('127.0.0.1');

        $this->post(route('register.store'), [...$this->signUp('typo@example.com'), 'password_confirmation' => 'other'])
            ->assertSessionHasErrors('password');
        $this->assertSame(0, RateLimiter::attempts($key));

        $this->post(route('register.store'), $this->signUp('new@example.com'))->assertSessionHasNoErrors();
        $this->assertAuthenticated();
        $this->assertSame(1, RateLimiter::attempts($key));
    }

    public function test_behind_a_trusted_proxy_the_visitors_address_counts(): void
    {
        config(['trustedproxy.proxies' => '*']);

        $this->withHeader('X-Forwarded-For', '203.0.113.7')
            ->post(route('register.store'), $this->signUp('new@example.com'))
            ->assertSessionHasNoErrors();

        $this->assertSame(1, RateLimiter::attempts(CreateNewUser::limiterKey('203.0.113.7')));
        $this->assertSame(0, RateLimiter::attempts(CreateNewUser::limiterKey('127.0.0.1')));
    }

    public function test_a_team_sends_20_invitations_an_hour(): void
    {
        Notification::fake();

        [$owner, $team] = $this->team();
        [, $other] = $this->team($owner);

        RateLimiter::increment(TeamInvitationController::limiterKey($team), 3600, TeamInvitationController::PER_HOUR);

        $this->actingAs($owner)
            ->post(route('teams.invitations.store', $team), ['email' => 'late@example.com', 'role' => TeamRole::Member->value])
            ->assertSessionHasErrors('email');

        $this->assertDatabaseMissing('team_invitations', ['email' => 'late@example.com']);
        Notification::assertNothingSent();

        // Another team has its own count.
        $this->actingAs($owner)
            ->post(route('teams.invitations.store', $other), ['email' => 'late@example.com', 'role' => TeamRole::Member->value])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, RateLimiter::attempts(TeamInvitationController::limiterKey($other)));
    }

    public function test_every_other_request_is_capped_per_person(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        // The throttle middleware keys a named limit by md5(name.key).
        RateLimiter::increment(md5('global'.$user->id), 60, AppServiceProvider::REQUESTS_PER_MINUTE);

        $this->actingAs($user)->get(route('dashboard', ['current_team' => $user->currentTeam]))->assertTooManyRequests();
        $this->actingAs($other)->get(route('dashboard', ['current_team' => $other->currentTeam]))->assertOk();
    }

    public function test_a_visitor_who_is_signed_out_counts_by_address(): void
    {
        $this->get(route('login'))->assertOk();

        RateLimiter::increment(md5('global127.0.0.1'), 60, AppServiceProvider::REQUESTS_PER_MINUTE);

        $this->get(route('login'))->assertTooManyRequests();
    }

    /**
     * @return array<string, string>
     */
    private function signUp(string $email): array
    {
        return ['name' => 'New Person', 'email' => $email, 'password' => 'password', 'password_confirmation' => 'password'];
    }

    /**
     * @return array{0: User, 1: Team}
     */
    private function team(?User $owner = null): array
    {
        $owner ??= User::factory()->create();
        $team = Team::factory()->create();
        $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);

        return [$owner, $team];
    }
}
