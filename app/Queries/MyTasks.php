<?php

namespace App\Queries;

use App\Enums\Priority;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Support\LocalTime;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * The _My tasks_ page (spec 0004): open tasks assigned to one person in a
 * team's active projects, grouped by the person's own day (spec 0003), and
 * what they completed in the last 7 days.
 */
class MyTasks
{
    public const array GROUPS = ['overdue', 'today', 'week', 'later', 'none'];

    private const int DONE_LIMIT = 20;

    private CarbonImmutable $now;

    public function __construct(
        private readonly Team $team,
        private readonly User $user,
        private readonly ?int $projectId = null,
        ?CarbonImmutable $now = null,
        ?string $zone = null,
    ) {
        $this->now = ($now ?? CarbonImmutable::now())->setTimezone($zone ?? LocalTime::zone());
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $open = $this->query()->whereNull('completed_at')->get();
        $shown = $this->projectId === null ? $open : $open->where('project_id', $this->projectId);

        $today = $this->now->toDateString();
        $weekEnd = $this->now->addDays(7)->toDateString();
        $rank = array_flip(array_map(fn (Priority $priority) => $priority->value, Priority::cases()));

        $groups = collect(self::GROUPS)->mapWithKeys(fn (string $group) => [$group => []])->all();

        $shown
            ->sortBy([
                fn (Task $a, Task $b) => ($a->due_on?->toDateString() ?? '9999') <=> ($b->due_on?->toDateString() ?? '9999'),
                fn (Task $a, Task $b) => $rank[$b->priority->value] <=> $rank[$a->priority->value],
                fn (Task $a, Task $b) => $a->position <=> $b->position,
            ])
            ->each(function (Task $task) use (&$groups, $today, $weekEnd) {
                $due = $task->due_on?->toDateString();
                $group = match (true) {
                    $due === null => 'none',
                    $due < $today => 'overdue',
                    $due === $today => 'today',
                    $due <= $weekEnd => 'week',
                    default => 'later',
                };
                $groups[$group][] = $this->row($task);
            });

        return [
            'today' => $today,
            'groups' => $groups,
            'done' => $this->query()
                ->where('completed_at', '>=', $this->now->subDays(7))
                ->when($this->projectId !== null, fn (Builder $query) => $query->where('project_id', $this->projectId))
                ->latest('completed_at')
                ->limit(self::DONE_LIMIT)
                ->get()
                ->map(fn (Task $task) => $this->row($task))
                ->all(),
            'projects' => $open
                ->groupBy('project_id')
                ->map(fn (Collection $tasks) => [
                    'id' => $tasks->first()->project->id,
                    'name' => $tasks->first()->project->name,
                    'color' => $tasks->first()->project->color->value,
                    'count' => $tasks->count(),
                ])
                ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                ->values()
                ->all(),
            'openCount' => $open->count(),
        ];
    }

    /**
     * Tasks assigned to the user in the team's active projects.
     *
     * @return Builder<Task>
     */
    private function query(): Builder
    {
        return Task::query()
            ->where('assignee_id', $this->user->id)
            ->whereHas('project', fn (Builder $query) => $query->whereBelongsTo($this->team)->whereNull('archived_at'))
            ->with(['project:id,name,color', 'list:id,name,color']);
    }

    /**
     * @return array<string, mixed>
     */
    private function row(Task $task): array
    {
        /** @var Project $project */
        $project = $task->project;

        return [
            'id' => $task->id,
            'title' => $task->title,
            'priority' => $task->priority->value,
            'dueOn' => $task->due_on?->toDateString(),
            'completedAt' => $task->completed_at?->toISOString(),
            'project' => ['id' => $project->id, 'name' => $project->name, 'color' => $project->color->value],
            'list' => ['id' => $task->list->id, 'name' => $task->list->name, 'color' => $task->list->color->value],
        ];
    }
}
