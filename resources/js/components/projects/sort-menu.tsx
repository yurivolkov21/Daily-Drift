import { ArrowDownUp, Check, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SORTS } from '@/lib/projects';
import { cn } from '@/lib/utils';
import type { ProjectSort } from '@/types';

/** The Sort menu: one option per order, each with an icon and a hint. */
export function SortMenu({
    value,
    onChange,
}: {
    value: ProjectSort;
    onChange: (value: ProjectSort) => void;
}) {
    const current = SORTS.find((sort) => sort.value === value) ?? SORTS[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group/sort flex min-h-10 min-w-56 items-center gap-2.5 rounded-xl border bg-card px-3 text-sm transition-[border-color,box-shadow] outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:border-primary data-[state=open]:ring-3 data-[state=open]:ring-primary/15">
                <ArrowDownUp className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Sort</span>
                <span className="font-semibold">{current.label}</span>
                <ChevronDown className="ml-auto size-4 transition-transform duration-300 ease-slide group-data-[state=open]/sort:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-72 rounded-2xl p-1.5 shadow-[0_24px_50px_-20px_rgb(23_21_59/0.4)]"
            >
                <DropdownMenuLabel className="px-2.5 pt-2 pb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    Sort by
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={value}
                    onValueChange={(next) => onChange(next as ProjectSort)}
                >
                    {SORTS.map((sort) => {
                        const selected = sort.value === value;

                        return (
                            <DropdownMenuRadioItem
                                key={sort.value}
                                value={sort.value}
                                className="gap-3 rounded-xl py-2 pr-2.5 pl-2.5 [&>span:first-child]:hidden"
                            >
                                <span
                                    className={cn(
                                        'flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-colors',
                                        selected
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-secondary text-primary',
                                    )}
                                >
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="size-4"
                                    >
                                        <path d={sort.icon} />
                                    </svg>
                                </span>
                                <span className="flex flex-1 flex-col">
                                    <span className="font-semibold">
                                        {sort.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {sort.hint}
                                    </span>
                                </span>
                                <Check
                                    className={cn(
                                        'size-4 text-primary transition-[opacity,scale] duration-200',
                                        selected
                                            ? 'scale-100 opacity-100'
                                            : 'scale-75 opacity-0',
                                    )}
                                />
                            </DropdownMenuRadioItem>
                        );
                    })}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
