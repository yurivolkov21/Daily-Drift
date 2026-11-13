<?php

namespace App\Enums;

use Laravel\Socialite\AbstractUser;
use Laravel\Socialite\Contracts\User as ProviderUser;

/**
 * The accounts people can sign in with (spec 0009). A provider is offered
 * only when its client id and secret are set.
 */
enum SocialProvider: string
{
    case Google = 'google';
    case GitHub = 'github';

    public function label(): string
    {
        return match ($this) {
            self::Google => 'Google',
            self::GitHub => 'GitHub',
        };
    }

    public function isConfigured(): bool
    {
        return filled(config("services.{$this->value}.client_id"))
            && filled(config("services.{$this->value}.client_secret"));
    }

    /**
     * Whether the provider vouches for the email it returned: Google says so
     * in `email_verified`; GitHub, asked for `user:email`, returns only the
     * primary, verified address (or none).
     */
    public function emailIsVerified(ProviderUser $user): bool
    {
        if (blank($user->getEmail())) {
            return false;
        }

        return match ($this) {
            self::Google => $user instanceof AbstractUser && ($user->getRaw()['email_verified'] ?? false) === true,
            self::GitHub => true,
        };
    }

    /**
     * The providers the sign-in and sign-up pages offer.
     *
     * @return array<int, array{key: string, label: string}>
     */
    public static function offered(): array
    {
        return collect(self::cases())
            ->filter(fn (self $provider) => $provider->isConfigured())
            ->map(fn (self $provider) => ['key' => $provider->value, 'label' => $provider->label()])
            ->values()
            ->all();
    }
}
