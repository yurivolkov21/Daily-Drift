<?php

namespace App\Actions\Auth;

use App\Actions\Teams\CreateTeam;
use App\Enums\SocialProvider;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as ProviderUser;

/**
 * Sign up with Google or GitHub (spec 0009): the name and email from the
 * provider, the email verified, no password, and a personal team, as signing
 * up with a password gives.
 */
class CreateUserFromProvider
{
    public function __construct(private CreateTeam $createTeam)
    {
        //
    }

    public function handle(SocialProvider $provider, ProviderUser $account): User
    {
        $email = Str::lower((string) $account->getEmail());
        $name = Str::limit(
            trim((string) ($account->getName() ?: $account->getNickname() ?: Str::before($email, '@'))),
            255,
            '',
        );

        return DB::transaction(function () use ($provider, $account, $email, $name) {
            $user = User::create(['name' => $name, 'email' => $email]);
            // The provider confirmed the email (spec 0009).
            $user->markEmailAsVerified();

            $user->socialAccounts()->create([
                'provider' => $provider,
                'provider_user_id' => (string) $account->getId(),
                'email' => $email,
            ]);

            $this->createTeam->handle($user, $user->name."'s Team", isPersonal: true);

            return $user;
        });
    }
}
