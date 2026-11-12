<?php

namespace App\Queries;

use App\Enums\Priority;
use App\Http\Resources\NotificationRow;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Notifications\MentionedInComment;
use App\Notifications\TaskAssigned;
use App\Support\LocalTime;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;

/**
 * One person's notifications in one team (spec 0006): the bell's panel, the
 * notifications page and the detail of the one selected there.
 */
class NotificationFeed
{
    public const array FILTERS = ['all', 'unread', 'mentions', 'assigned'];

    public const int PANEL_LIMIT = 10;

    public const int PAGE_SIZE = 30;

    private const int RECENT_ON_TASK = 5;

    public function __construct(private readonly Team $team, private readonly User $user)
    {
        //
    }

    /**
     * Newest first, with the id to keep the order stable for the cursor.
     *
     * @return Builder<DatabaseNotification>
     */
    public function query(string $filter = 'all'): Builder
    {
        return DatabaseNotification::query()
            ->where('notifiable_type', $this->user->getMorphClass())
            ->where('notifiable_id', $this->user->getKey())
            ->where('team_id', $this->team->id)
            ->when($filter === 'unread', fn (Builder $query) => $query->whereNull('read_at'))
            ->when($filter === 'mentions', fn (Builder $query) => $query->where('type', MentionedInComment::class))
            ->when($filter === 'assigned', fn (Builder $query) => $query->where('type', TaskAssigned::class))
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    public function unreadCount(): int
    {
        return $this->query('unread')->count();
    }

    /**
     * What the bell's panel shows when it opens.
     *
     * @return array{updates: array<int, array<string, mixed>>, dueSoon: array<int, array<string, mixed>>, unread: int}
     */
    public function panel(): array
    {
        return [
            'updates' => array_values($this->rows($this->query()->limit(self::PANEL_LIMIT)->get())),
            'dueSoon' => $this->dueSoon(),
            'unread' => $this->unreadCount(),
        ];
    }

    /**
     * A page of the notifications page's list.
     *
     * @return CursorPaginator<int, NotificationRow>
     */
    public function page(string $filter): CursorPaginator
    {
        $page = $this->query($filter)->cursorPaginate(self::PAGE_SIZE);
        $rows = $this->rows(collect($page->items()));

        return $page->through(fn (DatabaseNotification $notification) => new NotificationRow($notification, $rows[$notification->id]));
    }

    /**
     * How many each filter keeps.
     *
     * @return array<string, int>
     */
    public function counts(): array
    {
        return collect(self::FILTERS)->mapWithKeys(fn (string $filter) => [$filter => $this->query($filter)->count()])->all();
    }

    public function find(string $id): ?DatabaseNotification
    {
        return $this->query()->whereKey($id)->first();
    }

    /**
     * Rows keyed by id, each knowing whether its task still exists.
     *
     * @param  Collection<int, DatabaseNotification>  $notifications
     * @return array<string, array<string, mixed>>
     */
    public function rows(Collection $notifications): array
    {
        $existing = Task::query()
            ->whereKey($notifications->pluck('data.task.id')->filter()->unique()->all())
            ->whereHas('project', fn (Builder $query) => $query->whereBelongsTo($this->team))
            ->pluck('id')
            ->flip();

        return $notifications
            ->mapWithKeys(fn (DatabaseNotification $notification) => [$notification->id => $this->row($notification, $existing->has($notification->data['task']['id'] ?? 0))])
            ->all();
    }

    /**
     * The selected notification with the task as it is now, the whole comment
     * for a mention and the task's latest events.
     *
     * @return array<string, mixed>
     */
    public function detail(DatabaseNotification $notification): array
    {
        $data = $notification->data;
        $task = Task::query()
            ->whereKey($data['task']['id'] ?? 0)
            ->whereHas('project', fn (Builder $query) => $query->whereBelongsTo($this->team))
            ->with(['project', 'list:id,name', 'assignee:id,name'])
            ->first();
        $commentId = $data['comment']['id'] ?? null;
        $comment = $task && $commentId ? $task->comments()->with('author:id,name')->whereKey($commentId)->first() : null;

        return [
            ...$this->row($notification, $task !== null),
            'task' => $task ? [
                'id' => $task->id,
                'title' => $task->title,
                'completed' => $task->isCompleted(),
                'dueOn' => $task->due_on?->toDateString(),
                'priority' => $task->priority->value,
                'list' => $task->list->name,
                'assignee' => $task->assignee ? ['id' => $task->assignee->id, 'name' => $task->assignee->name] : null,
                'project' => [
                    'id' => $task->project->id,
                    'name' => $task->project->name,
                    'color' => $task->project->color->value,
                    'archived' => $task->project->isArchived(),
                ],
            ] : null,
            'snapshot' => $data['task'] ?? null,
            'comment' => $comment ? [
                'id' => $comment->id,
                'body' => $comment->body,
                'author' => $comment->author ? ['id' => $comment->author->id, 'name' => $comment->author->name] : null,
                'createdAt' => $comment->created_at?->toISOString(),
                'mentionNames' => User::query()->whereKey($comment->mentions)->pluck('name')->all(),
            ] : null,
            'canReply' => $task !== null && $commentId !== null && $this->user->can('create', [Comment::class, $task]),
            'recent' => $task ? $this->recentOn($task, $notification) : [],
        ];
    }

    /**
     * The viewer's open tasks due today or tomorrow in their own day, in the
     * team's active projects. Worked out each time, never stored.
     *
     * @return array<int, array<string, mixed>>
     */
    public function dueSoon(?CarbonImmutable $now = null): array
    {
        $today = ($now ?? LocalTime::now())->startOfDay();
        $tomorrow = $today->addDay();
        $rank = array_flip(array_map(fn (Priority $priority) => $priority->value, Priority::cases()));

        return Task::query()
            ->where('assignee_id', $this->user->getKey())
            ->whereNull('completed_at')
            ->whereDate('due_on', '>=', $today->toDateString())
            ->whereDate('due_on', '<=', $tomorrow->toDateString())
            ->whereHas('project', fn (Builder $query) => $query->whereBelongsTo($this->team)->whereNull('archived_at'))
            ->with('project:id,name,color')
            ->get()
            ->sortBy([
                fn (Task $a, Task $b) => $a->due_on?->toDateString() <=> $b->due_on?->toDateString(),
                fn (Task $a, Task $b) => $rank[$b->priority->value] <=> $rank[$a->priority->value],
                fn (Task $a, Task $b) => $a->id <=> $b->id,
            ])
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'dueOn' => $task->due_on?->toDateString(),
                'when' => $task->due_on?->toDateString() === $today->toDateString() ? 'today' : 'tomorrow',
                'priority' => $task->priority->value,
                'project' => ['id' => $task->project->id, 'name' => $task->project->name, 'color' => $task->project->color->value],
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function row(DatabaseNotification $notification, bool $taskExists): array
    {
        $data = $notification->data;

        return [
            'id' => $notification->id,
            'kind' => $notification->type === MentionedInComment::class ? MentionedInComment::KIND : TaskAssigned::KIND,
            'read' => $notification->read_at !== null,
            'createdAt' => $notification->created_at?->toISOString(),
            'actor' => $data['actor'] ?? null,
            'task' => $data['task'] ?? null,
            'project' => $data['project'] ?? null,
            'commentId' => $data['comment']['id'] ?? null,
            'excerpt' => $data['comment']['excerpt'] ?? null,
            'gone' => ! $taskExists,
        ];
    }

    /**
     * The task's last few events, oldest first, with the one this
     * notification is about marked.
     *
     * @return array<int, array<string, mixed>>
     */
    private function recentOn(Task $task, DatabaseNotification $notification): array
    {
        $events = $task->activities()
            ->reorder()
            ->latest()
            ->latest('id')
            ->with('user:id,name')
            ->limit(self::RECENT_ON_TASK)
            ->get()
            ->reverse()
            ->values();

        $comments = Comment::query()
            ->whereKey($events->where('type', Activity::COMMENT_ADDED)->pluck('properties.comment_id')->filter()->all())
            ->pluck('body', 'id');

        $commentId = $notification->data['comment']['id'] ?? null;
        $matching = $commentId !== null
            ? $events->first(fn (Activity $event) => $event->type === Activity::COMMENT_ADDED && ($event->properties['comment_id'] ?? null) === $commentId)
            : $events
                ->filter(fn (Activity $event) => $event->type === Activity::TASK_ASSIGNED
                    && ($event->properties['id'] ?? null) === $this->user->getKey()
                    && $event->created_at?->lte($notification->created_at?->addSecond()))
                ->last();

        return $events->map(fn (Activity $event) => [
            'id' => $event->id,
            'type' => $event->type,
            'properties' => (object) $event->properties,
            'actor' => $event->user ? ['id' => $event->user->id, 'name' => $event->user->name] : null,
            'createdAt' => $event->created_at?->toISOString(),
            'quote' => $event->type === Activity::COMMENT_ADDED
                ? str($comments->get($event->properties['comment_id'] ?? 0, ''))->squish()->limit(80)->toString() ?: null
                : null,
            'isThis' => $matching !== null && $matching->is($event),
        ])->all();
    }
}
