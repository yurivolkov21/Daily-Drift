<?php

namespace App\Ai;

use Illuminate\Http\JsonResponse;
use RuntimeException;
use Throwable;

/**
 * A helper could not answer. It renders as JSON with the message the
 * person sees; the assistant logs whatever needs a look.
 */
class AssistantException extends RuntimeException
{
    public function __construct(public readonly Failure $failure, ?Throwable $previous = null)
    {
        parent::__construct($failure->message(), 0, $previous);
    }

    /**
     * Nothing to report: the assistant has already logged what matters.
     */
    public function report(): void
    {
        //
    }

    /**
     * The message also comes as an error of the request, as validation
     * errors do, so a 422 reads the same way in the browser.
     */
    public function render(): JsonResponse
    {
        $message = $this->failure->message();

        return response()->json(['message' => $message, 'errors' => ['assistant' => [$message]]], $this->failure->status());
    }
}
