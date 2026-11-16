import { Check, ChevronDown, Repeat } from 'lucide-react';
import { useState } from 'react';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    CUSTOM_UNITS,
    MAX_EVERY,
    presetKey,
    PRESETS,
    ruleText,
    sameRule,
} from '@/lib/repeat';
import { cn } from '@/lib/utils';
import type { RepeatRule, RepeatUnit } from '@/types';

type CustomUnit = Exclude<RepeatUnit, 'weekday'>;

/**
 * The task sheet's Repeat row (spec 0010, round 10): a menu of ready-made
 * rules that follow the due date ("Every week on Thursday"), and Custom for
 * every 1 to 30 days, weeks, months or years. The rule is saved with the
 * sheet, as hidden fields.
 */
export function RepeatField({
    value,
    dueOn,
    today,
    disabled,
    onChange,
}: {
    value: RepeatRule | null;
    /** The due date the labels follow, or today when there is none yet. */
    dueOn: string | null;
    today: string;
    disabled?: boolean;
    onChange: (rule: RepeatRule | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const [custom, setCustom] = useState(false);
    const [every, setEvery] = useState(value?.every ?? 2);
    const [unit, setUnit] = useState<CustomUnit>(
        value && value.unit !== 'weekday' ? value.unit : 'week',
    );
    const date = dueOn ?? today;
    const key = presetKey(value);
    const count = Math.min(MAX_EVERY, Math.max(1, every || 1));
    const draft: RepeatRule = { unit, every: count };

    const pick = (rule: RepeatRule | null) => {
        if (!sameRule(rule, value)) {
            onChange(rule);
        }

        setOpen(false);
        setCustom(false);
    };

    return (
        <>
            {value ? (
                <>
                    <input
                        type="hidden"
                        name="repeat[unit]"
                        value={value.unit}
                    />
                    <input
                        type="hidden"
                        name="repeat[every]"
                        value={value.every}
                    />
                </>
            ) : (
                <input type="hidden" name="repeat" value="" />
            )}
            <Popover
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    setCustom(next && key === 'custom');
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={disabled}
                        className={cn(
                            'w-full justify-start gap-2 px-3 font-normal',
                            value ? 'text-foreground' : 'text-muted-foreground',
                        )}
                    >
                        {value && <Repeat className="text-primary" />}
                        <span className="truncate">
                            {ruleText(value, value ? date : null)}
                        </span>
                        <ChevronDown className="ml-auto opacity-60" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[18rem] p-1.5">
                    <ul
                        role="listbox"
                        aria-label="Repeat"
                        className="flex flex-col gap-px"
                    >
                        {PRESETS.map((preset) => {
                            const selected = !custom && preset.key === key;

                            return (
                                <li
                                    key={preset.key}
                                    role="option"
                                    aria-selected={selected}
                                >
                                    <button
                                        type="button"
                                        onClick={() => pick(preset.rule)}
                                        className={cn(
                                            'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                                            selected &&
                                                'bg-secondary font-semibold',
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                'size-4 shrink-0 text-primary',
                                                !selected && 'opacity-0',
                                            )}
                                        />
                                        {ruleText(preset.rule, date)}
                                    </button>
                                </li>
                            );
                        })}
                        <li
                            role="option"
                            aria-selected={custom || key === 'custom'}
                        >
                            <button
                                type="button"
                                onClick={() => setCustom(true)}
                                className={cn(
                                    'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                                    (custom || key === 'custom') &&
                                        'bg-secondary font-semibold',
                                )}
                            >
                                <Check
                                    className={cn(
                                        'size-4 shrink-0 text-primary',
                                        !(custom || key === 'custom') &&
                                            'opacity-0',
                                    )}
                                />
                                {key === 'custom' && !custom
                                    ? `Custom: ${ruleText(value, date)}`
                                    : 'Custom…'}
                            </button>
                        </li>
                    </ul>
                    {custom && (
                        <div className="mt-1 flex animate-pop flex-col gap-2.5 rounded-xl bg-secondary/60 p-2.5">
                            <label className="flex items-center gap-2 text-sm font-semibold">
                                Every
                                <Input
                                    type="number"
                                    min={1}
                                    max={MAX_EVERY}
                                    value={every}
                                    onChange={(event) =>
                                        setEvery(Number(event.target.value))
                                    }
                                    aria-label="How many"
                                    className="h-8 w-16 bg-card"
                                />
                            </label>
                            <SegmentedTabs
                                label="Unit"
                                value={unit}
                                onChange={setUnit}
                                options={CUSTOM_UNITS.map((item) => ({
                                    value: item.unit,
                                    label: item.label,
                                }))}
                                className="w-full bg-card [&_[role=radio]]:min-h-7 [&_[role=radio]]:px-2 [&_[role=radio]]:text-[12.5px]"
                            />
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[12.5px] text-muted-foreground">
                                    {ruleText(draft, date)}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => pick(draft)}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </>
    );
}
