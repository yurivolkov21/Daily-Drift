<?php

namespace App\Http\Controllers\Issues;

use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreLabelRequest;
use App\Models\Label;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class LabelController extends Controller
{
    /**
     * Store a newly created label.
     */
    public function store(StoreLabelRequest $request, Team $currentTeam): RedirectResponse
    {
        $label = $currentTeam->labels()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Label :name created.', ['name' => $label->name])]);

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
