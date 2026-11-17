<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Safe defaults for a public site (spec 0012). A response that sets one of
 * these headers itself, such as a file download, keeps its own.
 */
class AddSecurityHeaders
{
    /**
     * @var array<string, string>
     */
    public const array HEADERS = [
        'X-Content-Type-Options' => 'nosniff',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'X-Frame-Options' => 'DENY',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
    ];

    /**
     * Browsers keep to HTTPS for a year once they have seen the site on it.
     */
    public const string HSTS = 'max-age=31536000';

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach (self::HEADERS as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        if (app()->isProduction() && $request->isSecure() && ! $response->headers->has('Strict-Transport-Security')) {
            $response->headers->set('Strict-Transport-Security', self::HSTS);
        }

        return $response;
    }
}
