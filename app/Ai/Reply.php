<?php

namespace App\Ai;

/**
 * The assistant's answer: the decoded JSON, and the model that wrote it,
 * which differs from the one asked when a fallback answered (spec 0011).
 */
final readonly class Reply
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public array $data,
        public string $model,
    ) {
        //
    }
}
