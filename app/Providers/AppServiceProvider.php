<?php

namespace App\Providers;

use App\Ai\Assistant;
use App\Ai\ClaudeAssistant;
use App\Models\Team;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Spec 0012: the requests a person, or an address when signed out, makes
     * in a minute, far above normal use.
     */
    public const int REQUESTS_PER_MINUTE = 240;

    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Spec 0011: Claude for the AI helpers, off without a key.
        $this->app->singleton(Assistant::class, function (): Assistant {
            $setting = fn (string $key): ?string => is_string($value = config($key)) && $value !== '' ? $value : null;

            return new ClaudeAssistant(
                key: $setting('services.anthropic.key'),
                model: $setting('services.anthropic.model') ?? 'claude-opus-5-5',
                baseUrl: $setting('services.anthropic.base_url'),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimits();
    }

    /**
     * Spec 0012: a cap on every page and action. Spec 0011: requests that
     * ask Claude cost money, so each person makes up to 10 a minute and each
     * team up to 100 a day.
     */
    protected function configureRateLimits(): void
    {
        RateLimiter::for('global', fn (Request $request) => Limit::perMinute(self::REQUESTS_PER_MINUTE)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('ai', function (Request $request) {
            // The limit runs before route binding, so the team may still be its slug.
            $team = $request->route('current_team');
            $teamKey = $team instanceof Team ? $team->getKey() : (is_string($team) ? $team : '');

            return [
                Limit::perMinute(10)
                    ->by('ai:user:'.$request->user()?->getAuthIdentifier())
                    ->response(fn (Request $request, array $headers) => response()->json([
                        'message' => __('Too many AI requests. Try again in a minute.'),
                    ], 429, $headers)),
                Limit::perDay(100)
                    ->by('ai:team:'.$teamKey)
                    ->response(fn (Request $request, array $headers) => response()->json([
                        'message' => __('Your team has used today\'s :count AI requests. Try again tomorrow.', ['count' => 100]),
                    ], 429, $headers)),
            ];
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        // Spec 0012: behind Render's proxy, every link uses HTTPS.
        URL::forceHttps(app()->isProduction());

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
