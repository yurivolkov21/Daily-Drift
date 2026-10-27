import { Search, X } from 'lucide-react';
import type { ReactElement, RefObject } from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    ColorPicker,
    ColorPickerArea,
    ColorPickerCopy,
    ColorPickerEyeDropper,
    ColorPickerFields,
    ColorPickerPanel,
    ColorPickerSlider,
    ColorPickerSwatches,
} from '@/components/ui/color-picker';
import { IconTile } from '@/components/ui/icon-tile';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { labelColors } from '@/lib/issues';
import { projectIconComponent, projectIconGroups } from '@/lib/project-icons';
import { cn } from '@/lib/utils';

export type ProjectAppearance = { icon: string; color: string };

/**
 * The icon grid, laid out like ReUI's emoji picker: a search box, a bar of
 * group buttons and a grid with a heading per group. Search runs across
 * every group.
 */
function IconGrid({
    value,
    onChange,
    searchRef,
}: {
    value: ProjectAppearance;
    onChange: (icon: string) => void;
    searchRef: RefObject<HTMLInputElement | null>;
}) {
    const [query, setQuery] = useState('');
    const [activeGroup, setActiveGroup] = useState(projectIconGroups[0].value);
    const gridRef = useRef<HTMLDivElement>(null);
    const needle = query.trim().toLowerCase();
    const results = needle
        ? [
              ...new Set(
                  projectIconGroups.flatMap((group) =>
                      group.icons.filter(
                          (name) =>
                              name.replaceAll('-', ' ').includes(needle) ||
                              group.label.toLowerCase().includes(needle),
                      ),
                  ),
              ),
          ]
        : null;

    const jumpTo = (group: string) => {
        setQuery('');
        setActiveGroup(group);
        requestAnimationFrame(() => {
            const section = gridRef.current?.querySelector<HTMLElement>(
                `[data-group="${group}"]`,
            );

            if (gridRef.current && section) {
                gridRef.current.scrollTop = section.offsetTop;
            }
        });
    };

    const followScroll = () => {
        const grid = gridRef.current;

        if (!grid || needle) {
            return;
        }

        const current = [...grid.querySelectorAll<HTMLElement>('[data-group]')]
            .filter((section) => section.offsetTop <= grid.scrollTop + 8)
            .pop();

        if (current?.dataset.group) {
            setActiveGroup(current.dataset.group);
        }
    };

    const tile = (name: string) => {
        const Glyph = projectIconComponent(name);
        const selected = value.icon === name;

        return (
            <IconTile
                key={name}
                render={<button type="button" />}
                role="radio"
                aria-checked={selected}
                aria-label={name.replaceAll('-', ' ')}
                title={name.replaceAll('-', ' ')}
                variant={selected ? 'soft' : 'outline'}
                size="sm"
                className={cn(
                    'cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                    !selected &&
                        'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-transparent',
                )}
                style={selected ? { color: value.color } : undefined}
                onClick={() => onChange(name)}
            >
                <Glyph />
            </IconTile>
        );
    };

    return (
        <div className="flex flex-col gap-2">
            <InputGroup>
                <InputGroupAddon>
                    <Search />
                </InputGroupAddon>
                <InputGroupInput
                    ref={searchRef}
                    aria-label="Find an icon"
                    placeholder="Find an icon..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                {query ? (
                    <InputGroupAddon align="inline-end">
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Clear the search"
                            onClick={() => setQuery('')}
                        >
                            <X />
                        </Button>
                    </InputGroupAddon>
                ) : null}
            </InputGroup>

            <div
                role="tablist"
                aria-label="Icon groups"
                className="flex items-center justify-between gap-0.5"
            >
                {projectIconGroups.map((group) => {
                    const Glyph = projectIconComponent(group.icon);
                    const isActive = !needle && activeGroup === group.value;

                    return (
                        <Tooltip key={group.value}>
                            <TooltipTrigger
                                render={
                                    <Button
                                        variant={
                                            isActive ? 'secondary' : 'ghost'
                                        }
                                        size="icon-xs"
                                        role="tab"
                                        aria-selected={isActive}
                                        aria-label={group.label}
                                        onClick={() => jumpTo(group.value)}
                                    />
                                }
                            >
                                <Glyph />
                            </TooltipTrigger>
                            <TooltipContent>{group.label}</TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>

            <div
                ref={gridRef}
                role="radiogroup"
                aria-label="Icon"
                onScroll={followScroll}
                className="relative h-52 scroll-fade-b overflow-y-auto"
            >
                {results ? (
                    results.length > 0 ? (
                        <div className="grid grid-cols-8 gap-0.5 pt-1">
                            {results.map(tile)}
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No icon matches “{query}”.
                        </p>
                    )
                ) : (
                    projectIconGroups.map((group) => (
                        <div
                            key={group.value}
                            data-group={group.value}
                            className="pb-2"
                        >
                            <div className="sticky top-0 z-10 bg-popover py-1 text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                                {group.label}
                            </div>
                            <div className="grid grid-cols-8 gap-0.5">
                                {group.icons.map(tile)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * The palette first, then any color from the ReUI color picker: the area,
 * the hue slider and HEX, RGB or HSL fields. A custom color joins the
 * palette row so it stays one click away.
 */
function ColorPanel({
    value,
    onChange,
}: {
    value: string;
    onChange: (color: string) => void;
}) {
    const swatches = labelColors.includes(value)
        ? labelColors
        : [...labelColors, value];

    return (
        <ColorPicker
            value={value}
            onValueChange={(color) => color && onChange(color)}
            format="hex"
            aria-label="Project color"
        >
            <ColorPickerPanel>
                <ColorPickerSwatches
                    colors={swatches}
                    shape="circle"
                    className="[--color-picker-swatch-size:--spacing(6)]"
                />
                <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    Any color
                    <span className="h-px flex-1 bg-border" />
                </div>
                <ColorPickerArea className="h-32" />
                <div className="flex items-center gap-3">
                    <ColorPickerEyeDropper />
                    <div className="flex min-w-0 flex-1 flex-col">
                        <ColorPickerSlider channel="hue" />
                    </div>
                    <ColorPickerCopy />
                </div>
                <ColorPickerFields formats={['hex', 'rgb', 'hsl']} />
            </ColorPickerPanel>
        </ColorPicker>
    );
}

/**
 * Opens the icon and color picker from any trigger. The two tabs split the
 * top edge evenly, so more tabs can join later.
 */
export function ProjectAppearancePicker({
    value,
    onChange,
    children,
}: {
    value: ProjectAppearance;
    onChange: (appearance: Partial<ProjectAppearance>) => void;
    children: ReactElement;
}) {
    const [open, setOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const Glyph = projectIconComponent(value.icon);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={children} />
            <PopoverContent
                align="center"
                initialFocus={searchRef}
                className="w-80 gap-0 p-0"
            >
                <Tabs defaultValue="icon" className="gap-0">
                    <TabsList
                        variant="line"
                        className="w-full border-b p-0 px-2"
                    >
                        <TabsTrigger value="icon">
                            <Glyph style={{ color: value.color }} />
                            Icon
                        </TabsTrigger>
                        <TabsTrigger value="color">
                            <span
                                className="size-3 rounded-full"
                                style={{ backgroundColor: value.color }}
                            />
                            Color
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="icon" className="p-3">
                        <IconGrid
                            value={value}
                            onChange={(icon) => onChange({ icon })}
                            searchRef={searchRef}
                        />
                    </TabsContent>
                    <TabsContent value="color" className="p-3">
                        <ColorPanel
                            value={value.color}
                            onChange={(color) => onChange({ color })}
                        />
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}
