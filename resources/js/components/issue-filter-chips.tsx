import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';
import {
    FilterPropertyIcon,
    useFilterOptions,
} from '@/components/issue-filter-menu';
import { Button } from '@/components/ui/button';
import {
    activeFilterProperties,
    clearedFilters,
    droppedFilter,
    filterValues,
} from '@/lib/issue-filters';
import type { FilterPropertyKey } from '@/lib/issue-filters';
import type { IssueFilters } from '@/types';

type Props = {
    filters: IssueFilters;
    hrefFor: (changes: Partial<IssueFilters>) => string;
    onEdit: (property: FilterPropertyKey) => void;
};

/**
 * The filters in force as chips under the toolbar, one per property: its
 * values open the menu on that property, × drops it, and Clear drops them
 * all.
 */
export function IssueFilterChips({ filters, hrefFor, onEdit }: Props) {
    const options = useFilterOptions();
    const active = activeFilterProperties(filters);

    if (active.length === 0) {
        return null;
    }

    return (
        <div
            role="group"
            aria-label="Filters in force"
            data-test="filter-chips"
            className="flex flex-wrap items-center gap-1.5 border-b px-4 py-1.5"
        >
            {active.map((property) => {
                const chosen = filterValues(filters, property.key).flatMap(
                    (value) =>
                        options[property.key].filter(
                            (option) => option.value === value,
                        ),
                );

                return (
                    <span
                        key={property.key}
                        className="inline-flex h-7 max-w-full items-center gap-1.5 border bg-muted/40 pl-2 text-xs"
                    >
                        <FilterPropertyIcon
                            property={property.key}
                            className="size-3.5 shrink-0"
                        />
                        <span className="text-muted-foreground">
                            {property.label}
                        </span>
                        <span className="text-muted-foreground">
                            {chosen.length > 1
                                ? property.operatorMany
                                : property.operator}
                        </span>
                        <button
                            type="button"
                            aria-label={`Change the ${property.label} filter`}
                            onClick={() => onEdit(property.key)}
                            className="flex h-full min-w-0 items-center gap-1 font-medium outline-none hover:underline focus-visible:underline"
                        >
                            {chosen.length === 1
                                ? (chosen[0].display ?? (
                                      <>
                                          {chosen[0].icon}
                                          <span className="truncate">
                                              {chosen[0].label}
                                          </span>
                                      </>
                                  ))
                                : chosen
                                      .map((option) => option.label)
                                      .join(', ')}
                        </button>
                        <Link
                            href={hrefFor(droppedFilter(property.key))}
                            preserveScroll
                            aria-label={`Remove the ${property.label} filter`}
                            className="flex h-full w-7 shrink-0 items-center justify-center text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                        >
                            <X className="size-3" />
                        </Link>
                    </span>
                );
            })}
            <Button
                size="xs"
                variant="ghost"
                nativeButton={false}
                render={
                    <Link
                        href={hrefFor(clearedFilters(filters))}
                        preserveScroll
                    />
                }
            >
                Clear
            </Button>
        </div>
    );
}
