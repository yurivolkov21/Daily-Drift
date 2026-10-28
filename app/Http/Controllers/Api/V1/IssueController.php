<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Issues\CreateIssue;
use App\Actions\Issues\UpdateIssue;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Http\Requests\Api\V1\ListIssuesRequest;
use App\Http\Requests\Api\V1\StoreIssueRequest;
use App\Http\Requests\Api\V1\UpdateIssueRequest;
use App\Http\Resources\Api\V1\IssueResource;
use App\Models\Issue;
use App\Models\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IssueController extends Controller
{
    /**
     * List the team's issues, most urgent first, a page at a time.
     */
    public function index(ListIssuesRequest $request): AnonymousResourceCollection
    {
        $team = $this->team($request);

        $project = $request->filled('project')
            ? $team->projects()->where('key', $request->validated('project'))->first()
            : null;

        $issues = $team->issues()
            ->with(['project.team', 'assignee', 'labels'])
            ->when($project, fn (Builder $query, Project $project) => $query->whereBelongsTo($project))
            ->when($request->validated('status'), fn (Builder $query, array $statuses) => $query->whereIn('issues.status', $statuses))
            ->when($request->validated('assignee') === 'me', fn (Builder $query) => $query->whereBelongsTo($request->user(), 'assignee'))
            ->orderByDesc('issues.priority')
            ->orderByDesc('issues.created_at')
            ->paginate($request->integer('per_page', 50))
            ->withQueryString();

        return IssueResource::collection($issues);
    }

    /**
     * Create an issue. Like the app's New issue dialog, it starts in the
     * backlog without a priority unless the request says otherwise.
     */
    public function store(StoreIssueRequest $request, CreateIssue $createIssue): JsonResponse
    {
        $project = $this->team($request)->projects()->where('key', $request->validated('project'))->firstOrFail();

        $issue = $createIssue->handle(
            $request->user(),
            $project,
            [
                'status' => IssueStatus::Backlog,
                'priority' => IssuePriority::None,
                ...$request->safe()->except(['project', 'label_ids']),
            ],
            $request->validated('label_ids', []),
        );

        return IssueResource::make($issue->load(['project.team', 'assignee', 'labels']))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Show the issue with the given identifier, such as "DD-123".
     */
    public function show(Request $request, string $identifier): IssueResource
    {
        return IssueResource::make($this->findIssue($request, $identifier)->load(['assignee', 'labels']));
    }

    /**
     * Change some of the issue's attributes and record them in its history.
     */
    public function update(UpdateIssueRequest $request, string $identifier, UpdateIssue $updateIssue): IssueResource
    {
        $issue = $updateIssue->handle(
            $request->user(),
            $this->findIssue($request, $identifier),
            $request->safe()->except('label_ids'),
            $request->safe()->has('label_ids') ? $request->safe()->array('label_ids') : null,
        );

        return IssueResource::make($issue->load(['assignee', 'labels']));
    }

    /**
     * Find the team's issue with the given identifier.
     */
    protected function findIssue(Request $request, string $identifier): Issue
    {
        return $this->team($request)->issues()
            ->identifiedBy($identifier)
            ->with('project.team')
            ->firstOrFail();
    }
}
