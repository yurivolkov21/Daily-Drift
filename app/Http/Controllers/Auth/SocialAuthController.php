<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\CreateUserFromProvider;
use App\Enums\SocialProvider;
use App\Http\Controllers\Controller;
use App\Http\Responses\Concerns\RedirectsToCurrentTeam;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;
use Laravel\Socialite\Contracts\User as ProviderUser;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;
use Throwable;

/**
 * Sign in, sign up or connect with Google or GitHub (spec 0009).
 */
class SocialAuthController extends Controller
{
    use RedirectsToCurrentTeam;

    /**
     * Send the browser to the provider: to sign in when signed out, to
     * connect the account when signed in.
     */
    public function redirect(Request $request, SocialProvider $provider): SymfonyRedirect
    {
        abort_unless($provider->isConfigured(), 404);

        $request->session()->put('social.intent', $request->user() ? 'connect' : 'login');

        return Socialite::driver($provider->value)->redirect();
    }

    /**
     * Come back from the provider.
     */
    public function callback(Request $request, SocialProvider $provider, CreateUserFromProvider $createUser): RedirectResponse
    {
        abort_unless($provider->isConfigured(), 404);

        $connecting = $request->session()->pull('social.intent') === 'connect' && $request->user() !== null;

        if ($request->filled('error')) {
            return $this->refuse($provider, __('Sign in with :provider was cancelled. Try again, or use your email and password.', ['provider' => $provider->label()]), $connecting);
        }

        try {
            $account = Socialite::driver($provider->value)->user();
        } catch (Throwable $exception) {
            report($exception);

            return $this->refuse($provider, __(':provider could not sign you in just now. Try again in a moment.', ['provider' => $provider->label()]), $connecting);
        }

        return $connecting
            ? $this->connect($request->user(), $provider, $account)
            : $this->signIn($request, $provider, $account, $createUser);
    }

    private function signIn(Request $request, SocialProvider $provider, ProviderUser $account, CreateUserFromProvider $createUser): RedirectResponse
    {
        $linked = $this->linked($provider, $account);

        if ($linked) {
            $linked->update(['email' => $account->getEmail() ?? $linked->email]);

            return $this->login($request, $linked->user);
        }

        $email = $account->getEmail();

        if (! $provider->emailIsVerified($account)) {
            $known = filled($email) && $this->userWithEmail((string) $email) !== null;

            return $this->refuse($provider, $known
                ? __('That email already has an account here, and :provider could not confirm it. Sign in with your password, then connect :provider from Settings.', ['provider' => $provider->label()])
                : __(':provider did not share a verified email, so no account was made. Verify your email with :provider, or sign up with your email.', ['provider' => $provider->label()]), false);
        }

        $user = $this->userWithEmail((string) $email);

        if ($user === null) {
            return $this->login($request, $createUser->handle($provider, $account));
        }

        // A verified email that already has an account: connect it (decision 1).
        if ($user->socialAccounts()->where('provider', $provider)->exists()) {
            return $this->refuse($provider, __('Your account is connected to another :provider account. Sign in with that one, or with your password.', ['provider' => $provider->label()]), false);
        }

        $user->socialAccounts()->create([
            'provider' => $provider,
            'provider_user_id' => (string) $account->getId(),
            'email' => $email,
        ]);

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return $this->login($request, $user);
    }

    private function connect(User $user, SocialProvider $provider, ProviderUser $account): RedirectResponse
    {
        $linked = $this->linked($provider, $account);

        $message = match (true) {
            $linked !== null && $linked->user_id !== $user->id => __('That :provider account is connected to someone else here.', ['provider' => $provider->label()]),
            $linked !== null => __(':provider is already connected.', ['provider' => $provider->label()]),
            $user->socialAccounts()->where('provider', $provider)->exists() => __('Disconnect your :provider account first, then connect another one.', ['provider' => $provider->label()]),
            default => null,
        };

        if ($message !== null) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $message]);

            return to_route('security.edit');
        }

        $user->socialAccounts()->create([
            'provider' => $provider,
            'provider_user_id' => (string) $account->getId(),
            'email' => $account->getEmail(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':provider connected. You can sign in with it now.', ['provider' => $provider->label()])]);

        return to_route('security.edit');
    }

    /**
     * Sign the person in, through the two-factor challenge when they turned
     * it on, as after a password.
     */
    private function login(Request $request, User $user): RedirectResponse
    {
        if ($user->hasEnabledTwoFactorAuthentication()) {
            $request->session()->put(['login.id' => $user->getKey(), 'login.remember' => true]);

            return to_route('two-factor.login');
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        // As after a password: the current team's dashboard, unless a page
        // such as an invitation was asked for first.
        return redirect()->intended($this->redirectPathForCurrentTeam($request, Fortify::redirects('login')));
    }

    private function userWithEmail(string $email): ?User
    {
        return User::query()->whereRaw('lower(email) = ?', [Str::lower($email)])->first();
    }

    private function linked(SocialProvider $provider, ProviderUser $account): ?SocialAccount
    {
        return SocialAccount::query()
            ->where('provider', $provider)
            ->where('provider_user_id', (string) $account->getId())
            ->first();
    }

    private function refuse(SocialProvider $provider, string $message, bool $connecting): RedirectResponse
    {
        if ($connecting) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $message]);

            return to_route('security.edit');
        }

        return to_route('login')->with('socialError', $message);
    }
}
