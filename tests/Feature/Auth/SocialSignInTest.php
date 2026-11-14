<?php

namespace Tests\Feature\Auth;

use App\Enums\SocialProvider;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as ProviderUser;
use Mockery;
use RuntimeException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Tests\TestCase;

/**
 * Spec 0009: sign in, sign up and connect with Google and GitHub. The
 * providers are faked; nothing goes over the network.
 */
class SocialSignInTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.google.client_id' => 'google-id',
            'services.google.client_secret' => 'google-secret',
            'services.github.client_id' => 'github-id',
            'services.github.client_secret' => 'github-secret',
        ]);
    }

    /**
     * @param  array<string, mixed>  $raw
     */
    private function fake(string $provider, string $id, ?string $email, string $name = 'Minh An', array $raw = []): void
    {
        $user = (new ProviderUser)->setRaw($raw + ['email_verified' => true])->map([
            'id' => $id,
            'name' => $name,
            'nickname' => 'minhan',
            'email' => $email,
        ]);

        $driver = Mockery::mock(Provider::class);
        $driver->shouldReceive('user')->andReturn($user);
        Socialite::shouldReceive('driver')->once()->with($provider)->andReturn($driver);
    }

    private function comeBack(string $provider = 'google', array $query = []): TestResponse
    {
        return $this->get(route('social.callback', ['provider' => $provider, ...$query]));
    }

    public function test_the_pages_offer_only_configured_providers_and_the_routes_hide_the_others()
    {
        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('socialProviders', [
            ['key' => 'google', 'label' => 'Google'],
            ['key' => 'github', 'label' => 'GitHub'],
        ]));

        config(['services.github.client_secret' => null]);

        $this->get(route('register'))->assertInertia(fn (Assert $page) => $page->where('socialProviders', [['key' => 'google', 'label' => 'Google']]));
        $this->get(route('social.redirect', ['provider' => 'github']))->assertNotFound();
        $this->get(route('social.callback', ['provider' => 'github']))->assertNotFound();
        $this->get('/auth/gitlab/redirect')->assertNotFound();
    }

    public function test_the_redirect_goes_to_the_provider()
    {
        $driver = Mockery::mock(Provider::class);
        $driver->shouldReceive('redirect')->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

        $this->get(route('social.redirect', ['provider' => 'google']))
            ->assertRedirect('https://accounts.google.com/o/oauth2/auth')
            ->assertSessionHas('social.intent', 'login');
    }

    public function test_a_new_provider_account_signs_up_with_a_verified_email_no_password_and_a_personal_team()
    {
        $this->fake('github', '4242', 'Minh.An@Example.com', 'Minh An');

        $response = $this->comeBack('github');

        $user = User::query()->sole();
        $response->assertRedirect(route('dashboard', ['current_team' => $user->currentTeam->slug]));
        $this->assertAuthenticatedAs($user);
        $this->assertSame(['Minh An', 'minh.an@example.com'], [$user->name, $user->email]);
        $this->assertNull($user->password);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertSame("Minh An's Team", $user->currentTeam?->name);
        $this->assertSame([['github', '4242']], $user->socialAccounts()->get()->map(fn (SocialAccount $a) => [$a->provider->value, $a->provider_user_id])->all());
    }

    public function test_a_connected_account_signs_its_person_in()
    {
        $user = User::factory()->create(['email' => 'giang@example.com']);
        $user->socialAccounts()->create(['provider' => SocialProvider::Google, 'provider_user_id' => 'g-1', 'email' => 'old@example.com']);
        $this->fake('google', 'g-1', 'giang@gmail.com');

        $this->comeBack()->assertRedirect(route('dashboard', ['current_team' => $user->refresh()->currentTeam->slug]));

        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, User::query()->count());
        $this->assertSame('giang@gmail.com', $user->socialAccounts()->sole()->email);
    }

    public function test_a_verified_email_that_already_has_an_account_is_connected()
    {
        $user = User::factory()->unverified()->create(['email' => 'giang@example.com']);
        $this->fake('google', 'g-2', 'GIANG@example.com');

        $this->comeBack()->assertRedirect(route('dashboard', ['current_team' => $user->refresh()->currentTeam->slug]));

        $this->assertAuthenticatedAs($user);
        $this->assertSame('g-2', $user->socialAccounts()->sole()->provider_user_id);
        $this->assertTrue($user->refresh()->hasVerifiedEmail());
    }

    public function test_an_unconfirmed_email_never_reaches_an_existing_account()
    {
        User::factory()->create(['email' => 'giang@example.com']);
        $this->fake('google', 'g-3', 'giang@example.com', raw: ['email_verified' => false]);

        $this->comeBack()->assertRedirect(route('login'))->assertSessionHas('socialError', fn (string $m) => str_contains($m, 'Sign in with your password, then connect Google'));

        $this->assertGuest();
        $this->assertSame(0, SocialAccount::query()->count());
    }

    public function test_no_verified_email_creates_nothing()
    {
        $this->fake('github', '77', null);

        $this->comeBack('github')->assertRedirect(route('login'))->assertSessionHas('socialError', fn (string $m) => str_contains($m, 'did not share a verified email'));

        $this->assertGuest();
        $this->assertSame(0, User::query()->count());
    }

    public function test_two_factor_authentication_still_asks_for_a_code()
    {
        $user = User::factory()->withTwoFactor()->create();
        $user->socialAccounts()->create(['provider' => SocialProvider::GitHub, 'provider_user_id' => '9', 'email' => $user->email]);
        $this->fake('github', '9', $user->email);

        $this->comeBack('github')->assertRedirect(route('two-factor.login'))->assertSessionHas('login.id', $user->id);

        $this->assertGuest();
    }

    public function test_a_cancelled_or_failed_sign_in_creates_nothing_and_says_why()
    {
        $this->comeBack('github', ['error' => 'access_denied'])
            ->assertRedirect(route('login'))
            ->assertSessionHas('socialError', 'Sign in with GitHub was cancelled. Try again, or use your email and password.');

        $driver = Mockery::mock(Provider::class);
        $driver->shouldReceive('user')->andThrow(new RuntimeException('Invalid state'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

        $this->comeBack()->assertSessionHas('socialError', 'Google could not sign you in just now. Try again in a moment.');

        $this->assertGuest();
        $this->assertSame(0, User::query()->count());
        // The sign-in page says why once.
        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('socialError', 'Google could not sign you in just now. Try again in a moment.'));
        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('socialError', null));
    }

    public function test_a_signed_in_person_connects_an_account_once_and_only_their_own()
    {
        $me = User::factory()->create();
        $someone = User::factory()->create();
        $someone->socialAccounts()->create(['provider' => SocialProvider::GitHub, 'provider_user_id' => 'taken', 'email' => 'x@example.com']);

        $this->fake('github', 'taken', 'x@example.com');
        $this->actingAs($me)->withSession(['social.intent' => 'connect'])->comeBack('github')->assertRedirect(route('security.edit'));
        $this->assertSame(0, $me->socialAccounts()->count());

        $this->fake('github', 'mine', 'me@example.com');
        $this->actingAs($me)->withSession(['social.intent' => 'connect'])->comeBack('github')->assertRedirect(route('security.edit'));
        $this->assertSame(['mine'], $me->socialAccounts()->pluck('provider_user_id')->all());

        $this->fake('github', 'second', 'me2@example.com');
        $this->actingAs($me)->withSession(['social.intent' => 'connect'])->comeBack('github');
        $this->assertSame(['mine'], $me->socialAccounts()->pluck('provider_user_id')->all());
    }

    public function test_disconnecting_keeps_one_way_to_sign_in()
    {
        $user = User::factory()->create(['password' => null]);
        $user->socialAccounts()->create(['provider' => SocialProvider::Google, 'provider_user_id' => 'g', 'email' => $user->email]);

        $this->actingAs($user)->delete(route('connected-accounts.destroy', ['provider' => 'google']))->assertRedirect();
        $this->assertSame(1, $user->socialAccounts()->count());

        $user->socialAccounts()->create(['provider' => SocialProvider::GitHub, 'provider_user_id' => 'h', 'email' => $user->email]);
        $this->actingAs($user)->delete(route('connected-accounts.destroy', ['provider' => 'google']))->assertRedirect();
        $this->assertSame(['github'], $user->socialAccounts()->get()->map(fn (SocialAccount $a) => $a->provider->value)->all());

        $this->actingAs($user)->delete(route('connected-accounts.destroy', ['provider' => 'google']))->assertNotFound();
    }

    public function test_an_account_without_a_password_sets_one_and_reaches_security_without_confirming()
    {
        $user = User::factory()->create(['password' => null]);
        $user->socialAccounts()->create(['provider' => SocialProvider::Google, 'provider_user_id' => 'g', 'email' => $user->email]);

        $this->actingAs($user)->get(route('security.edit'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('hasPassword', false)
            ->where('signInMethods', 1)
            ->where('connectedAccounts.0.provider', 'google')
            ->where('connectedAccounts.0.email', $user->email)
            ->where('connectedAccounts.1', ['provider' => 'github', 'label' => 'GitHub', 'email' => null, 'connectedAt' => null, 'canConnect' => true]));

        $this->actingAs($user)->put(route('user-password.update'), ['password' => 'a-new-Passw0rd!', 'password_confirmation' => 'a-new-Passw0rd!'])->assertSessionHasNoErrors();
        $this->assertTrue($user->refresh()->hasPassword());

        // From now on the current password is asked, and the page asks to confirm it.
        $this->actingAs($user)->put(route('user-password.update'), ['password' => 'another-Passw0rd!', 'password_confirmation' => 'another-Passw0rd!'])->assertSessionHasErrors('current_password');
        $this->actingAs($user)->get(route('security.edit'))->assertRedirect(route('password.confirm'));
    }

    public function test_a_password_never_signs_in_an_account_that_has_none()
    {
        $user = User::factory()->create(['password' => null]);

        $this->post(route('login.store'), ['email' => $user->email, 'password' => ''])->assertSessionHasErrors();
        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'anything'])->assertSessionHasErrors();

        $this->assertGuest();
    }
}
