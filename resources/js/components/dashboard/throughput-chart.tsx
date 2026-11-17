import { format, parseISO } from 'date-fns';
import { useId, useState } from 'react';
import { Card, CardTitle } from '@/components/dashboard/cards';
import { SegmentedTabs } from '@/components/segmented-tabs';
import type { DashboardData } from '@/types';

const WIDTH = 640;
const HEIGHT = 200;

/**
 * Tasks completed per day as a smooth line that draws itself, over 7 or 14
 * days, compared with the period before.
 */
export function ThroughputChart({
    throughput,
}: {
    throughput: DashboardData['throughput'];
}) {
    const [range, setRange] = useState<'7' | '14'>('14');
    const clipId = `throughput-${useId().replace(/[^\w-]/g, '')}`;
    const days = throughput.days.slice(-Number(range));
    const total = days.reduce((sum, day) => sum + day.count, 0);
    const before = range === '7' ? throughput.previous7 : throughput.previous14;
    const change =
        before === 0 ? null : Math.round(((total - before) / before) * 100);
    const top = Math.max(4, ...days.map((day) => day.count));

    const points = days.map((day, index) => ({
        ...day,
        x:
            Math.round((index / Math.max(1, days.length - 1)) * (WIDTH - 10)) +
            5,
        y: Math.round(HEIGHT - 10 - (day.count / top) * (HEIGHT - 30)),
    }));
    const line = points.reduce((path, point, index) => {
        if (index === 0) {
            return `M ${point.x} ${point.y}`;
        }

        const previous = points[index - 1];
        const middle = Math.round((previous.x + point.x) / 2);

        return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
    }, '');
    const last = points[points.length - 1];

    return (
        <Card delay={320} className="md:col-span-2">
            <CardTitle
                aside={
                    <SegmentedTabs
                        label="Range"
                        value={range}
                        onChange={setRange}
                        options={[
                            { value: '7', label: '7 days' },
                            { value: '14', label: '14 days' },
                        ]}
                    />
                }
            >
                <span className="flex flex-col">
                    Throughput
                    <span className="mt-1 font-sans text-[13px] font-normal text-muted-foreground">
                        {total} {total === 1 ? 'task' : 'tasks'} completed
                        {change !== null && (
                            <>
                                {' · '}
                                <span
                                    className={
                                        change >= 0
                                            ? 'font-semibold text-green-700 dark:text-green-400'
                                            : 'font-semibold text-red-700 dark:text-red-400'
                                    }
                                >
                                    {change >= 0 ? '+' : ''}
                                    {change}%
                                </span>{' '}
                                vs the {range} days before
                            </>
                        )}
                    </span>
                </span>
            </CardTitle>
            {/*
              The SVG stretches to the card (preserveAspectRatio="none"), so
              the line keeps a 3px stroke with non-scaling-stroke and draws
              itself through a clip that widens, not with stroke dashes:
              dashes are measured in the SVG's own units and fell short of
              the stretched line on wide screens. The last point is an HTML
              dot laid over the SVG, so it stays round.
            */}
            <div key={range} className="relative h-52">
                <svg
                    role="img"
                    aria-label={`Tasks completed per day over the last ${range} days: ${days.map((day) => day.count).join(', ')}`}
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 size-full overflow-visible"
                >
                    <defs>
                        <clipPath id={clipId}>
                            <rect
                                x={-10}
                                y={-10}
                                width={WIDTH + 20}
                                height={HEIGHT + 20}
                                className="origin-left animate-fill animation-duration-[1.6s] [animation-delay:450ms] transform-fill"
                            />
                        </clipPath>
                    </defs>
                    {[50, 100, 150].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            x2={WIDTH}
                            y1={y}
                            y2={y}
                            className="stroke-border"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    <path
                        d={`${line} L ${last.x} ${HEIGHT} L ${points[0].x} ${HEIGHT} Z`}
                        className="animate-fade fill-primary/10 [animation-delay:1s]"
                    />
                    <path
                        d={line}
                        clipPath={`url(#${clipId})`}
                        fill="none"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className="stroke-primary"
                    />
                    {points.map((point) => (
                        <circle
                            key={point.date}
                            cx={point.x}
                            cy={point.y}
                            r={10}
                            className="fill-transparent"
                        >
                            <title>
                                {`${format(parseISO(point.date), 'EEE d MMM')}: ${point.count} completed`}
                            </title>
                        </circle>
                    ))}
                </svg>
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute size-3.5 -translate-1/2 animate-fade rounded-full border-[3px] border-primary bg-card animation-duration-[0.6s] [animation-delay:1.6s]"
                    style={{
                        left: `${(last.x / WIDTH) * 100}%`,
                        top: `${(last.y / HEIGHT) * 100}%`,
                    }}
                />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{format(parseISO(days[0].date), 'd MMM')}</span>
                <span>Today</span>
            </div>
        </Card>
    );
}
