import { Link } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { HUES } from '@/lib/hues';
import type { Hue } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const TITLES = [
    'Write feature tests',
    'Pick the palette',
    'Empty states',
    'Keyboard shortcuts',
    'Kanban drag and drop',
    'Task detail sheet',
    'Seed demo data',
    'Archive tab',
    'Stat cards',
    'Spec review',
    'Docs pass',
    'Release notes',
    'Chapter 2 outline',
    'Mock test 4',
    'Dark theme pass',
    'Saved replies',
];
const DOTS = [
    'bg-red-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-slate-400',
    'bg-green-500',
];
const PEOPLE = [
    'bg-[#f5d0fe]',
    'bg-[#bae6fd]',
    'bg-[#fbcfe8]',
    'bg-[#fed7aa]',
    'bg-[#bbf7d0]',
];
const LANES: Hue[] = ['slate', 'amber', 'violet', 'green', 'blue'];

/**
 * Sign in, sign up and the other account pages: a glass card over a board
 * that drifts slowly behind a night-blue gradient. The board is decoration,
 * hidden from screen readers, still with reduced motion and left out on
 * small screens.
 */
export default function AuthBoardLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative min-h-svh overflow-hidden bg-night">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-[-260px] left-[360px] hidden origin-top-left scale-[1.08] -rotate-[8deg] gap-[18px] md:flex"
            >
                {LANES.map((hue, lane) => {
                    const cards = Array.from({ length: 8 }, (_, index) => {
                        const k = lane * 3 + index;

                        return {
                            title: TITLES[k % TITLES.length],
                            dot: DOTS[k % DOTS.length],
                            person: PEOPLE[(k + lane) % PEOPLE.length],
                            meta: `${['Urgent', 'Medium', 'Low', 'No priority'][k % 4]} · ${3 + (k % 9)} Nov`,
                        };
                    });

                    return (
                        <div
                            key={hue}
                            className={cn(
                                'h-[1500px] w-[230px] overflow-hidden rounded-[22px] bg-card p-3.5',
                            )}
                        >
                            <div
                                className={cn(
                                    'flex flex-col gap-2.5',
                                    lane % 2
                                        ? 'animate-lane-down'
                                        : 'animate-lane-up',
                                )}
                            >
                                {[...cards, ...cards].map((card, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            'flex flex-col gap-2 rounded-[14px] border p-3',
                                            HUES[hue].column,
                                        )}
                                    >
                                        <span className="text-[13px] leading-snug font-semibold text-foreground">
                                            {card.title}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                                            <span
                                                className={cn(
                                                    'size-[7px] rounded-full',
                                                    card.dot,
                                                )}
                                            />
                                            {card.meta}
                                            <span
                                                className={cn(
                                                    'ml-auto size-5 rounded-full',
                                                    card.person,
                                                )}
                                            />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--night)_0%,rgb(23_21_59/0.94)_34%,rgb(23_21_59/0.55)_58%,rgb(23_21_59/0.1)_100%)]"
            />

            <div className="relative flex min-h-svh flex-col justify-center gap-7 px-4 py-10 sm:px-8 md:pl-[110px]">
                <Link
                    href={home()}
                    className="flex items-center gap-3 self-center text-white no-underline md:self-start"
                >
                    <AppLogo />
                </Link>
                <main className="w-full max-w-[480px] animate-rise self-center rounded-card bg-card/95 p-7 shadow-[0_50px_90px_-40px_rgb(0_0_0/0.6)] backdrop-blur-md [animation-delay:150ms] sm:p-10 md:self-start">
                    <div className="mb-6 flex flex-col gap-2">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-[14.5px] leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {children}
                </main>
                <p className="self-center text-[13.5px] text-night-foreground md:self-start">
                    Behind this card: a board, still moving.
                </p>
            </div>
        </div>
    );
}
