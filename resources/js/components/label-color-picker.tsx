import { Check } from 'lucide-react';
import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { labelColors, labelTextColor } from '@/lib/issues';
import { cn } from '@/lib/utils';

/**
 * A framed button showing the label color that opens the palette.
 */
export function LabelColorPicker({
    value,
    onChange,
    className,
}: {
    value: string;
    onChange: (color: string) => void;
    className?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <button
                        type="button"
                        aria-label="Label color"
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center border border-input bg-muted/50 transition-[color,background-color,border-color,box-shadow] outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 data-popup-open:border-ring data-popup-open:bg-background',
                            className,
                        )}
                    />
                }
            >
                <span
                    className="size-4 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/10"
                    style={{ backgroundColor: value }}
                />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto gap-3">
                <span className="text-xs font-semibold uppercase">
                    Pick a color
                </span>
                <div
                    role="radiogroup"
                    aria-label="Label color"
                    className="grid grid-cols-8 gap-2"
                >
                    {labelColors.map((color) => (
                        <button
                            key={color}
                            type="button"
                            role="radio"
                            aria-checked={value === color}
                            aria-label={color}
                            className="flex size-6 items-center justify-center rounded-full ring-1 ring-black/10 transition-transform outline-none ring-inset hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring dark:ring-white/10"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                                onChange(color);
                                setOpen(false);
                            }}
                        >
                            {value === color ? (
                                <Check
                                    className="size-3.5"
                                    style={{ color: labelTextColor(color) }}
                                />
                            ) : null}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
