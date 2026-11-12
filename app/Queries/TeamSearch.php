<?php

namespace App\Queries;

use App\Models\Label;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * The Ctrl K box (spec 0007): tasks by title, description and label name,
 * projects by name and description, in one team. Matching ignores case;
 * accents count until PostgreSQL arrives in Phase 3.
 */
class TeamSearch
{
    public const int MIN_LENGTH = 2;

    private const int TASKS = 8;

    private const int PROJECTS = 5;

    /** How many candidates to read before ranking them. */
    private const int CANDIDATES = 60;

    private readonly string $needle;

    public function __construct(private readonly Team $team, string $query)
    {
        $this->needle = mb_strtolower(trim($query));
    }

    /**
     * @return array{query: string, tasks: array<int, array<string, mixed>>, projects: array<int, array<string, mixed>>}
     */
    public function toArray(): array
    {
        if (mb_strlen($this->needle) < self::MIN_LENGTH) {
            return ['query' => $this->needle, 'tasks' => [], 'projects' => []];
        }

        return ['query' => $this->needle, 'tasks' => $this->tasks(), 'projects' => $this->projects()];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function tasks(): array
    {
        $like = '%'.$this->needle.'%';

        return Task::query()
            ->whereHas('project', fn (Builder $query) => $query->whereBelongsTo($this->team))
            ->where(fn (Builder $query) => $query
                ->whereLike('title', $like)
                ->orWhereLike('description', $like)
                ->orWhereHas('labels', fn (Builder $labels) => $labels->whereLike('name', $like)))
            ->with(['project:id,name,color,archived_at', 'list:id,name', 'labels:id,name,icon', 'assignee:id,name'])
            ->latest('updated_at')
            ->limit(self::CANDIDATES)
            ->get()
            ->sortBy([
                fn (Task $a, Task $b) => $this->taskRank($a) <=> $this->taskRank($b),
                fn (Task $a, Task $b) => $this->closed($a) <=> $this->closed($b),
                fn (Task $a, Task $b) => $b->updated_at <=> $a->updated_at,
            ])
            ->take(self::TASKS)
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'project' => ['id' => $task->project->id, 'name' => $task->project->name, 'color' => $task->project->color->value],
                'list' => $task->list->name,
                'labels' => $task->labels->map(fn (Label $label) => $label->toSummary())->values()->all(),
                'assignee' => $task->assignee ? ['id' => $task->assignee->id, 'name' => $task->assignee->name] : null,
                'completed' => $task->isCompleted(),
                'archived' => $task->project->isArchived(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function projects(): array
    {
        $like = '%'.$this->needle.'%';

        return $this->team->projects()
            ->where(fn (Builder $query) => $query->whereLike('name', $like)->orWhereLike('description', $like))
            ->latest('updated_at')
            ->limit(self::CANDIDATES)
            ->get()
            ->sortBy([
                fn (Project $a, Project $b) => $this->textRank($a->name) <=> $this->textRank($b->name),
                fn (Project $a, Project $b) => $a->isArchived() <=> $b->isArchived(),
                fn (Project $a, Project $b) => $b->updated_at <=> $a->updated_at,
            ])
            ->take(self::PROJECTS)
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'color' => $project->color->value,
                'archived' => $project->isArchived(),
            ])
            ->values()
            ->all();
    }

    /**
     * 0: the title starts with the words; 1: it contains them; 2: a label
     * matches; 3: only the description does.
     */
    private function taskRank(Task $task): int
    {
        $rank = $this->textRank($task->title);

        if ($rank < 2) {
            return $rank;
        }

        /** @var Collection<int, Label> $labels */
        $labels = $task->labels;

        return $labels->contains(fn (Label $label) => str_contains(mb_strtolower($label->name), $this->needle)) ? 2 : 3;
    }

    private function textRank(string $text): int
    {
        $text = mb_strtolower($text);

        return match (true) {
            str_starts_with($text, $this->needle) => 0,
            str_contains($text, $this->needle) => 1,
            default => 3,
        };
    }

    /**
     * 0: open in an active project; 1: completed; 2: in an archived project.
     */
    private function closed(Task $task): int
    {
        return match (true) {
            $task->project->isArchived() => 2,
            $task->isCompleted() => 1,
            default => 0,
        };
    }
}
