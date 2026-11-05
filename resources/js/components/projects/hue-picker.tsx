import { Check } from 'lucide-react';
import type { Hue } from '@/lib/hues';
import { HUE_NAMES, HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';

type Props = {
    name: string;
    value: Hue;
    onChange: (value: Hue) => void;
};

export function HuePicker({ name, value, onChange }: Props) {
    return (
        <div
            role="radiogroup"
            aria-label="Color"
            className="flex flex-wrap gap-2"
        >
            <input type="hidden" name={name} value={value} />
            {HUE_NAMES.map((hue) => (
                <button
                    key={hue}
                    type="button"
                    role="radio"
                    aria-checked={value === hue}
                    aria-label={HUES[hue].label}
                    onClick={() => onChange(hue)}
                    className={cn(
                        'flex size-7 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        HUES[hue].dot,
                        value === hue && 'ring-2 ring-ring',
                    )}
                >
                    {value === hue && <Check className="size-3.5" />}
                </button>
            ))}
        </div>
    );
}
