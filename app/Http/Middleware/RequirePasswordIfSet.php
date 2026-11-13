<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ask to confirm the password, unless the account has none yet (spec 0009):
 * an account made with Google or GitHub must reach its Security page to set
 * one.
 */
class RequirePasswordIfSet extends RequirePassword
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle($request, Closure $next, $redirectToRoute = null, $passwordTimeoutSeconds = null): Response
    {
        if ($request->user() !== null && ! $request->user()->hasPassword()) {
            return $next($request);
        }

        return parent::handle($request, $next, $redirectToRoute, $passwordTimeoutSeconds);
    }
}
