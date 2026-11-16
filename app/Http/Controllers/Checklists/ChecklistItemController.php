<?php

namespace App\Http\Controllers\Checklists;

use App\Http\Controllers\Controller;
use App\Http\Requests\Checklists\MoveChecklistItemRequest;
use App\Http\Requests\Checklists\StoreChecklistItemRequest;
use App\Http\Requests\Checklists\UpdateChecklistItemRequest;
use App\Models\Activity;
use App\Models\ChecklistItem;
use App\Models\Task;
use App\Models\Team;
use App\Support\Positions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * A task's checklist (spec 0010). Only checking and unchecking go into the
 * task's history; adding, editing, moving and deleting items do not.
 */
class ChecklistItemController extends Controller
{
    /**
     * Add an item, or one per pasted line, at the end of the checklist or
     * at the given index.
     */
    public function store(StoreChecklistItemRequest $request, Team $current_team, Task $task): RedirectResponse
    {
        Gate::authorize('update', $task);

        DB::transaction(function () use ($request, $task) {
            $items = $task->checklistItems()->lockForUpdate()->get();
            $index = $request->has('index') ? min($request->integer('index'), $items->count()) : $items->count();

            $new = collect($request->lines())->map(function (string $line) use ($request, $task) {
                $item = $task->checklistItems()->make(['body' => $line]);

                if ($request->boolean('checked')) {
                    $item->check(true, $request->user());
                }

                return $item;
            });

            $items->splice($index, 0, $new->all());
            Positions::rewrite($items);
        });

        return back();
    }

    /**
     * Change the item's text, or check or uncheck it.
     */
    public function update(UpdateChecklistItemRequest $request, Team $current_team, ChecklistItem $item): RedirectResponse
    {
        $this->authorizeItem($current_team, $item);

        if ($request->has('body')) {
            $item->body = $request->string('body')->toString();
        }

        $checked = $request->has('checked') && $request->boolean('checked') !== $item->isChecked();

        if ($checked) {
            $item->check($request->boolean('checked'), $request->user());
        }

        DB::transaction(function () use ($item, $checked) {
            $item->save();

            if ($checked) {
                Activity::record(
                    $item->task,
                    $item->isChecked() ? Activity::CHECKLIST_CHECKED : Activity::CHECKLIST_UNCHECKED,
                    ['id' => $item->id, 'text' => $item->body],
                );
            }
        });

        return back();
    }

    /**
     * Move the item to another index of its checklist.
     */
    public function move(MoveChecklistItemRequest $request, Team $current_team, ChecklistItem $item): RedirectResponse
    {
        $this->authorizeItem($current_team, $item);

        DB::transaction(function () use ($request, $item) {
            $others = $item->task->checklistItems()->lockForUpdate()->get()
                ->reject(fn (ChecklistItem $other) => $other->is($item))
                ->values();

            $others->splice(min($request->integer('index'), $others->count()), 0, [$item]);
            Positions::rewrite($others, $item);
        });

        return back();
    }

    /**
     * Delete the item; the sheet offers Undo, which adds it back.
     */
    public function destroy(Team $current_team, ChecklistItem $item): RedirectResponse
    {
        $this->authorizeItem($current_team, $item);

        DB::transaction(function () use ($item) {
            $item->delete();

            Positions::rewrite($item->task->checklistItems()->lockForUpdate()->get());
        });

        return back();
    }

    /**
     * An item of another team is not found, like its project (ADR 0006);
     * an archived project's checklist is read-only.
     */
    private function authorizeItem(Team $team, ChecklistItem $item): void
    {
        abort_unless($item->task->project->team_id === $team->id, 404);

        Gate::authorize('update', $item->task);
    }
}
