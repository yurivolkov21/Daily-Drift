<?php

namespace App\Data;

use App\Models\ProjectSummary;

readonly class ProjectSummaryData
{
    /**
     * @param  list<string>  $done
     * @param  list<string>  $risks
     * @param  list<string>  $next
     * @param  array{id: int, name: string}|null  $author  Who asked for it; null once they are gone.
     */
    public function __construct(
        public string $startsOn,
        public string $endsOn,
        public string $headline,
        public array $done,
        public array $risks,
        public array $next,
        public ?array $author,
        public string $writtenAt,
        public string $model,
    ) {
        //
    }

    /**
     * Build the data for a project's weekly summary (spec 0011).
     */
    public static function from(ProjectSummary $summary): self
    {
        $summary->loadMissing('user:id,name');

        return new self(
            startsOn: $summary->starts_on->toDateString(),
            endsOn: $summary->ends_on->toDateString(),
            headline: $summary->content['headline'],
            done: $summary->content['done'],
            risks: $summary->content['risks'],
            next: $summary->content['next'],
            author: $summary->user ? ['id' => $summary->user->id, 'name' => $summary->user->name] : null,
            writtenAt: ($summary->updated_at ?? now())->toIso8601String(),
            model: $summary->model,
        );
    }
}
