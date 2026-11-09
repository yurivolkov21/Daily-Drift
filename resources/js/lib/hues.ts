/**
 * The color palette shared by projects and lists (`App\Enums\Hue`).
 *
 * Every class is written out in full so Tailwind keeps it. The design is a
 * provisional first pass (docs/design), so change the look here, in one place.
 */
export const HUE_NAMES = [
    'slate',
    'red',
    'orange',
    'amber',
    'green',
    'teal',
    'blue',
    'indigo',
    'violet',
    'pink',
] as const;

export type Hue = (typeof HUE_NAMES)[number];

type HueClasses = {
    label: string;
    /** Solid swatch or dot. */
    dot: string;
    /** Soft tile with colored text, for icons and initials. */
    tile: string;
    /** Tinted Kanban column. */
    column: string;
    /** Soft pill with colored text. */
    pill: string;
    /** Solid progress fill. */
    bar: string;
    /** Gradient start for card headers. */
    gradient: string;
    /** Gradient for the striped cover on project cards (with bg-linear-to-br). */
    cover: string;
};

export const HUES: Record<Hue, HueClasses> = {
    slate: {
        label: 'Slate',
        dot: 'bg-slate-500',
        tile: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
        column: 'bg-slate-500/[0.06] border-slate-500/15',
        pill: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
        bar: 'bg-slate-400',
        gradient: 'from-slate-500/10',
        cover: 'from-slate-500/10 to-slate-500/30',
    },
    red: {
        label: 'Red',
        dot: 'bg-red-500',
        tile: 'bg-red-500/10 text-red-600 dark:text-red-400',
        column: 'bg-red-500/[0.06] border-red-500/15',
        pill: 'bg-red-500/10 text-red-700 dark:text-red-400',
        bar: 'bg-red-500',
        gradient: 'from-red-500/10',
        cover: 'from-red-500/15 to-red-500/40',
    },
    orange: {
        label: 'Orange',
        dot: 'bg-orange-500',
        tile: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        column: 'bg-orange-500/[0.06] border-orange-500/15',
        pill: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
        bar: 'bg-orange-500',
        gradient: 'from-orange-500/10',
        cover: 'from-orange-500/15 to-orange-500/40',
    },
    amber: {
        label: 'Amber',
        dot: 'bg-amber-500',
        tile: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        column: 'bg-amber-500/[0.07] border-amber-500/20',
        pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        bar: 'bg-amber-500',
        gradient: 'from-amber-500/10',
        cover: 'from-amber-500/15 to-amber-500/40',
    },
    green: {
        label: 'Green',
        dot: 'bg-green-500',
        tile: 'bg-green-500/10 text-green-600 dark:text-green-400',
        column: 'bg-green-500/[0.06] border-green-500/15',
        pill: 'bg-green-500/10 text-green-700 dark:text-green-400',
        bar: 'bg-green-500',
        gradient: 'from-green-500/10',
        cover: 'from-green-500/15 to-green-500/40',
    },
    teal: {
        label: 'Teal',
        dot: 'bg-teal-500',
        tile: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
        column: 'bg-teal-500/[0.06] border-teal-500/15',
        pill: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
        bar: 'bg-teal-500',
        gradient: 'from-teal-500/10',
        cover: 'from-teal-500/15 to-teal-500/40',
    },
    blue: {
        label: 'Blue',
        dot: 'bg-blue-500',
        tile: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        column: 'bg-blue-500/[0.06] border-blue-500/15',
        pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
        bar: 'bg-blue-500',
        gradient: 'from-blue-500/10',
        cover: 'from-blue-500/15 to-blue-500/40',
    },
    indigo: {
        label: 'Indigo',
        dot: 'bg-indigo-500',
        tile: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        column: 'bg-indigo-500/[0.06] border-indigo-500/15',
        pill: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
        bar: 'bg-indigo-500',
        gradient: 'from-indigo-500/10',
        cover: 'from-indigo-500/15 to-indigo-500/40',
    },
    violet: {
        label: 'Violet',
        dot: 'bg-violet-500',
        tile: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        column: 'bg-violet-500/[0.06] border-violet-500/15',
        pill: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
        bar: 'bg-violet-500',
        gradient: 'from-violet-500/10',
        cover: 'from-violet-500/15 to-violet-500/40',
    },
    pink: {
        label: 'Pink',
        dot: 'bg-pink-500',
        tile: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
        column: 'bg-pink-500/[0.06] border-pink-500/15',
        pill: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
        bar: 'bg-pink-500',
        gradient: 'from-pink-500/10',
        cover: 'from-pink-500/15 to-pink-500/40',
    },
};
