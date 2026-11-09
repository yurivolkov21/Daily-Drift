<?php

namespace App\Data;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;

readonly class ProjectStats
{
    public const string ATTENTION = 'attention';

    public const string ON_TRACK = 'track';

    public function __construct(
        public int $tasks,
        public int $completed,
        public int $overdue,
        public int $dueSoon,
        public int $completedRecently,
        public ?string $oldestOverdueOn,
        public string $health,
    ) {
        //
    }

    /**
     * The counts to load with a project query. "Due soon" means open tasks due
     * today or within the next 7 days; "today" is the app's timezone.
     * "Recently" and "stale" mean within and before the last 7 days.
     *
     * @return array<string, callable(Builder<Task>): mixed>|array<int, string>
     */
    public static function counts(): array
    {
        $today = now()->toDateString();
        $week = now()->addDays(7)->toDateString();
        $weekAgo = now()->subDays(7);

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
            'tasks as completed_recently_count' => fn (Builder $query) => $query
                ->where('completed_at', '>=', $weekAgo),
            'tasks as stale_open_tasks_count' => fn (Builder $query) => $query
                ->whereNull('completed_at')
                ->where('created_at', '<', $weekAgo),
        ];
    }

    /**
     * The aggregate for the oldest overdue due date, for `withMin(…, 'due_on')`.
     *
     * @return array<string, callable(Builder<Task>): mixed>
     */
    public static function oldestOverdue(): array
    {
        $today = now()->toDateString();

        return [
            'tasks as oldest_overdue_on' => fn (Builder $query) => $query
                ->whereNull('completed_at')
                ->whereDate('due_on', '<', $today),
        ];
    }

    /**
     * Read the counts loaded with `counts()` and `oldestOverdue()`.
     *
     * A project needs attention when it has overdue open tasks, or when open
     * tasks have waited more than 7 days and nothing was completed in that
     * time. Every other project, empty ones included, is on track.
     */
    public static function from(Project $project): self
    {
        $overdue = (int) $project->getAttribute('overdue_tasks_count');
        $completedRecently = (int) $project->getAttribute('completed_recently_count');
        $stale = (int) $project->getAttribute('stale_open_tasks_count');
        $oldest = $project->getAttribute('oldest_overdue_on');

        return new self(
            tasks: (int) $project->getAttribute('tasks_count'),
            completed: (int) $project->getAttribute('completed_tasks_count'),
            overdue: $overdue,
            dueSoon: (int) $project->getAttribute('due_soon_tasks_count'),
            completedRecently: $completedRecently,
            oldestOverdueOn: is_string($oldest) ? substr($oldest, 0, 10) : null,
            health: $overdue > 0 || ($stale > 0 && $completedRecently === 0) ? self::ATTENTION : self::ON_TRACK,
        );
    }
}
