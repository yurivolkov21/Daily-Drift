import { SelectMenu } from '@/components/select-menu';
import { Button } from '@/components/ui/button';
import { toggled } from '@/lib/display-store';

type Option<T> = { value: T; label: string };

/**
 * A row of buttons that picks one of a few display options.
 */
export function DisplayOptionGroup<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div role="group" aria-label={label} className="flex border">
                {options.map((option) => (
                    <Button
                        key={option.value}
                        size="xs"
                        variant={value === option.value ? 'secondary' : 'ghost'}
                        aria-pressed={value === option.value}
                        onClick={() => onChange(option.value)}
                        className="flex-1"
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

/**
 * A labelled dropdown for a display option with many choices.
 */
export function DisplaySelect<T extends string>({
    id,
    label,
    options,
    value,
    onChange,
}: {
    id: string;
    label: string;
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className="grid gap-1.5">
            <label htmlFor={id} className="text-xs text-muted-foreground">
                {label}
            </label>
            <SelectMenu
                id={id}
                label={label}
                options={options}
                value={value}
                onChange={onChange}
            />
        </div>
    );
}

/**
 * Toggle buttons that show or hide properties, keeping the hidden ones.
 */
export function DisplayPropertyToggles<T extends string>({
    label,
    options,
    hidden,
    onChange,
}: {
    label: string;
    options: Option<T>[];
    hidden: T[];
    onChange: (hidden: T[]) => void;
}) {
    return (
        <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex flex-wrap gap-1.5">
                {options.map((option) => {
                    const isShown = !hidden.includes(option.value);

                    return (
                        <Button
                            key={option.value}
                            size="xs"
                            variant={isShown ? 'secondary' : 'outline'}
                            aria-pressed={isShown}
                            onClick={() =>
                                onChange(toggled(hidden, option.value))
                            }
                        >
                            {option.label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
