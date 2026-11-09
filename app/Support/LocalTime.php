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

    /**
     * Old names that browsers still report (they come from CLDR), with the
     * IANA name each one stands for. Not every PHP build knows the old names,
     * so they are swapped before use.
     */
    private const array ALIASES = [
        'Africa/Asmera' => 'Africa/Asmara',
        'America/Buenos_Aires' => 'America/Argentina/Buenos_Aires',
        'America/Catamarca' => 'America/Argentina/Catamarca',
        'America/Cordoba' => 'America/Argentina/Cordoba',
        'America/Godthab' => 'America/Nuuk',
        'America/Indianapolis' => 'America/Indiana/Indianapolis',
        'America/Jujuy' => 'America/Argentina/Jujuy',
        'America/Louisville' => 'America/Kentucky/Louisville',
        'America/Mendoza' => 'America/Argentina/Mendoza',
        'Asia/Calcutta' => 'Asia/Kolkata',
        'Asia/Katmandu' => 'Asia/Kathmandu',
        'Asia/Rangoon' => 'Asia/Yangon',
        'Asia/Saigon' => 'Asia/Ho_Chi_Minh',
        'Atlantic/Faeroe' => 'Atlantic/Faroe',
        'Europe/Kiev' => 'Europe/Kyiv',
        'Pacific/Enderbury' => 'Pacific/Kanton',
    ];

    /** @var array<int, string>|null */
    private static ?array $known = null;

    public static function zone(?Request $request = null): string
    {
        $request ??= request();

        return self::normalize($request->user()?->timezone)
            ?? self::device($request)
            ?? config()->string('app.timezone');
    }

    /**
     * The device's time zone from the cookie, if it is one PHP knows.
     */
    public static function device(?Request $request = null): ?string
    {
        $cookie = ($request ?? request())->cookie(self::COOKIE);

        return is_string($cookie) ? self::normalize($cookie) : null;
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
     * The IANA name for a time zone, swapping the old names above, or null
     * when PHP does not know it.
     */
    public static function normalize(?string $zone): ?string
    {
        if ($zone === null || $zone === '') {
            return null;
        }

        $zone = self::ALIASES[$zone] ?? $zone;
        self::$known ??= DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC);

        return in_array($zone, self::$known, true) ? $zone : null;
    }

    /**
     * The time zones to pick from: the current IANA names.
     *
     * @return array<int, string>
     */
    public static function choices(): array
    {
        return DateTimeZone::listIdentifiers();
    }
}
