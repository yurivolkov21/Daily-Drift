<?php

namespace App\Http\Controllers\Issues;

use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\SaveLabelRequest;
use App\Models\Label;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LabelController extends Controller
{
    /**
     * Display the labels of the user's current team in the settings.
     */
    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;

        if ($team === null) {
            abort(404);
        }

        return Inertia::render('settings/labels', [
            'labels' => $team->labels()
                ->withCount('issues')
                ->orderBy('name')
                ->get()
                ->map(fn (Label $label) => [
                    'id' => $label->id,
                    'name' => $label->name,
                    'color' => $label->color,
                    'issuesCount' => $label->issues_count,
                ]),
        ]);
    }

    /**
     * Store a newly created label.
     */
    public function store(SaveLabelRequest $request, Team $currentTeam): RedirectResponse
    {
        $label = $currentTeam->labels()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Label :name created.', ['name' => $label->name])]);

        return back();
    }

    /**
     * Rename or recolor the given label.
     */
    public function update(SaveLabelRequest $request, Team $currentTeam, Label $label): RedirectResponse
    {
        $label->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Label :name updated.', ['name' => $label->name])]);

        return back();
    }

    /**
     * Delete the given label and detach it from its issues.
     */
    public function destroy(Team $currentTeam, Label $label): RedirectResponse
    {
        $label->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Label :name deleted.', ['name' => $label->name])]);

        return back();
    }
}
