<?php

namespace App\Ai;

/**
 * What the AI helpers ask for drafts (spec 0011). Claude in the app, a fake
 * in tests.
 */
interface Assistant
{
    /**
     * Whether the helpers can be used, which needs a key.
     */
    public function enabled(): bool;

    /**
     * Ask for a reply in the shape of the prompt's schema.
     *
     * @throws AssistantException
     */
    public function json(Prompt $prompt): Reply;
}
