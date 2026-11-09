import { format, parseISO } from 'date-fns';
import type { CSSProperties } from 'react';
import { useState } from 'react';
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
            <svg
                key={range}
                role="img"
                aria-label={`Tasks completed per day over the last ${range} days: ${days.map((day) => day.count).join(', ')}`}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="none"
                className="h-52 w-full overflow-visible"
            >
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
                    pathLength={1}
                    fill="none"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={1}
                    strokeDashoffset={0}
                    vectorEffect="non-scaling-stroke"
                    className="animate-draw stroke-primary [animation-delay:450ms] [animation-duration:1.6s]"
                    style={{ '--ring-length': 1 } as CSSProperties}
                />
                {points.map((point) => (
                    <circle
                        key={point.date}
                        cx={point.x}
                        cy={point.y}
                        r={point === last ? 6 : 10}
                        className={
                            point === last
                                ? 'animate-fade fill-card stroke-primary [animation-delay:1s]'
                                : 'fill-transparent'
                        }
                        strokeWidth={point === last ? 3 : 0}
                        vectorEffect="non-scaling-stroke"
                    >
                        <title>
                            {`${format(parseISO(point.date), 'EEE d MMM')}: ${point.count} completed`}
                        </title>
                    </circle>
                ))}
            </svg>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{format(parseISO(days[0].date), 'd MMM')}</span>
                <span>Today</span>
            </div>
        </Card>
    );
}
