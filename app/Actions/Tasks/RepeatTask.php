<?php

namespace App\Actions\Tasks;

use App\Models\Activity;
use App\Models\ChecklistItem;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\User;
use App\Support\RepeatRule;
use Carbon\CarbonImmutable;

/**
 * Recurring tasks (spec 0010): completing one creates the next occurrence
 * as a new task, and reopening it right away takes that back.
 */
class RepeatTask
{
    public function __construct(private readonly DeleteTask $deleteTask)
    {
        //
    }

    /**
     * Create the occurrence after a recurring task that was just completed:
     * a new task at the bottom of the list it came from, with the same
     * title, description, priority, assignee, labels, checklist (all items
     * open) and rule. Comments, files and history are not copied.
     *
     * Nobody is notified: an unchanged assignee is not a new assignment.
     */
    public function next(Task $task, RepeatRule $rule, CarbonImmutable $due, CarbonImmutable $anchor, TaskList $list, CarbonImmutable $today, ?User $by): Task
    {
        $list->lockForNewTasks();

        $next = $list->tasks()->make([
            'title' => $task->title,
            'description' => $task->description,
            'priority' => $task->priority,
            'assignee_id' => $task->assignee_id,
            'due_on' => $rule->nextDue($due, $anchor, $today)->toDateString(),
            'position' => $list->tasks()->count(),
            'repeat_unit' => $rule->unit,
            'repeat_every' => $rule->every,
            'repeat_anchor' => $anchor->toDateString(),
        ]);
        $next->project()->associate($task->project_id);
        $next->creator()->associate($by);
        $next->forceFill(['repeated_from_id' => $task->id]);
        $next->save();

        $next->labels()->sync($task->labels()->pluck('labels.id')->all());

        // Copying the checklist is part of creating the task, not a change to it.
        ChecklistItem::withoutTouching(function () use ($task, $next) {
            $task->checklistItems()->get()->values()->each(
                fn (ChecklistItem $item, int $position) => $next->checklistItems()->create(['body' => $item->body, 'position' => $position]),
            );
        });

        return $next;
    }

    /**
     * When a completed task is reopened: if nobody has changed its next
     * occurrence yet, delete that occurrence and give back the rule, so the
     * reopened task repeats again. Otherwise both stay, and null means the
     * reopened task no longer repeats.
     *
     * @return array{repeat_unit: string, repeat_every: int, repeat_anchor: string|null}|null
     */
    public function takeBack(Task $task): ?array
    {
        $next = $task->nextOccurrence()->first();

        if ($next === null || ! $this->untouched($next, $task)) {
            return null;
        }

        $rule = $next->repeatRule();
        $anchor = $next->repeat_anchor?->toDateString();

        $this->deleteTask->handle($next);

        return $rule === null ? null : [
            'repeat_unit' => $rule->unit->value,
            'repeat_every' => $rule->every,
            'repeat_anchor' => $anchor,
        ];
    }

    /**
     * Nobody has edited, commented on, attached to, checked, moved or
     * completed the occurrence since it was created, and its checklist is
     * still the copy (adding, editing, moving or deleting items records no
     * event, so the items themselves are compared).
     */
    private function untouched(Task $next, Task $task): bool
    {
        return $next->completed_at === null
            && $next->created_at !== null
            && $next->updated_at?->equalTo($next->created_at) === true
            && $next->activities()->where('type', '!=', Activity::TASK_CREATED)->doesntExist()
            && $next->comments()->doesntExist()
            && $next->attachments()->doesntExist()
            && $next->checklistItems()->whereNotNull('completed_at')->doesntExist()
            && $next->checklistItems()->pluck('body')->all() === $task->checklistItems()->pluck('body')->all();
    }
}
