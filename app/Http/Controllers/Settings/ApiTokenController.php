<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreApiTokenRequest;
use App\Http\Resources\ApiTokenResource;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiTokenController extends Controller
{
    /**
     * Show the user's API tokens, newest first.
     */
    public function index(Request $request): Response
    {
        $tokens = $request->user()->tokens()
            ->with('team')
            ->latest()
            ->orderByDesc('id')
            ->get();

        return Inertia::render('settings/api-tokens', [
            'tokens' => ApiTokenResource::collection($tokens)->resolve(),
            'apiUrl' => url('/api/v1'),
        ]);
    }

    /**
     * Create a token. Its plain-text value is flashed once and never shown again.
     */
    public function store(StoreApiTokenRequest $request): RedirectResponse
    {
        $newToken = $request->user()->createTeamToken(
            $request->user()->teams()->findOrFail($request->safe()->integer('team_id')),
            $request->safe()->string('name')->toString(),
            $request->abilities(),
            $request->safe()->filled('expires_in_days')
                ? now()->addDays($request->safe()->integer('expires_in_days'))
                : null,
        );

        Inertia::flash('apiToken', [
            'id' => $newToken->accessToken->getKey(),
            'plainTextToken' => $newToken->plainTextToken,
        ]);

        return back();
    }

    /**
     * Revoke one of the user's tokens.
     */
    public function destroy(Request $request, string $token): RedirectResponse
    {
        $request->user()->tokens()->findOrFail($token)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Token revoked.')]);

        return back();
    }
}
