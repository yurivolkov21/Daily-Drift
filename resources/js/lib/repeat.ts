import { addDays, format, getDaysInMonth, isWeekend, parseISO } from 'date-fns';
import type { RepeatRule, RepeatUnit } from '@/types';

/** The most units a custom rule may skip (spec 0010). */
export const MAX_EVERY = 30;

const ordinal = (n: number): string => {
    const tens = n % 100;

    if (tens >= 11 && tens <= 13) {
        return `${n}th`;
    }

    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

/**
 * A rule in words, with the weekday and day taken from the due date:
 * "Every 2 weeks on Thursday", "Every month on the 13th".
 */
export function ruleText(
    rule: RepeatRule | null,
    dueOn: string | null,
): string {
    if (!rule) {
        return 'Does not repeat';
    }

    const due = dueOn ? parseISO(dueOn) : null;
    const n = rule.every;
    const every = n === 1 ? 'Every' : `Every ${n}`;

    switch (rule.unit) {
        case 'day':
            return n === 1 ? 'Every day' : `Every ${n} days`;
        case 'weekday':
            return 'Every weekday';
        case 'week':
            return `${every} ${plural(n, 'week')}${due ? ` on ${format(due, 'EEEE')}` : ''}`;
        case 'month':
            return `${every} ${plural(n, 'month')}${due ? ` on the ${ordinal(due.getDate())}` : ''}`;
        case 'year':
            return `${every} ${plural(n, 'year')}${due ? ` on ${format(due, 'd MMMM')}` : ''}`;
    }
}

/** A short form for the history: "every 2 weeks". */
export function ruleShort(rule: { unit: string; every: number }): string {
    if (rule.unit === 'weekday') {
        return 'every weekday';
    }

    return rule.every === 1
        ? `every ${rule.unit}`
        : `every ${rule.every} ${rule.unit}s`;
}

export type RepeatPreset = {
    key: string;
    rule: RepeatRule | null;
};

/** The menu's ready-made rules, before Custom. */
export const PRESETS: RepeatPreset[] = [
    { key: 'none', rule: null },
    { key: 'day', rule: { unit: 'day', every: 1 } },
    { key: 'weekday', rule: { unit: 'weekday', every: 1 } },
    { key: 'week', rule: { unit: 'week', every: 1 } },
    { key: 'week2', rule: { unit: 'week', every: 2 } },
    { key: 'month', rule: { unit: 'month', every: 1 } },
    { key: 'year', rule: { unit: 'year', every: 1 } },
];

export const sameRule = (a: RepeatRule | null, b: RepeatRule | null) =>
    a === b ||
    (a !== null && b !== null && a.unit === b.unit && a.every === b.every);

/** The preset a rule matches, or `custom`. */
export const presetKey = (rule: RepeatRule | null): string =>
    PRESETS.find((preset) => sameRule(preset.rule, rule))?.key ?? 'custom';

export const CUSTOM_UNITS: {
    unit: Exclude<RepeatUnit, 'weekday'>;
    label: string;
}[] = [
    { unit: 'day', label: 'Days' },
    { unit: 'week', label: 'Weeks' },
    { unit: 'month', label: 'Months' },
    { unit: 'year', label: 'Years' },
];

const ymd = (date: Date) => format(date, 'yyyy-MM-dd');

function onDay(year: number, month: number, day: number): Date {
    return new Date(
        year,
        month,
        Math.min(day, getDaysInMonth(new Date(year, month, 1))),
    );
}

/** One step on the schedule; months and years keep the anchor's day. */
function step(date: Date, rule: RepeatRule, anchor: Date): Date {
    const n = rule.every;

    switch (rule.unit) {
        case 'day':
            return addDays(date, n);
        case 'weekday': {
            let next = addDays(date, 1);

            while (isWeekend(next)) {
                next = addDays(next, 1);
            }

            return next;
        }
        case 'week':
            return addDays(date, 7 * n);
        case 'month': {
            const months = date.getMonth() + n;

            return onDay(
                date.getFullYear() + Math.floor(months / 12),
                months % 12,
                anchor.getDate(),
            );
        }
        case 'year':
            return onDay(
                date.getFullYear() + n,
                anchor.getMonth(),
                anchor.getDate(),
            );
    }
}

/**
 * The next occurrence's due date, as the server works it out: the first
 * date on the schedule after the old one that is not already past.
 */
export function nextDue(
    dueOn: string,
    rule: RepeatRule,
    today: string,
    anchorOn: string = dueOn,
): string {
    const anchor = parseISO(anchorOn);
    let next = step(parseISO(dueOn), rule, anchor);

    while (ymd(next) < today) {
        next = step(next, rule, anchor);
    }

    return ymd(next);
}
