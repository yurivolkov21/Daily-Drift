import { Link } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Fragment, useId } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * One block of the dashboard: a bordered panel like the project cards, with
 * a header row like the toolbars of the Issues and Projects pages.
 */
export function DashboardWidget({
    title,
    icon: Icon,
    meta,
    action,
    footer,
    live = false,
    className,
    bodyClassName,
    children,
}: {
    title: string;
    icon: LucideIcon;
    meta?: string | null;
    action?: ReactNode;
    footer?: ReactNode;
    live?: boolean;
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
}) {
    const titleId = useId();

    return (
        <section
            aria-labelledby={titleId}
            className={cn(
                'flex min-w-0 flex-col bg-card text-sm text-card-foreground ring-1 ring-border',
                className,
            )}
        >
            <header className="flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1 border-b py-2 pr-2 pl-4">
                <Icon className="size-4 text-muted-foreground" />
                <h2
                    id={titleId}
                    className="font-heading text-xs font-semibold tracking-wider uppercase"
                >
                    {title}
                </h2>
                {live ? <LiveDot /> : null}
                {meta ? (
                    <span className="hidden min-w-0 truncate text-xs text-muted-foreground @xl/dashboard:block">
                        {meta}
                    </span>
                ) : null}
                {action ? (
                    <div className="ml-auto flex items-center gap-1">
                        {action}
                    </div>
                ) : null}
            </header>
            <div className={cn('min-w-0 flex-1', bodyClassName)}>
                {children}
            </div>
            {footer ? (
                <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2.5 text-xs text-muted-foreground">
                    {footer}
                </footer>
            ) : null}
        </section>
    );
}

/**
 * A quiet link in a widget's header to the page that lists everything.
 */
export function WidgetLink({
    href,
    children,
}: {
    href: string;
    children: ReactNode;
}) {
    return (
        <Button
            size="xs"
            variant="ghost"
            nativeButton={false}
            render={<Link href={href} />}
        >
            {children}
            <ArrowRight data-icon="inline-end" />
        </Button>
    );
}

/**
 * Says that the widget follows what the team does as it happens.
 */
function LiveDot() {
    return (
        <span
            title="Updates as your team works"
            className="inline-flex items-center gap-1.5 text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase"
        >
            <span className="size-1.5 rounded-full bg-sidebar-primary motion-safe:animate-pulse" />
            Live
        </span>
    );
}

/**
 * The app's empty state at widget size.
 */
export function WidgetEmpty({
    icon: Icon,
    title,
    children,
    action,
}: {
    icon: LucideIcon;
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
            <span className="flex size-10 items-center justify-center bg-muted text-foreground">
                <Icon className="size-5" />
            </span>
            <div className="flex max-w-xs flex-col gap-1">
                <p className="font-heading text-xs font-semibold tracking-wider uppercase">
                    {title}
                </p>
                {children ? (
                    <p className="text-sm text-balance text-muted-foreground">
                        {children}
                    </p>
                ) : null}
            </div>
            {action}
        </div>
    );
}

/**
 * Tiny columns beside a number (shadcnstudio widget-product-insights), with
 * today in the accent and the other days quiet (shadcnspace chart-04).
 */
function SparkBars({
    values,
    labels,
    unit,
}: {
    values: (number | null)[];
    labels: string[];
    unit: string;
}) {
    const max = Math.max(1, ...values.map((value) => value ?? 0));
    const today = values.findLastIndex((value) => value !== null);

    return (
        <div
            role="img"
            aria-label={values
                .map(
                    (value, index) =>
                        `${labels[index]}: ${value === null ? 'still ahead' : `${value} ${unit}`}`,
                )
                .join(', ')}
            className="flex h-8 shrink-0 items-end gap-[3px]"
        >
            {values.map((value, index) => (
                <Tooltip key={labels[index]}>
                    <TooltipTrigger
                        render={
                            <span className="group/bar flex h-full w-2 items-end" />
                        }
                    >
                        <span
                            className={cn(
                                'w-full transition-opacity group-hover/bar:opacity-80',
                                value === null
                                    ? 'h-px bg-border'
                                    : index === today
                                      ? 'bg-indigo-500'
                                      : 'bg-foreground/20',
                            )}
                            style={
                                value === null
                                    ? undefined
                                    : {
                                          height:
                                              value === 0
                                                  ? '1px'
                                                  : `${Math.max(12, (value / max) * 100)}%`,
                                      }
                            }
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        {labels[index]}:{' '}
                        {value === null ? 'still ahead' : `${value} ${unit}`}
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}

export type DashboardStat = {
    id: string;
    label: string;
    value: number;
    caption: string;
    danger?: boolean;
    href?: string;
    spark?: { values: (number | null)[]; labels: string[]; unit: string };
};

/**
 * The headline numbers as one panel cut into cells by rules (shadcnspace
 * statistics-02). A number that has a page listing what it counts links there.
 */
export function StatStrip({ stats }: { stats: DashboardStat[] }) {
    const edges = [
        'border-r border-b @3xl/dashboard:border-b-0',
        'border-b @3xl/dashboard:border-r @3xl/dashboard:border-b-0',
        'border-r',
        '',
    ];

    return (
        <div className="grid grid-cols-2 bg-card text-card-foreground ring-1 ring-border @3xl/dashboard:grid-cols-4">
            {stats.map((stat, index) => {
                const content = (
                    <>
                        <span className="flex min-h-8 items-start justify-between gap-2 @3xl/dashboard:min-h-0">
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                {stat.label}
                            </span>
                            {stat.href ? (
                                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/stat:opacity-100 group-focus-visible/stat:opacity-100" />
                            ) : null}
                        </span>
                        <span className="flex min-h-8 items-end justify-between gap-3">
                            <span
                                className={cn(
                                    'font-heading text-3xl leading-none font-semibold tabular-nums',
                                    stat.danger &&
                                        stat.value > 0 &&
                                        'text-destructive',
                                )}
                            >
                                {stat.value}
                            </span>
                            {stat.spark ? <SparkBars {...stat.spark} /> : null}
                        </span>
                        <span className="min-h-4 text-xs text-pretty text-muted-foreground">
                            {stat.caption}
                        </span>
                    </>
                );
                const cellClass = cn(
                    'flex min-w-0 flex-col gap-3 p-4 @3xl/dashboard:p-5',
                    edges[index],
                );

                return stat.href ? (
                    <Link
                        key={stat.id}
                        href={stat.href}
                        className={cn(
                            cellClass,
                            'group/stat outline-none hover:bg-muted/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset',
                        )}
                    >
                        {content}
                    </Link>
                ) : (
                    <div key={stat.id} className={cellClass}>
                        {content}
                    </div>
                );
            })}
        </div>
    );
}

export type GreetingPart = {
    id: string;
    text: string;
    href: string;
    danger?: boolean;
};

/**
 * "Good morning, Ada", the date, and a sentence of links to what needs a look.
 */
export function DashboardGreeting({
    title,
    date,
    parts,
    fallback,
}: {
    title: string;
    date: string;
    parts: GreetingPart[];
    fallback: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-heading text-base font-semibold tracking-wider uppercase">
                    {title}
                </h2>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {date}
                </p>
            </div>
            <p className="text-sm text-pretty text-muted-foreground">
                {parts.length === 0 ? (
                    fallback
                ) : (
                    <>
                        You have{' '}
                        {parts.map((part, index) => (
                            <Fragment key={part.id}>
                                {index === 0
                                    ? ''
                                    : index === parts.length - 1
                                      ? ' and '
                                      : ', '}
                                <Link
                                    href={part.href}
                                    className={cn(
                                        'font-medium underline decoration-current/30 underline-offset-4 outline-none hover:decoration-current focus-visible:decoration-current',
                                        part.danger
                                            ? 'text-destructive'
                                            : 'text-foreground',
                                    )}
                                >
                                    {part.text}
                                </Link>
                            </Fragment>
                        ))}
                        .
                    </>
                )}
            </p>
        </div>
    );
}

export type SetupStep = {
    id: string;
    title: string;
    hint: string;
    done: boolean;
    action?: ReactNode;
    soon?: boolean;
};

/**
 * A new team's first steps (shadcnuikit Table 3): how many are done over a
 * progress bar, then each step with its action.
 */
export function GetStarted({ steps }: { steps: SetupStep[] }) {
    const done = steps.filter((step) => step.done).length;
    const percent = Math.round((done / steps.length) * 100);

    return (
        <section className="flex flex-col bg-card text-sm text-card-foreground ring-1 ring-border">
            <div className="flex flex-col gap-3 p-4 @3xl/dashboard:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-heading text-sm font-semibold tracking-wider uppercase">
                        Get started
                    </h2>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {done} of {steps.length} done
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div
                        role="progressbar"
                        aria-label="Setup progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        className="h-1.5 flex-1 bg-muted"
                    >
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <span className="w-10 text-right text-xs font-medium tabular-nums">
                        {percent}%
                    </span>
                </div>
            </div>
            <ul className="border-t">
                {steps.map((step) => (
                    <li
                        key={step.id}
                        className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 @3xl/dashboard:px-5"
                    >
                        <span
                            className={cn(
                                'flex size-5 shrink-0 items-center justify-center rounded-full',
                                step.done
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border border-dashed text-muted-foreground',
                            )}
                        >
                            {step.done ? <Check className="size-3" /> : null}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span
                                className={cn(
                                    'text-sm font-medium',
                                    step.done &&
                                        'text-muted-foreground line-through',
                                )}
                            >
                                {step.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {step.hint}
                            </span>
                        </div>
                        {step.done ? null : step.soon ? (
                            <span className="border px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
                                Soon
                            </span>
                        ) : (
                            step.action
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
