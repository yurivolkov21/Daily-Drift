<?php

namespace App\Http\Controllers\Settings;

use App\Enums\SocialProvider;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ConnectedAccountController extends Controller
{
    /**
     * Disconnect a Google or GitHub account, unless it is the only way left
     * to sign in (spec 0009).
     */
    public function destroy(Request $request, SocialProvider $provider): RedirectResponse
    {
        $user = $request->user();
        $account = $user->socialAccounts()->where('provider', $provider)->firstOrFail();

        if ($user->signInMethods() <= 1) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __(':provider is your only way to sign in. Set a password or connect another account first.', ['provider' => $provider->label()])]);

            return back();
        }

        $account->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':provider disconnected.', ['provider' => $provider->label()])]);

        return back();
    }
}
