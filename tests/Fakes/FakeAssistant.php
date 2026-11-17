<?php

namespace Tests\Fakes;

use App\Ai\Assistant;
use App\Ai\AssistantException;
use App\Ai\Prompt;
use App\Ai\Reply;
use LogicException;

/**
 * Stands in for Claude in tests (spec 0011): it gives the replies it was
 * handed, in order, and keeps the prompts it was asked.
 */
class FakeAssistant implements Assistant
{
    /** @var list<Prompt> */
    public array $prompts = [];

    /**
     * @param  list<array<string, mixed>|AssistantException>  $replies
     */
    public function __construct(private array $replies = [], private readonly bool $enabled = true)
    {
        //
    }

    /**
     * @param  array<string, mixed>|AssistantException  ...$replies
     */
    public static function replying(array|AssistantException ...$replies): self
    {
        return new self(array_values($replies));
    }

    public function enabled(): bool
    {
        return $this->enabled;
    }

    public function json(Prompt $prompt): Reply
    {
        $this->prompts[] = $prompt;
        $reply = array_shift($this->replies) ?? throw new LogicException('The fake assistant has no reply left.');

        if ($reply instanceof AssistantException) {
            throw $reply;
        }

        return new Reply($reply, 'claude-opus-5-5');
    }
}
