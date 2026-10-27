import type { ReactElement, ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type PropertyOption<TValue> = {
    value: TValue;
    label: string;
    icon?: ReactNode;
    display?: ReactNode;
};

type Props<TValue> = {
    trigger: ReactElement;
    options: PropertyOption<TValue>[];
    selected: TValue[];
    onSelect: (value: TValue) => void;
    placeholder: string;
    multiple?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    align?: 'start' | 'center' | 'end';
    searchable?: boolean;
    contentClassName?: string;
    renderExtra?: (search: string, clearSearch: () => void) => ReactNode;
};

/**
 * Match options by their label, ignoring case.
 */
function filterByLabel(
    _value: string,
    search: string,
    keywords: string[] = [],
): number {
    return keywords.join(' ').toLowerCase().includes(search.toLowerCase())
        ? 1
        : 0;
}

export function PropertyPicker<TValue extends string | number | null>({
    trigger,
    options,
    selected,
    onSelect,
    placeholder,
    multiple = false,
    open: controlledOpen,
    onOpenChange,
    align = 'start',
    searchable = true,
    contentClassName,
    renderExtra,
}: Props<TValue>) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const [search, setSearch] = useState('');
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = onOpenChange ?? setUncontrolledOpen;
    const [wasOpen, setWasOpen] = useState(open);
    const listRef = useRef<HTMLDivElement>(null);

    // Clear the search when reopening rather than closing, so the list does
    // not jump while the popover fades out.
    if (open !== wasOpen) {
        setWasOpen(open);

        if (open) {
            setSearch('');
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={trigger} />
            <PopoverContent
                align={align}
                className={cn('w-60 gap-0 p-0', contentClassName)}
                initialFocus={searchable ? undefined : listRef}
            >
                <Command
                    ref={listRef}
                    filter={filterByLabel}
                    tabIndex={searchable ? undefined : -1}
                    className="outline-none"
                >
                    {searchable ? (
                        <CommandInput
                            autoFocus
                            placeholder={placeholder}
                            value={search}
                            onValueChange={setSearch}
                        />
                    ) : null}
                    <CommandList>
                        <CommandEmpty>No results.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={String(option.value)}
                                    value={String(option.value)}
                                    keywords={[option.label]}
                                    data-checked={selected.includes(
                                        option.value,
                                    )}
                                    onSelect={() => {
                                        onSelect(option.value);

                                        if (!multiple) {
                                            setOpen(false);
                                        }
                                    }}
                                >
                                    {option.display ?? (
                                        <>
                                            {option.icon}
                                            <span className="truncate">
                                                {option.label}
                                            </span>
                                        </>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {renderExtra?.(search, () => setSearch(''))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
