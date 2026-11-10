<?php

namespace App\Queries;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\Team;
use Illuminate\Database\Eloquent\Builder;

/**
 * The dashboard's _Activity_ card (spec 0005): the latest events in a
 * team's active projects, newest first.
 */
class TeamFeed
{
    public const array FILTERS = ['all', 'comments', 'completed'];

    private const int LIMIT = 10;

    public function __construct(private readonly Team $team, private readonly string $filter = 'all')
    {
        //
    }

    /**
     * @return array{filter: string, items: array<int, array<string, mixed>>}
     */
    public function toArray(): array
    {
        $events = Activity::query()
            ->where('team_id', $this->team->id)
            ->whereHas('project', fn (Builder $query) => $query->whereNull('archived_at'))
            // An event whose task is gone can only say that it was deleted.
            ->where(fn (Builder $query) => $query->whereNotNull('task_id')->orWhere('type', Activity::TASK_DELETED))
            ->when($this->filter === 'comments', fn (Builder $query) => $query->where('type', Activity::COMMENT_ADDED))
            ->when($this->filter === 'completed', fn (Builder $query) => $query->where('type', Activity::TASK_COMPLETED))
            ->with(['user:id,name', 'task:id,title', 'project:id,name,color'])
            ->latest()
            ->latest('id')
            ->limit(self::LIMIT)
            ->get();

        $comments = Comment::query()
            ->whereKey($events->where('type', Activity::COMMENT_ADDED)->pluck('properties.comment_id')->filter()->all())
            ->pluck('body', 'id');

        return [
            'filter' => $this->filter,
            'items' => $events->map(fn (Activity $event) => [
                'id' => $event->id,
                'type' => $event->type,
                'properties' => (object) $event->properties,
                'actor' => $event->user ? ['id' => $event->user->id, 'name' => $event->user->name] : null,
                'task' => $event->task ? ['id' => $event->task->id, 'title' => $event->task->title] : null,
                'project' => ['id' => $event->project->id, 'name' => $event->project->name, 'color' => $event->project->color->value],
                'quote' => $event->type === Activity::COMMENT_ADDED
                    ? str($comments->get($event->properties['comment_id'] ?? 0, ''))->squish()->limit(120)->toString() ?: null
                    : null,
                'createdAt' => $event->created_at?->toISOString(),
            ])->all(),
        ];
    }
}
