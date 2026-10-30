<?php

namespace App\Http\Controllers\Issues;

use App\Actions\Issues\CreateIssue;
use App\Actions\Issues\UpdateIssue;
use App\Concerns\PresentsIssueDetails;
use App\Data\IssueFilters;
use App\Events\WorkspaceChanged;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issues\StoreIssueRequest;
use App\Http\Requests\Issues\UpdateIssueRequest;
use App\Http\Resources\IssueResource;
use App\Models\Issue;
use App\Models\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IssueController extends Controller
{
    use PresentsIssueDetails;

    /**
     * Display the team's issues as a list or a board.
     *
     * The due and done filters depend on the reader's day, so they come with
     * a day to spare and the browser applies them again with its own day.
     */
    public function index(Request $request, Team $currentTeam): Response
    {
        $filters = IssueFilters::fromRequest($request, $currentTeam);

        $view = $request->query('view') === 'board' ? 'board' : 'list';

        $issues = $currentTeam->issues()
            ->with(['project', 'assignee', 'labels'])
            ->when($view === 'list', fn (Builder $query) => $query->with([
                'subtasks' => fn (HasMany $query) => $query->orderBy('position')->orderBy('id'),
            ]))
            ->when($filters->done, fn (Builder $query) => $query->with('completion'))
            ->withCount([
                'comments',
                'subtasks',
                'subtasks as completed_subtasks_count' => fn (Builder $query) => $query->whereNotNull('completed_at'),
            ])
            ->filteredBy($filters, $request->user())
            ->orderByDesc('issues.priority')
            ->orderByDesc('issues.created_at')
            ->get();

        return Inertia::render('issues/index', [
            'issues' => IssueResource::collection($issues)->resolve(),
            'filters' => $filters->toArray(),
            'view' => $view,
            'peek' => fn () => $request->filled('peek')
                ? $this->peek($currentTeam, $request->string('peek')->toString())
                : null,
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
        return Inertia::render('issues/show', $this->issueDetails($this->findIssue($currentTeam, $identifier)));
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

        broadcast(WorkspaceChanged::forIssue($issue, 'issue', 'deleted'))->toOthers();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Issue :identifier deleted.', ['identifier' => $issue->identifier])]);

        return to_route('issues.index', ['current_team' => $currentTeam->slug]);
    }

    /**
     * Get the issue opened in the board's quick view, with its sub-tasks.
     *
     * @return array{issue: array<string, mixed>, subtasks: array<int, array<string, mixed>>}|null
     */
    protected function peek(Team $team, string $identifier): ?array
    {
        $issue = $team->issues()
            ->identifiedBy($identifier)
            ->with([
                'project',
                'assignee',
                'creator',
                'labels',
            ])
            ->first();

        if ($issue === null) {
            return null;
        }

        return [
            'issue' => IssueResource::make($issue)->resolve(),
            'subtasks' => $this->subtasksOf($issue),
        ];
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
