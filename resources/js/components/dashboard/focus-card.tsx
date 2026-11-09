import { Link } from '@inertiajs/react';
import { DueLabel, PriorityPill } from '@/components/board/task-badges';
import { Card, CardTitle, completeTask } from '@/components/dashboard/cards';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { HUES } from '@/lib/hues';
import { cn } from '@/lib/utils';
import { show as showProject } from '@/routes/projects';
import type { DashboardData, FocusGroup } from '@/types';

const GROUPS: { value: FocusGroup; label: string; empty: string }[] = [
    { value: 'overdue', label: 'Overdue', empty: 'Nothing is overdue.' },
    { value: 'today', label: 'Today', empty: 'Nothing is due today.' },
    {
        value: 'week',
        label: 'Next 7 days',
        empty: 'Nothing is due in the next 7 days.',
    },
];

/** Open tasks with a due date, in three tabs. */
export function FocusCard({
    teamSlug,
    focus,
    group,
    onGroupChange,
}: {
    teamSlug: string;
    focus: DashboardData['focus'];
    group: FocusGroup;
    onGroupChange: (group: FocusGroup) => void;
}) {
    const { items, total } = focus[group];

    return (
        <Card delay={440} className="md:col-span-2">
            <div id="my-focus" className="scroll-mt-4">
                <CardTitle
                    aside={
                        <SegmentedTabs
                            label="Due"
                            className="w-full sm:w-auto"
                            value={group}
                            onChange={onGroupChange}
                            options={GROUPS.map(({ value, label }) => ({
                                value,
                                label,
                                count: focus[value].total,
                            }))}
                        />
                    }
                >
                    My focus
                </CardTitle>
            </div>
            {items.length === 0 ? (
                <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
                    {GROUPS.find((item) => item.value === group)?.empty}
                </p>
            ) : (
                <ul key={group} className="flex flex-col gap-1.5">
                    {items.map((task, index) => (
                        <li
                            key={task.id}
                            className="flex animate-rise flex-wrap items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-secondary/60"
                            style={{ animationDelay: `${index * 60}ms` }}
                        >
                            <Checkbox
                                aria-label={`Complete ${task.title}`}
                                className="size-[18px] rounded-full"
                                onCheckedChange={() =>
                                    completeTask(teamSlug, task)
                                }
                            />
                            <span className="flex min-w-0 flex-[1_1_14rem] flex-col gap-0.5">
                                <Link
                                    href={`${showProject({ current_team: teamSlug, project: task.project.id }).url}?task=${task.id}`}
                                    className="truncate text-sm font-semibold text-foreground no-underline hover:text-primary"
                                >
                                    {task.title}
                                </Link>
                                <span className="flex items-center gap-1.5 truncate text-[12.5px] text-muted-foreground">
                                    <span
                                        className={cn(
                                            'size-2 shrink-0 rounded-[3px]',
                                            HUES[task.project.color].dot,
                                        )}
                                    />
                                    {task.project.name} · {task.list.name}
                                </span>
                            </span>
                            <PriorityPill priority={task.priority} />
                            <DueLabel
                                task={{ dueOn: task.dueOn, completedAt: null }}
                                className="min-w-24 justify-end"
                            />
                        </li>
                    ))}
                </ul>
            )}
            {total > items.length && (
                <p className="text-xs text-muted-foreground">
                    Showing {items.length} of {total}.
                </p>
            )}
        </Card>
    );
}
