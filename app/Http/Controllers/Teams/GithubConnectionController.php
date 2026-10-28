<?php

namespace App\Http\Controllers\Teams;

use App\Http\Controllers\Controller;
use App\Models\GithubWebhook;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class GithubConnectionController extends Controller
{
    /**
     * Give the team a GitHub webhook, or a new secret for the one it has.
     * The payload URL stays the same, so only the secret changes on GitHub.
     */
    public function store(Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $team->githubWebhook()->updateOrCreate([], ['secret' => GithubWebhook::generateSecret()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('GitHub webhook ready.')]);

        return back();
    }

    /**
     * Remove the team's GitHub webhook. Deliveries to its URL then get a 404,
     * and the links already made stay on the issues.
     */
    public function destroy(Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $team->githubWebhook()->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('GitHub disconnected.')]);

        return back();
    }
}
