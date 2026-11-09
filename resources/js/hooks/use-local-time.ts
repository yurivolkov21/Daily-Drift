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

/** The hour of the day (0 to 23) right now in a time zone. */
export function hourIn(zone: string): number {
    return Number(
        new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone: zone,
        }).format(new Date()),
    );
}
