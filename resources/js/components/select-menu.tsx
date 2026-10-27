import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { PropertyPicker } from '@/components/property-picker';
import type { PropertyOption } from '@/components/property-picker';
import { cn } from '@/lib/utils';

const triggerSizes = {
    default: 'h-10 w-full px-3 text-sm',
    sm: 'h-7 max-w-60 px-2 text-xs',
};

/**
 * A framed button that opens the same list as the property pickers, with a
 * tick on the current choice. Lists of more than six choices get a search
 * box.
 */
export function SelectMenu<TValue extends string | number | null>({
    label,
    value,
    options,
    onChange,
    icon,
    size = 'default',
    align = 'start',
    className,
    ...props
}: {
    label: string;
    value: TValue;
    options: PropertyOption<TValue>[];
    onChange: (value: TValue) => void;
    icon?: ReactNode;
    size?: keyof typeof triggerSizes;
    align?: 'start' | 'center' | 'end';
} & Omit<ComponentProps<'button'>, 'value' | 'onChange' | 'children'>) {
    const current = options.find((option) => option.value === value);

    return (
        <PropertyPicker
            trigger={
                <button
                    type="button"
                    aria-label={`${label}: ${current?.label ?? ''}`}
                    className={cn(
                        'flex min-w-0 items-center gap-2 border border-input bg-muted/50 text-left transition-[color,background-color,border-color,box-shadow] outline-none hover:bg-muted focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 data-popup-open:border-ring data-popup-open:bg-background [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3.5',
                        triggerSizes[size],
                        className,
                    )}
                    {...props}
                >
                    {icon}
                    {current?.icon}
                    <span className="truncate">{current?.label}</span>
                    <ChevronDown className="ml-auto text-muted-foreground" />
                </button>
            }
            options={options}
            selected={[value]}
            onSelect={onChange}
            placeholder={`Find ${label.toLowerCase()}...`}
            searchable={options.length > 6}
            align={align}
            contentClassName="w-auto min-w-(--anchor-width)"
        />
    );
}
