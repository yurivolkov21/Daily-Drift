import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';
import { DateFilterIcon } from '@/components/issue-filter-menu';
import { Button } from '@/components/ui/button';
import { activeDoneFilter, activeDueFilter } from '@/lib/issue-filters';
import type { IssueFilters } from '@/types';

type Props = {
    filters: IssueFilters;
    hrefFor: (changes: Partial<IssueFilters>) => string;
};

/**
 * The date filters in force as chips under the toolbar, each with a way to
 * drop it, and one to drop them all.
 */
export function IssueFilterChips({ filters, hrefFor }: Props) {
    const due = activeDueFilter(filters);
    const done = activeDoneFilter(filters);
    const chips = [
        due
            ? {
                  key: 'due',
                  group: 'Due date',
                  label: due.label,
                  icon: <DateFilterIcon due={due.value} className="size-3.5" />,
                  href: hrefFor({ due: null }),
              }
            : null,
        done
            ? {
                  key: 'done',
                  group: 'Completed',
                  label: done.label,
                  icon: (
                      <DateFilterIcon done={done.value} className="size-3.5" />
                  ),
                  href: hrefFor({ done: null }),
              }
            : null,
    ].filter((chip) => chip !== null);

    if (chips.length === 0) {
        return null;
    }

    return (
        <div
            role="group"
            aria-label="Filters in force"
            data-test="filter-chips"
            className="flex flex-wrap items-center gap-1.5 border-b px-4 py-1.5"
        >
            {chips.map((chip) => (
                <span
                    key={chip.key}
                    className="inline-flex h-7 items-center gap-1.5 border bg-muted/40 pl-2 text-xs"
                >
                    {chip.icon}
                    <span className="text-muted-foreground">{chip.group}</span>
                    <span className="font-medium">{chip.label}</span>
                    <Link
                        href={chip.href}
                        preserveScroll
                        aria-label={`Remove the ${chip.group} filter`}
                        className="flex h-full w-7 items-center justify-center text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                        <X className="size-3" />
                    </Link>
                </span>
            ))}
            <Button
                size="xs"
                variant="ghost"
                nativeButton={false}
                render={
                    <Link
                        href={hrefFor({ due: null, done: null })}
                        preserveScroll
                    />
                }
            >
                Clear
            </Button>
        </div>
    );
}
