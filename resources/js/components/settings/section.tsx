import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Inputs on the settings tabs: tall, soft and white while focused. */
export const FIELD = 'h-11 rounded-xl bg-muted focus-visible:bg-card';

/** Buttons on the settings tabs. */
export const BUTTON = 'h-10 rounded-[11px] px-4 text-[13.5px] font-semibold';

/** A soft red button for actions that remove something. */
export const DANGER =
    'border border-rose-100 bg-rose-50 text-rose-700 shadow-none hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20';

/** One settings tab: a title, a line under it, then the content. */
export function SettingsSection({
    id,
    title,
    description,
    aside,
    className,
    children,
}: {
    id: string;
    title: ReactNode;
    description: ReactNode;
    aside?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            aria-labelledby={`${id}-title`}
            className={cn('flex flex-col gap-5 p-4 sm:p-6', className)}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2
                        id={`${id}-title`}
                        className="text-lg font-extrabold tracking-tight"
                    >
                        {title}
                    </h2>
                    <p className="mt-1 text-[13.5px] leading-normal text-muted-foreground">
                        {description}
                    </p>
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}

/** A heading inside a tab, such as "Two-factor authentication". */
export function SubHeading({
    title,
    description,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <h3 className="flex flex-wrap items-center gap-2.5 text-[14.5px] font-bold">
                {title}
            </h3>
            {description && (
                <p className="mt-1 text-[13.5px] leading-normal text-muted-foreground">
                    {description}
                </p>
            )}
        </div>
    );
}

export function Divider() {
    return <div aria-hidden="true" className="h-px bg-border/70" />;
}

const PILL_TONES = {
    neutral: 'bg-muted text-muted-foreground',
    green: 'bg-green-500/12 text-green-700 dark:text-green-400',
    amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    indigo: 'bg-primary/10 text-primary',
};

export function Pill({
    tone = 'neutral',
    className,
    children,
}: {
    tone?: keyof typeof PILL_TONES;
    className?: string;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                PILL_TONES[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

/**
 * Opens and closes its content by animating the grid row, so the height
 * follows the content. Closed content is inert.
 */
export function Collapse({
    open,
    className,
    children,
}: {
    open: boolean;
    /** Padding goes here rather than on the parent, so a closed one takes no room. */
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            inert={!open}
            className={cn(
                'grid transition-[grid-template-rows,opacity] duration-450 ease-slide',
                open
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0',
            )}
        >
            <div className="min-h-0 overflow-hidden">
                <div className={className}>{children}</div>
            </div>
        </div>
    );
}
