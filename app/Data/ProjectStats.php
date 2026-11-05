<?php

namespace App\Data;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;

readonly class ProjectStats
{
    public function __construct(
        public int $tasks,
        public int $completed,
        public int $overdue,
        public int $dueSoon,
    ) {
        //
    }

    /**
     * The counts to load with a project query. "Due soon" means open tasks due
     * today or within the next 7 days; "today" is the app's timezone.
     *
     * @return array<string, callable(Builder<Task>): mixed>|array<int, string>
     */
    public static function counts(): array
    {
        $today = now()->toDateString();
        $week = now()->addDays(7)->toDateString();

        return [
            'tasks',
            'tasks as completed_tasks_count' => fn (Builder $query) => $query->whereNotNull('completed_at'),
            'tasks as overdue_tasks_count' => fn (Builder $query) => $query
                ->whereNull('completed_at')
                ->whereDate('due_on', '<', $today),
            'tasks as due_soon_tasks_count' => fn (Builder $query) => $query
                ->whereNull('completed_at')
                ->whereDate('due_on', '>=', $today)
                ->whereDate('due_on', '<=', $week),
        ];
    }

    /**
     * Read the counts loaded with `counts()`.
     */
    public static function from(Project $project): self
    {
        return new self(
            tasks: (int) $project->getAttribute('tasks_count'),
            completed: (int) $project->getAttribute('completed_tasks_count'),
            overdue: (int) $project->getAttribute('overdue_tasks_count'),
            dueSoon: (int) $project->getAttribute('due_soon_tasks_count'),
        );
    }
}
