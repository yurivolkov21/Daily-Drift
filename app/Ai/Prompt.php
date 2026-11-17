<?php

namespace App\Ai;

/**
 * One request to the assistant for JSON in a given shape (spec 0011).
 */
final readonly class Prompt
{
    /**
     * @param  string  $purpose  What the request is for, in the log: steps, tasks or summary.
     * @param  string  $system  The instructions.
     * @param  string  $user  The data to work on.
     * @param  array<string, mixed>  $schema  The JSON schema the reply follows.
     * @param  'low'|'medium'|'high'  $effort  How much the model thinks before it answers.
     */
    public function __construct(
        public string $purpose,
        public string $system,
        public string $user,
        public array $schema,
        public string $effort = 'low',
        public int $maxTokens = 8000,
    ) {
        //
    }
}
