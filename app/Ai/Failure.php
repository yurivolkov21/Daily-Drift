<?php

namespace App\Ai;

/**
 * Why a helper could not answer (spec 0011), with what the person sees.
 */
enum Failure: string
{
    /** No key is set. */
    case Off = 'off';

    /** Claude is busy, out of reach or too slow, even after a retry. */
    case Busy = 'busy';

    /** A wrong key, no credit, no access to the model or a request Claude rejects. */
    case Misconfigured = 'misconfigured';

    /** A safety classifier or the model declined, even after the fallback. */
    case Refused = 'refused';

    /** The reply was cut short or not in the asked shape. */
    case Unusable = 'unusable';

    public function status(): int
    {
        return match ($this) {
            self::Off, self::Busy, self::Misconfigured => 503,
            self::Refused => 422,
            self::Unusable => 502,
        };
    }

    public function message(): string
    {
        return match ($this) {
            self::Off => __('AI helpers are off. Add ANTHROPIC_API_KEY to turn them on.'),
            self::Busy => __('Claude is busy right now. Try again in a moment.'),
            self::Misconfigured => __('AI helpers aren\'t set up correctly.'),
            self::Refused => __('Claude couldn\'t help with this one.'),
            self::Unusable => __('Claude\'s reply couldn\'t be used. Try again.'),
        };
    }
}
