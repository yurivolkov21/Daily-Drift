import { Search } from 'lucide-react';
import { useState } from 'react';
import { LABEL_ICON_GROUPS, LABEL_ICONS } from '@/lib/label-icons';
import { cn } from '@/lib/utils';

const ALL = 'All';
const TOTAL = Object.keys(LABEL_ICONS).length;

/**
 * Pick one of the 79 label icons (spec 0007, round 7): a search field, the
 * six groups as tabs and a grid. Searching matches the icon's name and its
 * group.
 */
export function IconPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (icon: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [group, setGroup] = useState(ALL);
    const needle = query.trim().toLowerCase();
    const groupOf = (icon: string) =>
        LABEL_ICON_GROUPS.find(([, icons]) => icons.includes(icon))?.[0] ?? '';
    const icons = (
        group === ALL
            ? LABEL_ICON_GROUPS.flatMap(([, list]) => list)
            : (LABEL_ICON_GROUPS.find(([name]) => name === group)?.[1] ?? [])
    ).filter(
        (icon) =>
            needle === '' ||
            icon.includes(needle) ||
            groupOf(icon).toLowerCase().includes(needle),
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11.5px]">
                <span className="font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    Icon
                </span>
                <span className="text-muted-foreground">{TOTAL} icons</span>
            </div>
            <label className="flex min-h-8 items-center gap-2 rounded-lg bg-muted px-2.5 text-muted-foreground">
                <Search className="size-3.5" aria-hidden="true" />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search icons"
                    aria-label="Search icons"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                />
            </label>
            <div
                role="tablist"
                aria-label="Icon groups"
                className="flex thin-scrollbar gap-1 overflow-x-auto"
            >
                {[ALL, ...LABEL_ICON_GROUPS.map(([name]) => name)].map(
                    (name) => (
                        <button
                            key={name}
                            type="button"
                            role="tab"
                            aria-selected={group === name}
                            onClick={() => setGroup(name)}
                            className={cn(
                                'h-6.5 shrink-0 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                group === name
                                    ? 'bg-foreground text-background'
                                    : 'bg-secondary text-foreground/75 hover:text-foreground',
                            )}
                        >
                            {name}
                        </button>
                    ),
                )}
            </div>
            <div
                role="radiogroup"
                aria-label="Icon"
                className="grid thin-scrollbar max-h-44 grid-cols-8 gap-1 overflow-y-auto p-0.5"
            >
                {icons.map((name) => {
                    const Icon = LABEL_ICONS[name];
                    const on = name === value;

                    return (
                        <button
                            key={name}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={name.replace(/-/g, ' ')}
                            title={name.replace(/-/g, ' ')}
                            onClick={() => onChange(name)}
                            className={cn(
                                'flex h-8 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                on
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border/70 text-foreground/75 hover:bg-secondary',
                            )}
                        >
                            <Icon className="size-4" />
                        </button>
                    );
                })}
            </div>
            {icons.length === 0 && (
                <p className="py-2 text-center text-[12.5px] text-muted-foreground">
                    No icon matches “{query}”.
                </p>
            )}
        </div>
    );
}
