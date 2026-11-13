import { CalendarDays, List, SquareKanban } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useRef } from 'react';
import type { ProjectView } from '@/lib/project-views';
import { PROJECT_VIEWS } from '@/lib/project-views';
import { cn } from '@/lib/utils';

const VIEWS: Record<ProjectView, { label: string; icon: typeof List }> = {
    board: { label: 'Board', icon: SquareKanban },
    list: { label: 'List', icon: List },
    calendar: { label: 'Calendar', icon: CalendarDays },
};

/**
 * Board, List and Calendar (spec 0008, round 8): a segmented control at the
 * start of the filter row. A white thumb slides under the current view; the
 * arrow keys move between views.
 */
export function ViewSwitch({
    value,
    onChange,
    className,
}: {
    value: ProjectView;
    onChange: (view: ProjectView) => void;
    className?: string;
}) {
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const index = PROJECT_VIEWS.indexOf(value);

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
            return;
        }

        event.preventDefault();
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const next =
            (index + step + PROJECT_VIEWS.length) % PROJECT_VIEWS.length;
        onChange(PROJECT_VIEWS[next]);
        tabs.current[next]?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label="View"
            title="The last view of this project is remembered in this browser"
            data-test="view-switch"
            className={cn(
                'relative grid h-10 shrink-0 grid-cols-3 rounded-[13px] bg-secondary p-[3px] dark:bg-secondary/60',
                className,
            )}
        >
            <span
                aria-hidden="true"
                className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-[10px] bg-card shadow-[0_1px_2px_rgb(23_21_59/0.08),0_6px_14px_-8px_rgb(23_21_59/0.35)] transition-transform duration-[380ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
                style={{ transform: `translateX(${index * 100}%)` }}
            />
            {PROJECT_VIEWS.map((view, position) => {
                const { label, icon: Icon } = VIEWS[view];
                const on = view === value;

                return (
                    <button
                        key={view}
                        ref={(element) => {
                            tabs.current[position] = element;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        tabIndex={on ? 0 : -1}
                        data-test={`view-${view}`}
                        onClick={() => !on && onChange(view)}
                        onKeyDown={onKeyDown}
                        className={cn(
                            'relative flex w-[6.25rem] items-center justify-center gap-1.5 rounded-[10px] text-[13.5px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-sm:w-auto max-sm:px-3 [&_svg]:size-4',
                            on
                                ? 'font-bold text-foreground'
                                : 'font-semibold text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Icon aria-hidden="true" />
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
