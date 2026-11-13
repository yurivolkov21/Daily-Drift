<?php

namespace App\Http\Controllers\Settings;

use App\Enums\SocialProvider;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class SecurityController extends Controller
{
    /**
     * Show the user's security settings page.
     */
    public function edit(TwoFactorAuthenticationRequest $request): Response
    {
        $props = [
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
            'canManagePasskeys' => Features::canManagePasskeys(),
            'passkeys' => Features::canManagePasskeys()
                ? $request->user()
                    ->passkeys()
                    ->select(['id', 'name', 'credential', 'created_at', 'last_used_at'])
                    ->latest()
                    ->get()
                    ->map(fn ($passkey) => [
                        'id' => $passkey->id,
                        'name' => $passkey->name,
                        'authenticator' => $passkey->authenticator,
                        'created_at_diff' => $passkey->created_at->diffForHumans(),
                        'last_used_at_diff' => $passkey->last_used_at?->diffForHumans(),
                    ])
                    ->values()
                    ->all()
                : [],
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            // Spec 0009: an account made with Google or GitHub sets its first password here.
            'hasPassword' => $request->user()->hasPassword(),
            'connectedAccounts' => $this->connectedAccounts($request->user()),
            'signInMethods' => $request->user()->signInMethods(),
        ];

        if (Features::canManageTwoFactorAuthentication()) {
            $request->ensureStateIsValid();

            $props['twoFactorEnabled'] = $request->user()->hasEnabledTwoFactorAuthentication();
            $props['requiresConfirmation'] = Features::optionEnabled(Features::twoFactorAuthentication(), 'confirm');
        }

        return Inertia::render('settings/security', $props);
    }

    /**
     * Google and GitHub, connected or offered (spec 0009). A provider without
     * credentials is listed only while an account is still connected to it.
     *
     * @return array<int, array{provider: string, label: string, email: string|null, connectedAt: string|null, canConnect: bool}>
     */
    private function connectedAccounts(User $user): array
    {
        $accounts = $user->socialAccounts()->get()->keyBy(fn (SocialAccount $account) => $account->provider->value);

        return collect(SocialProvider::cases())
            ->filter(fn (SocialProvider $provider) => $provider->isConfigured() || $accounts->has($provider->value))
            ->map(function (SocialProvider $provider) use ($accounts) {
                $account = $accounts->get($provider->value);

                return [
                    'provider' => $provider->value,
                    'label' => $provider->label(),
                    'email' => $account?->email,
                    'connectedAt' => $account?->created_at?->toIso8601String(),
                    'canConnect' => $provider->isConfigured(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Update the user's password, or set the first one of an account made
     * with Google or GitHub.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $first = ! $request->user()->hasPassword();

        $request->user()->update([
            'password' => $request->password,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => $first ? __('Password set. You can sign in with your email too.') : __('Password updated.')]);

        return back();
    }
}
