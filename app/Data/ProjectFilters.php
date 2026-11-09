<?php

namespace App\Data;

use App\Enums\Hue;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * The projects page's tab, view, sort and filters, read from the query
 * string. Unknown values fall back to the defaults instead of failing, so an
 * old or hand-edited link still opens the page.
 */
readonly class ProjectFilters
{
    public const array STATUSES = ['active', 'archived'];

    public const array VIEWS = ['grid', 'list'];

    public const array SORTS = ['updated', 'name', 'progress', 'overdue'];

    public const array HEALTHS = [ProjectStats::ATTENTION, ProjectStats::ON_TRACK];

    /**
     * @param  array<int, string>  $colors
     */
    public function __construct(
        public string $status = 'active',
        public string $view = 'grid',
        public string $sort = 'updated',
        public ?string $health = null,
        public array $colors = [],
    ) {
        //
    }

    public static function fromRequest(Request $request): self
    {
        $pick = fn (string $key, array $allowed, ?string $default) => in_array($request->query($key), $allowed, true)
            ? (string) $request->query($key)
            : $default;

        // The last view chosen is remembered in a cookie for links without one.
        $view = $pick('view', self::VIEWS, null)
            ?? (in_array($request->cookie('projects_view'), self::VIEWS, true) ? (string) $request->cookie('projects_view') : 'grid');

        $colors = collect(explode(',', (string) $request->query('color', '')))
            ->filter(fn (string $color) => Hue::tryFrom($color) !== null)
            ->unique()
            ->values()
            ->all();

        return new self(
            status: $pick('status', self::STATUSES, 'active'),
            view: $view,
            sort: $pick('sort', self::SORTS, 'updated'),
            health: $pick('health', self::HEALTHS, null),
            colors: $colors,
        );
    }

    /**
     * Keep the projects of the chosen tab that match the filters, in the
     * chosen order. Health only applies to active projects.
     *
     * @param  Collection<int, ProjectData>  $projects
     * @return Collection<int, ProjectData>
     */
    public function apply(Collection $projects): Collection
    {
        $archived = $this->status === 'archived';

        return $projects
            ->filter(fn (ProjectData $project) => ($project->archivedAt !== null) === $archived)
            ->filter(fn (ProjectData $project) => $archived || $this->health === null || $project->stats->health === $this->health)
            ->filter(fn (ProjectData $project) => $this->colors === [] || in_array($project->color, $this->colors, true))
            ->sort($this->comparator())
            ->values();
    }

    /**
     * @return callable(ProjectData, ProjectData): int
     */
    private function comparator(): callable
    {
        $recent = fn (ProjectData $a, ProjectData $b): int => strcmp((string) $b->updatedAt, (string) $a->updatedAt);
        $progress = fn (ProjectData $project): float => $project->stats->tasks === 0
            ? 0.0
            : $project->stats->completed / $project->stats->tasks;

        return match ($this->sort) {
            'name' => fn (ProjectData $a, ProjectData $b): int => strnatcasecmp($a->name, $b->name),
            'progress' => fn (ProjectData $a, ProjectData $b): int => ($progress($a) <=> $progress($b)) ?: $recent($a, $b),
            'overdue' => fn (ProjectData $a, ProjectData $b): int => ($b->stats->overdue <=> $a->stats->overdue) ?: $recent($a, $b),
            default => $recent,
        };
    }

    /**
     * @return array{status: string, view: string, sort: string, health: string|null, colors: array<int, string>}
     */
    public function toArray(): array
    {
        return [
            'status' => $this->status,
            'view' => $this->view,
            'sort' => $this->sort,
            'health' => $this->health,
            'colors' => $this->colors,
        ];
    }
}
