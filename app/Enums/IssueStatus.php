<?php

namespace App\Enums;

enum IssueStatus: string
{
    case Backlog = 'backlog';
    case Todo = 'todo';
    case InProgress = 'in_progress';
    case InReview = 'in_review';
    case Done = 'done';
    case Canceled = 'canceled';

    /**
     * Get the statuses that close an issue.
     *
     * @return array<self>
     */
    public static function closed(): array
    {
        return [self::Done, self::Canceled];
    }
}
