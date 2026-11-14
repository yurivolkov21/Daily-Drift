<?php

namespace App\Http\Controllers;

use App\Http\Responses\Concerns\RedirectsToCurrentTeam;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Fortify;

/**
 * The site root has no page of its own: it opens the current team's
 * dashboard, or the sign-in page for a guest.
 */
class HomeController extends Controller
{
    use RedirectsToCurrentTeam;

    public function __invoke(Request $request): RedirectResponse
    {
        if (! $request->user()) {
            return to_route('login');
        }

        return redirect($this->redirectPathForCurrentTeam($request, Fortify::redirects('login')));
    }
}
