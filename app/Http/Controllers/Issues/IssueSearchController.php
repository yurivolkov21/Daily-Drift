<?php

namespace App\Http\Controllers\Issues;

use App\Http\Controllers\Controller;
use App\Http\Resources\IssueResource;
use App\Models\Issue;
use App\Models\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IssueSearchController extends Controller
{
    /**
     * Search the team's issues by identifier or title, most recently updated first.
     */
    public function __invoke(Request $request, Team $currentTeam): AnonymousResourceCollection
    {
        $search = $request->string('query')->trim()->toString();

        $issues = $currentTeam->issues()
            ->with('project')
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search) {
                // A percent sign or underscore in the search is part of the title, not a wildcard.
                $query->whereRaw("issues.title like ? escape '!'", [
                    '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%',
                ]);

                if (preg_match('/^'.Issue::IDENTIFIER_PATTERN.'$/', $search) === 1) {
                    $query->orWhere(fn (Builder $query) => $query->identifiedBy($search));
                }
            }))
            ->latest('issues.updated_at')
            ->limit(8)
            ->get();

        return IssueResource::collection($issues);
    }
}
