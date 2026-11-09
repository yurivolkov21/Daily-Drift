import { Check, ChevronsUpDown, Monitor } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { deviceTimeZone } from '@/hooks/use-local-time';
import { cn } from '@/lib/utils';

/** "America/Argentina/Buenos_Aires" reads as "America/Argentina/Buenos Aires". */
function zoneLabel(zone: string): string {
    return zone.replaceAll('_', ' ');
}

/**
 * The zone's offset right now, such as "GMT+7", or nothing if the browser
 * does not know the zone (older browsers miss recent names).
 */
function offsetOf(zone: string, at: Date): string {
    try {
        return (
            new Intl.DateTimeFormat('en-US', {
                timeZone: zone,
                timeZoneName: 'shortOffset',
            })
                .formatToParts(at)
                .find((part) => part.type === 'timeZoneName')?.value ?? ''
        );
    } catch {
        return '';
    }
}

function todayIn(zone: string): string | null {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: zone,
        }).format(new Date());
    } catch {
        return null;
    }
}

/**
 * Picks a time zone, or "Match my device" (null), from a searchable list of
 * the IANA names the server knows. Offsets are worked out only while the
 * list is open.
 */
export function TimeZoneField({
    id,
    value,
    zones: names,
    device: serverDevice,
    onChange,
    invalid = false,
}: {
    id: string;
    value: string | null;
    /** The IANA names to pick from, from the server. */
    zones: string[];
    /** The device's zone as the server read it from the cookie, if any. */
    device: string | null;
    onChange: (zone: string | null) => void;
    invalid?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const device = useMemo(
        () => serverDevice ?? deviceTimeZone(),
        [serverDevice],
    );
    const effective = value ?? device;
    const offset = offsetOf(effective, new Date());
    const today = todayIn(effective);

    const zones = useMemo(() => {
        if (!open) {
            return [];
        }

        const now = new Date();

        return names.map((zone) => ({ zone, offset: offsetOf(zone, now) }));
    }, [open, names]);

    const pick = (zone: string | null) => {
        onChange(zone);
        setOpen(false);
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        id={id}
                        type="button"
                        role="combobox"
                        aria-expanded={open}
                        aria-invalid={invalid}
                        data-test="time-zone-trigger"
                        className="flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-muted px-3 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
                    >
                        {value === null && (
                            <Monitor className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                            {value === null
                                ? 'Match my device'
                                : zoneLabel(value)}
                            <span className="text-muted-foreground">
                                {value === null && ` · ${zoneLabel(device)}`}
                                {offset && ` (${offset})`}
                            </span>
                        </span>
                        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-(--radix-popover-trigger-width) min-w-72 overflow-hidden rounded-[14px] p-0"
                >
                    <Command>
                        <CommandInput placeholder="Search time zones…" />
                        <CommandList className="scrollbar-thin max-h-72">
                            <CommandEmpty>No time zone matches.</CommandEmpty>
                            <CommandGroup>
                                <CommandItem
                                    value="match-my-device"
                                    keywords={['match', 'device', device]}
                                    onSelect={() => pick(null)}
                                >
                                    <Monitor />
                                    <span className="min-w-0 flex-1 truncate">
                                        Match my device{' '}
                                        <span className="text-muted-foreground">
                                            · {zoneLabel(device)}
                                        </span>
                                    </span>
                                    <Check
                                        className={cn(
                                            'size-4 text-primary',
                                            value !== null && 'opacity-0',
                                        )}
                                    />
                                </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="All time zones">
                                {zones.map(({ zone, offset }) => (
                                    <CommandItem
                                        key={zone}
                                        value={zone}
                                        keywords={[zoneLabel(zone), offset]}
                                        onSelect={() => pick(zone)}
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            {zoneLabel(zone)}
                                        </span>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {offset}
                                        </span>
                                        <Check
                                            className={cn(
                                                'size-4 text-primary',
                                                value !== zone && 'opacity-0',
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <p className="text-[12.5px] text-muted-foreground">
                {today && `It is ${today} there. `}Due dates turn overdue at
                midnight in this time zone.
            </p>
        </>
    );
}
