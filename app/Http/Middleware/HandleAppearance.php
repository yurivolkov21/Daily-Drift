<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class HandleAppearance
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        View::share('appearance', $request->cookie('appearance') ?? 'system');
        View::share('motion', self::motion($request));

        return $next($request);
    }

    /**
     * The Motion setting from its cookie: `system` (the default), `reduced` or `full`.
     */
    public static function motion(Request $request): string
    {
        $motion = $request->cookie('motion');

        return in_array($motion, ['reduced', 'full'], true) ? $motion : 'system';
    }
}
