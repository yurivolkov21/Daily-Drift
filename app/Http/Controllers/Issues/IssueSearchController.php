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
                $query->where('issues.title', 'like', '%'.$search.'%');

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
