<?php

namespace App\Http\Controllers\Labels;

use App\Actions\Tasks\SyncTaskLabels;
use App\Http\Controllers\Controller;
use App\Http\Requests\Labels\SaveLabelRequest;
use App\Http\Requests\Tasks\SyncTaskLabelsRequest;
use App\Models\Label;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * The team's labels (spec 0007).
 */
class LabelController extends Controller
{
    /**
     * Create a label; from the task sheet it also goes on that task.
     */
    public function store(SaveLabelRequest $request, Team $current_team, SyncTaskLabels $sync): RedirectResponse
    {
        Gate::authorize('create', [Label::class, $current_team]);

        $task = null;

        if ($request->filled('task_id')) {
            $task = Task::query()
                ->whereKey($request->integer('task_id'))
                ->whereHas('project', fn ($query) => $query->whereBelongsTo($current_team))
                ->firstOrFail();
            Gate::authorize('update', $task);
        }

        DB::transaction(function () use ($request, $current_team, $task, $sync) {
            $label = $current_team->labels()->create([
                'name' => $request->string('name')->trim()->toString(),
                'icon' => $request->string('icon')->toString(),
            ]);

            if ($task) {
                $ids = $task->labels()->pluck('labels.id')->all();

                if (count($ids) < SyncTaskLabelsRequest::MAX_LABELS) {
                    $sync->handle($task, [...$ids, $label->id]);
                }
            }
        });

        return back();
    }

    /**
     * Rename a label or change its icon. Tasks keep it.
     */
    public function update(SaveLabelRequest $request, Team $current_team, Label $label): RedirectResponse
    {
        Gate::authorize('update', $label);

        $label->update(array_filter([
            'name' => $request->has('name') ? $request->string('name')->trim()->toString() : null,
            'icon' => $request->has('icon') ? $request->string('icon')->toString() : null,
        ], fn ($value) => $value !== null));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Label saved.')]);

        return back();
    }

    /**
     * Delete a label; it comes off every task of the team.
     */
    public function destroy(Team $current_team, Label $label): RedirectResponse
    {
        Gate::authorize('delete', $label);

        $label->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Label deleted.')]);

        return back();
    }
}
