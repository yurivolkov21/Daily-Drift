import type { LucideIcon } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Option<T extends string> = {
    value: T;
    label: string;
    icon?: LucideIcon;
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

/**
 * A row of mutually exclusive choices with a white thumb that slides to the
 * selected one.
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

    return (
        <div
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
            {options.map(({ value: option, label: text, icon: Icon }) => (
                <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={option === value}
                    onClick={() => onChange(option)}
                    className={cn(
                        'relative flex min-h-9 items-center justify-center gap-1.5 rounded-[9px] px-3.5 text-sm font-semibold transition-colors',
                        option === value
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {Icon && <Icon className="size-4" />}
                    {text}
                </button>
            ))}
        </div>
    );
}
