<?php

namespace App\Actions\Issues;

use App\Models\Issue;
use App\Models\Team;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class FindMentionedIssues
{
    /**
     * The most identifiers looked up at once, so a huge message cannot cost
     * a query for every number in it.
     */
    protected const int LIMIT = 10;

    /**
     * Find the team's issues that the texts name, such as "DD-12" in a commit
     * message or "dd-12-fix-login" as a branch. Names of other teams' issues,
     * or of no issue at all, are skipped. GitHub deliveries and the events of
     * coding tools both use it.
     *
     * @return Collection<int, Issue>
     */
    public function handle(Team $team, string ...$texts): Collection
    {
        preg_match_all('/(?<![A-Za-z0-9])('.Issue::IDENTIFIER_PATTERN.')(?![0-9])/', implode("\n", $texts), $matches);

        return collect($matches[1])
            ->map(fn (string $identifier) => Str::upper($identifier))
            ->unique()
            ->take(self::LIMIT)
            ->map(fn (string $identifier) => $team->issues()->identifiedBy($identifier)->with('project')->first())
            ->filter()
            ->values();
    }
}
