import type { LucideIcon } from 'lucide-react';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

type Option<T extends string> = {
    value: T;
    label: string;
    icon?: LucideIcon;
    /** A count shown after the label, such as the number of projects. */
    count?: number;
};

type Props<T extends string> = Omit<
    HTMLAttributes<HTMLDivElement>,
    'onChange'
> & {
    label: string;
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
};

const ARROW_STEPS: Partial<Record<string, number>> = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
};

/**
 * A row of mutually exclusive choices with a white thumb that slides to the
 * selected one. Like a radio group, it is one Tab stop and the arrow keys
 * move the choice.
 */
export function SegmentedTabs<T extends string>({
    label,
    options,
    value,
    onChange,
    className,
    ...props
}: Props<T>) {
    const index = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );

    const onArrow = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = ARROW_STEPS[event.key];

        if (step === undefined) {
            return;
        }

        event.preventDefault();
        const next = (index + step + options.length) % options.length;
        onChange(options[next].value);
        event.currentTarget
            .querySelectorAll<HTMLButtonElement>('[role="radio"]')
            [next]?.focus();
    };

    return (
        <div
            onKeyDown={onArrow}
            role="radiogroup"
            aria-label={label}
            className={cn(
                'relative inline-grid rounded-xl bg-secondary p-1',
                className,
            )}
            style={{
                gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            }}
            {...props}
        >
            <span
                aria-hidden="true"
                className="absolute inset-y-1 left-1 rounded-[9px] bg-card shadow-[0_2px_8px_-2px_rgb(40_30_120/0.2)] transition-transform duration-350 ease-slide"
                style={{
                    width: `calc((100% - 0.5rem) / ${options.length})`,
                    transform: `translateX(${index * 100}%)`,
                }}
            />
            {options.map(
                ({ value: option, label: text, icon: Icon, count }) => (
                    <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={option === value}
                        tabIndex={option === value ? 0 : -1}
                        onClick={() => onChange(option)}
                        className={cn(
                            'relative flex min-h-9 items-center justify-center gap-1.5 rounded-[9px] px-3.5 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            option === value
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {Icon && <Icon className="size-4" />}
                        {text}
                        {count !== undefined && (
                            <span className="font-medium text-muted-foreground tabular-nums">
                                {count}
                            </span>
                        )}
                    </button>
                ),
            )}
        </div>
    );
}
