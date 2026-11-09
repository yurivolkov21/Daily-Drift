<?php

namespace App\Queries;

use App\Enums\Priority;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Support\LocalTime;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * The numbers on a team's dashboard (spec 0001 and spec 0002), from the open
 * and recently completed tasks of its active projects. Days are calendar days
 * in the viewer's time zone (spec 0003); weeks start on Monday.
 *
 * Due dates have no time, so each one is read as midnight in that zone;
 * timestamps such as `completed_at` are instants and compare as they are.
 *
 * The tasks are counted in PHP from one query, which is plenty for the sizes
 * Phase 1 targets.
 */
class TeamDashboard
{
    private const int FOCUS_LIMIT = 10;

    private CarbonImmutable $today;

    /** @var Collection<int, Task> */
    private Collection $tasks;

    /**
     * With a viewer, _My focus_ keeps their tasks and unassigned ones
     * (spec 0004); the other numbers stay team-wide.
     */
    public function __construct(
        private readonly Team $team,
        ?CarbonImmutable $now = null,
        ?string $zone = null,
        private readonly ?User $viewer = null,
    ) {
        $this->today = ($now ?? CarbonImmutable::now())->setTimezone($zone ?? LocalTime::zone())->startOfDay();
        $this->tasks = Task::query()
            ->whereHas('project', fn ($query) => $query->whereBelongsTo($this->team)->whereNull('archived_at'))
            ->with(['project:id,name,color', 'list:id,name,color'])
            ->orderBy('due_on')
            ->orderBy('position')
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $open = $this->tasks->whereNull('completed_at');
        $overdue = $open->filter(fn (Task $task) => $this->due($task)?->lt($this->today) === true);
        $dueToday = $open->filter(fn (Task $task) => $this->due($task)?->equalTo($this->today) === true);
        $nextWeek = $open->filter(function (Task $task): bool {
            $due = $this->due($task);

            return $due !== null && $due->gt($this->today) && $due->lte($this->today->addDays(7));
        });

        $monday = $this->today->startOfWeek(CarbonImmutable::MONDAY);
        $dueThisWeek = $this->tasks->filter(fn (Task $task) => $this->due($task)?->betweenIncluded($monday, $monday->addDays(6)) === true);
        $openAtMonday = $this->tasks->filter(fn (Task $task) => $task->created_at?->lt($monday)
            && ($task->completed_at === null || $task->completed_at->gte($monday)))->count();

        $days = collect(range(6, 0))->map(fn (int $ago) => $this->today->subDays($ago));

        return [
            'today' => $this->today->toDateString(),
            'activeProjects' => $this->team->projects()->active()->count(),
            'week' => [
                'due' => $dueThisWeek->count(),
                'completed' => $dueThisWeek->whereNotNull('completed_at')->count(),
            ],
            'stats' => [
                'open' => [
                    'value' => $open->count(),
                    'sinceMonday' => $open->count() - $openAtMonday,
                    'series' => $days->map(fn (CarbonImmutable $day) => $this->openAt($day->endOfDay()))->all(),
                ],
                'dueToday' => [
                    'value' => $dueToday->count(),
                    'byPriority' => collect(Priority::cases())
                        ->mapWithKeys(fn (Priority $priority) => [$priority->value => $dueToday->where('priority', $priority)->count()])
                        ->all(),
                    'series' => $days->map(fn (CarbonImmutable $day) => $this->tasks
                        ->filter(fn (Task $task) => $this->due($task)?->equalTo($day) === true)->count())->all(),
                ],
                'overdue' => [
                    'value' => $overdue->count(),
                    'projects' => $overdue->pluck('project_id')->unique()->count(),
                    'oldestOn' => $overdue->min(fn (Task $task) => $task->due_on?->toDateString()),
                    'series' => $days->map(fn (CarbonImmutable $day) => $this->overdueAt($day))->all(),
                ],
                'done' => [
                    'value' => $this->completedBetween(6, 0),
                    'previous' => $this->completedBetween(13, 7),
                    'series' => $days->map(fn (CarbonImmutable $day) => $this->completedOn($day))->all(),
                ],
            ],
            'throughput' => [
                'days' => collect(range(13, 0))->map(fn (int $ago) => [
                    'date' => $this->today->subDays($ago)->toDateString(),
                    'count' => $this->completedOn($this->today->subDays($ago)),
                ])->all(),
                'previous7' => $this->completedBetween(13, 7),
                'previous14' => $this->completedBetween(27, 14),
            ],
            'dueToday' => $this->rows($dueToday),
            'focus' => [
                'overdue' => $this->rows($overdue->filter($this->isMineOrUnassigned(...))),
                'today' => $this->rows($dueToday->filter($this->isMineOrUnassigned(...))),
                'week' => $this->rows($nextWeek->filter($this->isMineOrUnassigned(...))),
            ],
            'projects' => $this->team->projects()
                ->active()
                ->latest('updated_at')
                ->limit(5)
                ->withCount(['tasks', 'tasks as completed_tasks_count' => fn ($query) => $query->whereNotNull('completed_at')])
                ->get()
                ->map(fn (Project $project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'color' => $project->color->value,
                    'tasks' => (int) $project->getAttribute('tasks_count'),
                    'completed' => (int) $project->getAttribute('completed_tasks_count'),
                ])
                ->all(),
        ];
    }

    private function isMineOrUnassigned(Task $task): bool
    {
        return $this->viewer === null || $task->assignee_id === null || $task->assignee_id === $this->viewer->id;
    }

    private function openAt(CarbonImmutable $moment): int
    {
        return $this->tasks->filter(fn (Task $task) => $task->created_at?->lte($moment)
            && ($task->completed_at === null || $task->completed_at->gt($moment)))->count();
    }

    private function overdueAt(CarbonImmutable $day): int
    {
        $end = $day->endOfDay();

        return $this->tasks->filter(fn (Task $task) => $this->due($task)?->lt($day) === true
            && $task->created_at?->lte($end)
            && ($task->completed_at === null || $task->completed_at->gt($end)))->count();
    }

    private function completedOn(CarbonImmutable $day): int
    {
        $end = $day->endOfDay();

        return $this->tasks->filter(fn (Task $task) => $task->completed_at?->betweenIncluded($day, $end) === true)->count();
    }

    /**
     * The task's due date as midnight in the viewer's time zone, so it
     * compares with the days above.
     */
    private function due(Task $task): ?CarbonImmutable
    {
        return $task->due_on === null
            ? null
            : CarbonImmutable::parse($task->due_on->toDateString(), $this->today->getTimezone());
    }

    /**
     * Tasks completed from $from days ago to $to days ago, both included.
     */
    private function completedBetween(int $from, int $to): int
    {
        $start = $this->today->subDays($from);
        $end = $this->today->subDays($to)->endOfDay();

        return $this->tasks->filter(fn (Task $task) => $task->completed_at?->betweenIncluded($start, $end) === true)->count();
    }

    /**
     * @param  Collection<int, Task>  $tasks
     * @return array{total: int, items: array<int, array<string, mixed>>}
     */
    private function rows(Collection $tasks): array
    {
        return [
            'total' => $tasks->count(),
            'items' => $tasks->take(self::FOCUS_LIMIT)->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'priority' => $task->priority->value,
                'dueOn' => $task->due_on?->toDateString(),
                'project' => [
                    'id' => $task->project->id,
                    'name' => $task->project->name,
                    'color' => $task->project->color->value,
                ],
                'list' => [
                    'id' => $task->list->id,
                    'name' => $task->list->name,
                    'color' => $task->list->color->value,
                ],
            ])->values()->all(),
        ];
    }
}
