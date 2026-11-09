import { SegmentedTabs } from '@/components/segmented-tabs';
import type { Hue } from '@/lib/hues';
import { HUE_NAMES, HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import type { ProjectFilters, ProjectHealth } from '@/types';

type Props = {
    open: boolean;
    filters: ProjectFilters;
    onChange: (changes: Partial<ProjectFilters>) => void;
};

/**
 * Health and color filters in a row that slides open under the toolbar.
 * Health only applies to the Active tab.
 */
export function FilterPanel({ open, filters, onChange }: Props) {
    const toggleColor = (hue: Hue) =>
        onChange({
            colors: filters.colors.includes(hue)
                ? filters.colors.filter((color) => color !== hue)
                : [...filters.colors, hue],
        });
    const narrowed = filters.health !== null || filters.colors.length > 0;

    return (
        <div
            id="project-filters"
            className={cn(
                'grid transition-[grid-template-rows,opacity,margin] duration-450 ease-slide',
                open
                    ? 'grid-rows-[1fr] opacity-100'
                    : '-mt-4 grid-rows-[0fr] opacity-0',
            )}
            inert={!open}
        >
            <div className="min-h-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-muted px-4 py-3.5">
                    {filters.status === 'active' && (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                                Health
                            </span>
                            <SegmentedTabs<'all' | ProjectHealth>
                                label="Health"
                                className="bg-card"
                                value={filters.health ?? 'all'}
                                onChange={(value) =>
                                    onChange({
                                        health: value === 'all' ? null : value,
                                    })
                                }
                                options={[
                                    { value: 'all', label: 'All' },
                                    {
                                        value: 'attention',
                                        label: 'Needs attention',
                                    },
                                    { value: 'track', label: 'On track' },
                                ]}
                            />
                        </div>
                    )}
                    <fieldset className="flex items-center gap-3">
                        <legend className="float-left mr-3 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                            Color
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {HUE_NAMES.map((hue) => {
                                const on = filters.colors.includes(hue);

                                return (
                                    <button
                                        key={hue}
                                        type="button"
                                        aria-pressed={on}
                                        aria-label={HUES[hue].label}
                                        title={HUES[hue].label}
                                        onClick={() => toggleColor(hue)}
                                        className={cn(
                                            'size-6 rounded-lg transition-[box-shadow,scale,opacity] duration-200 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                            HUES[hue].dot,
                                            on &&
                                                'ring-2 ring-foreground/60 ring-offset-2 ring-offset-muted',
                                            filters.colors.length > 0 &&
                                                !on &&
                                                'opacity-40',
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </fieldset>
                    <button
                        type="button"
                        onClick={() => onChange({ health: null, colors: [] })}
                        disabled={!narrowed}
                        className="ml-auto text-sm font-semibold text-primary transition-opacity disabled:opacity-35"
                    >
                        Reset filters
                    </button>
                </div>
            </div>
        </div>
    );
}
