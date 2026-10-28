import { usePage } from '@inertiajs/react';
import { addDays, format, startOfToday } from 'date-fns';
import { useState } from 'react';
import { DashboardIssueTable } from '@/components/dashboard-issue-table';
import type { IssueTableColumn } from '@/components/dashboard-issue-table';
import { daysUntilDue } from '@/lib/dashboard';
import { cn } from '@/lib/utils';
import type { Issue } from '@/types';

/**
 * The next seven days as the day cells of shadcn/ui's Calendar folded into
 * one week: a dot per issue due, in its project's color, and the picked
 * day's issues listed below. Until a day is picked, the first day with
 * something due is shown.
 */
export function WeekAgenda({
    issues,
    showAssignee,
}: {
    issues: Issue[];
    showAssignee: boolean;
}) {
    const projects = usePage().props.workspace?.projects ?? [];
    const [pickedDay, setPickedDay] = useState<number | null>(null);
    const today = startOfToday();
    const days = Array.from({ length: 7 }, (_, offset) => ({
        offset,
        date: addDays(today, offset),
        issues: issues
            .filter(
                (issue) =>
                    issue.dueDate !== null &&
                    daysUntilDue(issue.dueDate) === offset,
            )
            .sort(
                (a, b) =>
                    b.priority - a.priority ||
                    a.identifier.localeCompare(b.identifier, undefined, {
                        numeric: true,
                    }),
            ),
    }));
    const current =
        days[pickedDay ?? days.findIndex((day) => day.issues.length > 0)] ??
        days[0];
    const total = days.reduce((sum, day) => sum + day.issues.length, 0);
    const columns: IssueTableColumn[] = [
        'priority',
        'status',
        'title',
        ...(showAssignee ? (['assignee'] as const) : []),
        'project',
    ];

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-7 gap-1 p-2">
                {days.map((day) => (
                    <button
                        key={day.offset}
                        type="button"
                        aria-pressed={day === current}
                        aria-label={`${format(day.date, 'EEEE, MMM d')}: ${day.issues.length} due`}
                        onClick={() => setPickedDay(day.offset)}
                        className={cn(
                            'flex min-w-0 flex-col items-center gap-1.5 py-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40',
                            day === current &&
                                'bg-muted ring-1 ring-foreground/15',
                        )}
                    >
                        <span className="text-[0.6rem] font-semibold tracking-widest text-muted-foreground uppercase">
                            {format(day.date, 'EEE')}
                        </span>
                        <span
                            className={cn(
                                'flex size-7 items-center justify-center text-sm font-semibold tabular-nums',
                                day.offset === 0 &&
                                    'bg-primary text-primary-foreground',
                            )}
                        >
                            {format(day.date, 'd')}
                        </span>
                        <span className="flex h-1.5 items-center gap-0.5">
                            {day.issues.slice(0, 3).map((issue) => (
                                <span
                                    key={issue.id}
                                    className="size-1.5"
                                    style={{
                                        backgroundColor: projects.find(
                                            ({ id }) => id === issue.projectId,
                                        )?.color,
                                    }}
                                />
                            ))}
                            {day.issues.length > 3 ? (
                                <span className="text-[0.55rem] leading-none text-muted-foreground">
                                    +
                                </span>
                            ) : null}
                        </span>
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2 border-y bg-muted/40 px-4 py-2 text-xs">
                <span className="font-semibold">
                    {current.offset === 0
                        ? 'Today'
                        : format(current.date, 'EEEE, MMM d')}
                </span>
                <span className="text-muted-foreground">
                    {current.issues.length === 0
                        ? 'nothing due'
                        : `${current.issues.length} due`}
                </span>
                <span className="ml-auto text-muted-foreground tabular-nums">
                    {total} in 7 days
                </span>
            </div>
            {current.issues.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {total === 0
                        ? 'No due dates in the next 7 days.'
                        : 'Pick a day with dots to see what is due.'}
                </p>
            ) : (
                <DashboardIssueTable
                    issues={current.issues}
                    columns={columns}
                    header={false}
                    label={`Due ${current.offset === 0 ? 'today' : format(current.date, 'EEEE')}`}
                />
            )}
        </div>
    );
}
