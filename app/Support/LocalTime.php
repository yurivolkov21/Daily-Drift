<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeZone;
use Illuminate\Http\Request;

/**
 * The viewer's own day (spec 0003). A person's time zone is the one they
 * picked under Profile, or else their device's, which every page sends in
 * the `timezone` cookie. Without either, the app's time zone (UTC) applies.
 *
 * Timestamps stay in UTC in the database. Only "today", the edges of a day
 * and the start of a week follow the viewer's time zone.
 */
final class LocalTime
{
    public const string COOKIE = 'timezone';

    /** @var array<int, string>|null */
    private static ?array $zones = null;

    public static function zone(?Request $request = null): string
    {
        $request ??= request();

        foreach ([$request->user()?->timezone, $request->cookie(self::COOKIE)] as $zone) {
            if (is_string($zone) && self::isValid($zone)) {
                return $zone;
            }
        }

        return config()->string('app.timezone');
    }

    public static function now(?Request $request = null): CarbonImmutable
    {
        return CarbonImmutable::now(self::zone($request));
    }

    /**
     * Today's date in the viewer's time zone, as `Y-m-d`.
     */
    public static function today(?Request $request = null): string
    {
        return self::now($request)->toDateString();
    }

    /**
     * Any IANA time zone name, old aliases such as `Asia/Saigon` included,
     * since some browsers still report them.
     */
    public static function isValid(string $zone): bool
    {
        self::$zones ??= DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC);

        return in_array($zone, self::$zones, true);
    }
}
