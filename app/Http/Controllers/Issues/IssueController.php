<?php

namespace App\Http\Controllers\Issues;

use App\Actions\Issues\CreateIssue;
use App\Actions\Issues\UpdateIssue;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreIssueRequest;
use App\Http\Requests\Issues\UpdateIssueRequest;
use App\Http\Resources\CommentResource;
use App\Http\Resources\IssueActivityResource;
use App\Http\Resources\IssueResource;
use App\Models\Issue;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IssueController extends Controller
{
    /**
     * Display the team's issues as a list or a board.
     */
    public function index(Request $request, Team $currentTeam): Response
    {
        $project = $request->filled('project')
            ? $currentTeam->projects()->where('key', $request->string('project')->upper()->toString())->first()
            : null;

        $assignedToMe = $request->query('assignee') === 'me';

        $issues = $currentTeam->issues()
            ->with(['project', 'assignee', 'labels'])
            ->when($project, fn (Builder $query, Project $project) => $query->whereBelongsTo($project))
            ->when($assignedToMe, fn (Builder $query) => $query->whereBelongsTo($request->user(), 'assignee'))
            ->orderByDesc('issues.priority')
            ->orderByDesc('issues.created_at')
            ->get();

        return Inertia::render('issues/index', [
            'issues' => IssueResource::collection($issues)->resolve(),
            'filters' => [
                'project' => $project?->key,
                'assignee' => $assignedToMe ? 'me' : null,
            ],
            'view' => $request->query('view') === 'board' ? 'board' : 'list',
        ]);
    }

    /**
     * Store a newly created issue.
     */
    public function store(StoreIssueRequest $request, Team $currentTeam, CreateIssue $createIssue): RedirectResponse
    {
        $project = $currentTeam->projects()->findOrFail($request->safe()->string('project_id')->toString());

        $issue = $createIssue->handle(
            $request->user(),
            $project,
            $request->safe()->except(['project_id', 'label_ids']),
            $request->validated('label_ids', []),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Issue :identifier created.', ['identifier' => $issue->identifier])]);

        return back();
    }

    /**
     * Display the given issue.
     */
    public function show(Team $currentTeam, string $identifier): Response
    {
        $issue = $this->findIssue($currentTeam, $identifier)->load([
            'assignee',
            'creator',
            'labels',
            'comments' => fn (HasMany $query) => $query->with('author')->oldest()->orderBy('id'),
            'activities' => fn (HasMany $query) => $query->with('actor')->oldest()->orderBy('id'),
        ]);

        return Inertia::render('issues/show', [
            'issue' => IssueResource::make($issue)->resolve(),
            'comments' => CommentResource::collection($issue->comments)->resolve(),
            'activities' => IssueActivityResource::collection($issue->activities)->resolve(),
        ]);
    }

    /**
     * Update the given issue and record the changes in its history.
     */
    public function update(UpdateIssueRequest $request, Team $currentTeam, string $identifier, UpdateIssue $updateIssue): RedirectResponse
    {
        $updateIssue->handle(
            $request->user(),
            $this->findIssue($currentTeam, $identifier),
            $request->safe()->except('label_ids'),
            $request->safe()->has('label_ids') ? $request->safe()->array('label_ids') : null,
        );

        return back();
    }

    /**
     * Delete the given issue.
     */
    public function destroy(Team $currentTeam, string $identifier): RedirectResponse
    {
        $issue = $this->findIssue($currentTeam, $identifier);

        $issue->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Issue :identifier deleted.', ['identifier' => $issue->identifier])]);

        return to_route('issues.index', ['current_team' => $currentTeam->slug]);
    }

    /**
     * Find the team's issue with the given identifier, such as "DD-123".
     */
    protected function findIssue(Team $team, string $identifier): Issue
    {
        return $team->issues()
            ->identifiedBy($identifier)
            ->with('project')
            ->firstOrFail();
    }
}
