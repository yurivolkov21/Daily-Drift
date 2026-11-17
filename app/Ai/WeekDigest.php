<?php

namespace App\Ai;

use App\Enums\Priority;
use App\Models\Activity;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * What the weekly summary is written from (spec 0011): the project's last
 * 7 days of history and its open tasks, as plain lines. Comments and files
 * appear only as "commented on" and "attached a file to".
 */
final class WeekDigest
{
    public const int DAYS = 7;

    /** The most events sent; the latest ones are kept. */
    public const int EVENTS = 300;

    /** The most tasks sent in each list of open tasks. */
    public const int TASKS = 20;

    public readonly string $startsOn;

    public readonly string $endsOn;

    /** @var Collection<int, Activity> */
    private Collection $events;

    private int $eventCount;

    private int $completed;

    /** @var Collection<int, Task> */
    private Collection $overdue;

    /** @var Collection<int, Task> */
    private Collection $upcoming;

    /** @var Collection<int, Task> */
    private Collection $unassigned;

    /** @var Collection<int, TaskList> */
    private Collection $lists;

    /**
     * @param  string  $today  The person's today, as Y-m-d.
     * @param  string  $zone  The person's time zone.
     */
    public function __construct(private readonly Project $project, string $today, private readonly string $zone)
    {
        $end = CarbonImmutable::parse($today, $zone)->startOfDay();
        $this->endsOn = $end->toDateString();
        $this->startsOn = $end->subDays(self::DAYS - 1)->toDateString();

        $window = fn () => Activity::query()
            ->where('project_id', $project->id)
            ->where('created_at', '>=', CarbonImmutable::parse($this->startsOn, $zone)->utc())
            ->where('created_at', '<', $end->addDay()->utc());

        $this->eventCount = $window()->count();
        $this->completed = $window()->where('type', Activity::TASK_COMPLETED)->count();
        $this->events = $window()
            ->with(['user:id,name', 'task:id,title'])
            ->latest('id')
            ->limit(self::EVENTS)
            ->get()
            ->reverse()
            ->values();

        $open = fn () => $project->tasks()->whereNull('completed_at')->with('assignee:id,name');

        $this->overdue = $open()->where('due_on', '<', $this->endsOn)->orderBy('due_on')->limit(self::TASKS)->get();
        $this->upcoming = $open()
            ->whereBetween('due_on', [$this->endsOn, $end->addDays(self::DAYS)->toDateString()])
            ->orderBy('due_on')
            ->limit(self::TASKS)
            ->get();
        $this->unassigned = $open()
            ->whereNull('assignee_id')
            ->whereIn('priority', [Priority::Urgent->value, Priority::High->value])
            ->orderBy('position')
            ->limit(self::TASKS)
            ->get();
        $this->lists = $project->lists()
            ->withCount(['tasks as open_count' => fn (Builder $query) => $query->whereNull('completed_at')])
            ->withCount('tasks')
            ->get();
    }

    /**
     * Nothing happened and nothing is late or due soon: no summary to write.
     */
    public function isQuiet(): bool
    {
        return $this->eventCount === 0 && $this->overdue->isEmpty() && $this->upcoming->isEmpty();
    }

    public function toText(): string
    {
        $lines = [
            'Project: '.$this->project->name,
            'Today: '.$this->day($this->endsOn, withYear: true),
            'The 7 days: '.$this->day($this->startsOn).' to '.$this->day($this->endsOn, withYear: true),
            '',
            'Lists, with their open tasks now:',
            ...$this->lists->map(fn (TaskList $list) => $list->is_done
                ? "- {$list->name} (the Done list): {$list->getAttribute('tasks_count')} tasks"
                : "- {$list->name}: {$list->getAttribute('open_count')} open"),
            "Tasks completed in the 7 days: {$this->completed}",
            '',
            $this->eventCount > $this->events->count()
                ? "Events in the 7 days, oldest first (the {$this->events->count()} latest of {$this->eventCount}):"
                : 'Events in the 7 days, oldest first:',
            ...$this->bullets($this->events->map($this->event(...))->all()),
            '',
            'Open tasks past their due date:',
            ...$this->bullets($this->overdue->map($this->task(...))->all()),
            '',
            'Open tasks due in the next 7 days:',
            ...$this->bullets($this->upcoming->map($this->task(...))->all()),
            '',
            'Open urgent or high-priority tasks that nobody is assigned to:',
            ...$this->bullets($this->unassigned->map($this->task(...))->all()),
        ];

        return implode("\n", $lines);
    }

    /**
     * @param  array<int, string>  $items
     * @return list<string>
     */
    private function bullets(array $items): array
    {
        return $items === [] ? ['- none'] : array_values(array_map(fn (string $item) => "- {$item}", $items));
    }

    private function event(Activity $event): string
    {
        $properties = $event->properties;
        $text = fn (string $key): string => is_scalar($properties[$key] ?? null) ? (string) $properties[$key] : '';
        $task = '"'.($event->task->title ?? ($text('title') ?: 'a task')).'"';

        $what = match ($event->type) {
            Activity::TASK_CREATED => "created {$task}"
                .(($properties['drafted'] ?? false) === true ? ' from an AI draft' : '')
                .($text('list') !== '' ? " in {$text('list')}" : ''),
            Activity::TASK_RENAMED => "renamed \"{$text('from')}\" to \"{$text('to')}\"",
            Activity::TASK_DESCRIBED => "edited the description of {$task}",
            Activity::TASK_MOVED => "moved {$task} from {$text('from')} to {$text('to')}",
            Activity::TASK_ASSIGNED => "assigned {$task} to ".($text('name') ?: 'someone'),
            Activity::TASK_UNASSIGNED => "unassigned {$task}",
            Activity::TASK_PRIORITY_CHANGED => "set the priority of {$task} to {$text('to')}",
            Activity::TASK_DUE_CHANGED => $text('to') !== ''
                ? "set the due date of {$task} to ".$this->day($text('to'))
                : "removed the due date of {$task}",
            Activity::TASK_LABELED => "added the label {$text('name')} to {$task}",
            Activity::TASK_UNLABELED => "removed the label {$text('name')} from {$task}",
            Activity::TASK_COMPLETED => "completed {$task}",
            Activity::TASK_REOPENED => "reopened {$task}",
            Activity::TASK_DELETED => "deleted {$task}",
            Activity::COMMENT_ADDED => "commented on {$task}",
            Activity::CHECKLIST_CHECKED => "checked \"{$text('text')}\" on {$task}",
            Activity::CHECKLIST_UNCHECKED => "unchecked \"{$text('text')}\" on {$task}",
            Activity::ATTACHMENT_ADDED => "attached a file to {$task}",
            Activity::ATTACHMENT_REMOVED => "removed a file from {$task}",
            Activity::TASK_REPEAT_CHANGED => is_array($properties['to'] ?? null)
                ? "set {$task} to repeat"
                : "stopped the repeat of {$task}",
            default => "changed {$task}",
        };

        $when = $event->created_at?->setTimezone($this->zone)->format('D j M') ?? '';

        return "{$when} · ".($event->user->name ?? 'Someone')." {$what}";
    }

    private function task(Task $task): string
    {
        return implode(' · ', array_filter([
            "\"{$task->title}\"",
            $task->due_on ? 'due '.$this->day($task->due_on->toDateString()) : null,
            $task->assignee ? "assigned to {$task->assignee->name}" : 'unassigned',
            $task->priority === Priority::None ? null : "{$task->priority->value} priority",
        ]));
    }

    private function day(string $date, bool $withYear = false): string
    {
        return CarbonImmutable::parse($date)->format($withYear ? 'D j M Y' : 'D j M');
    }
}
