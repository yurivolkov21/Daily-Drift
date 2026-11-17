<?php

namespace App\Http\Middleware;

use App\Ai\Assistant;
use App\Ai\AssistantException;
use App\Ai\ClaudeAssistant;
use App\Ai\Failure;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * For the routes that ask Claude (spec 0011): they answer 503 while the
 * helpers are off, and may run longer than a normal request.
 */
class PrepareAiRequest
{
    public function __construct(private readonly Assistant $assistant)
    {
        //
    }

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->assistant->enabled()) {
            throw new AssistantException(Failure::Off);
        }

        // One reply can take up to 90 seconds, and the SDK retries once.
        set_time_limit(ClaudeAssistant::TIMEOUT * 2 + 30);

        return $next($request);
    }
}
