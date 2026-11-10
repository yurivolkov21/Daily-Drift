import { usePage } from '@inertiajs/react';

/**
 * The viewer's time zone and today's date in it (`Y-m-d`), as the server
 * worked them out (spec 0003): the zone picked under Profile, or else the
 * device's.
 */
export function useLocalTime(): { zone: string; today: string } {
    const { timeZone, today } = usePage().props;

    return { zone: timeZone, today };
}

/** The device's own time zone, such as `Asia/Ho_Chi_Minh`. */
export function deviceTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * The hour of the day (0 to 23) right now in a time zone, or on the device's
 * clock if the browser does not know the zone (older browsers miss recent
 * names such as `Europe/Kyiv`).
 */
export function hourIn(zone: string): number {
    try {
        return Number(
            new Intl.DateTimeFormat('en-GB', {
                hour: 'numeric',
                hourCycle: 'h23',
                timeZone: zone,
            }).format(new Date()),
        );
    } catch {
        return new Date().getHours();
    }
}

/** The local date (`Y-m-d`) of a moment in a time zone. */
export function dayIn(iso: string, zone: string): string {
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(
            new Date(iso),
        );
    } catch {
        return iso.slice(0, 10);
    }
}
