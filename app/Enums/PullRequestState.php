<?php

namespace App\Enums;

enum PullRequestState: string
{
    case Draft = 'draft';
    case Open = 'open';
    case Merged = 'merged';
    case Closed = 'closed';

    /**
     * Read the state from a GitHub pull request payload.
     *
     * @param  array<string, mixed>  $pullRequest
     */
    public static function fromGithub(array $pullRequest): self
    {
        return match (true) {
            ($pullRequest['merged'] ?? false) === true => self::Merged,
            ($pullRequest['state'] ?? 'open') === 'closed' => self::Closed,
            ($pullRequest['draft'] ?? false) === true => self::Draft,
            default => self::Open,
        };
    }
}
