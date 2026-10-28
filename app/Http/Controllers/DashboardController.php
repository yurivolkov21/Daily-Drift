<?php

namespace App\Http\Controllers;

use App\Concerns\PresentsProjectSummaries;
use App\Enums\IssueActivityType;
use App\Enums\IssueStatus;
use App\Http\Resources\CommentResource;
use App\Http\Resources\IssueActivityResource;
use App\Http\Resources\IssueLinkResource;
use App\Http\Resources\IssueResource;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\IssueActivity;
use App\Models\IssueLink;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\ToolEvent;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use PresentsProjectSummaries;

    /**
     * How many of the team's latest changes and comments the activity feed shows.
     */
    public const int ACTIVITY_LIMIT = 15;

    /**
     * How many entries the Development card shows.
     */
    public const int DEVELOPMENT_LIMIT = 8;

    /**
     * Show the team at a glance: the user's open issues, what is late or due
     * soon, what got done lately, recent activity and the projects.
     *
     * Whether an issue is late or done this week depends on the reader's
     * day, so the browser sorts that out. The server sends a day more on each
     * side to cover any time zone.
     */
    public function __invoke(Request $request, Team $currentTeam): Response
    {
        $user = $request->user();

        return Inertia::render('dashboard', [
            'pendingInvitations' => $this->pendingInvitations($user),
            'assignedIssues' => fn () => $this->assignedIssues($currentTeam, $user),
            'dueIssues' => fn () => $this->dueIssues($currentTeam),
            'completions' => fn () => $this->completions($currentTeam),
            'activity' => fn () => $this->activity($currentTeam),
            'development' => fn () => $this->development($currentTeam),
            'projects' => fn () => $this->projectSummaries($currentTeam),
            'canInviteMembers' => $user->can('inviteMember', $currentTeam),
            'github' => [
                'connected' => $currentTeam->githubWebhook()->exists(),
                'canConnect' => $user->can('update', $currentTeam),
            ],
        ]);
    }

    /**
     * Get the team's latest work from GitHub and from coding tools, newest
     * first: the pull requests and commits linked to its issues, and what
     * tools such as Claude Code or Codex reported through the API.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function development(Team $team): array
    {
        $links = IssueLink::query()
            ->whereRelation('issue.project', 'team_id', $team->id)
            ->with('issue.project')
            ->latest('updated_at')
            ->orderByDesc('id')
            ->limit(self::DEVELOPMENT_LIMIT)
            ->get()
            ->map(fn (IssueLink $link) => [
                'kind' => 'link',
                'id' => $link->id,
                'at' => $link->updated_at?->toISOString(),
                'issue' => $this->issueReference($link->issue),
                'link' => IssueLinkResource::make($link)->resolve(),
            ]);

        $events = ToolEvent::query()
            ->whereBelongsTo($team)
            ->with(['user', 'issue.project'])
            ->latest()
            ->orderByDesc('id')
            ->limit(self::DEVELOPMENT_LIMIT)
            ->get()
            ->map(fn (ToolEvent $event) => [
                'kind' => 'tool',
                'id' => $event->id,
                'at' => $event->created_at?->toISOString(),
                'issue' => $event->issue === null ? null : $this->issueReference($event->issue),
                'tool' => $event->tool,
                'event' => $event->event,
                'branch' => $event->branch,
                'user' => $event->user?->name,
            ]);

        return $links->concat($events)
            ->sortBy([['at', 'desc'], ['id', 'desc']])
            ->take(self::DEVELOPMENT_LIMIT)
            ->values()
            ->all();
    }

    /**
     * Get the invitations to other teams that wait for the user's answer.
     *
     * @return Collection<int, array{code: string, inviterName: string, team: array{name: string, slug: string}}>
     */
    protected function pendingInvitations(User $user): Collection
    {
        return TeamInvitation::query()
            ->with(['inviter', 'team'])
            ->whereRaw('LOWER(email) = ?', [strtolower($user->email)])
            ->whereNull('accepted_at')
            ->where(fn ($query) => $query
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now()))
            ->latest()
            ->get()
            ->map(fn (TeamInvitation $invitation) => [
                'code' => $invitation->code,
                'inviterName' => $invitation->inviter->name,
                'team' => [
                    'name' => $invitation->team->name,
                    'slug' => $invitation->team->slug,
                ],
            ]);
    }

    /**
     * Get the user's open issues in the team.
     *
     * @return array<int|string, mixed>
     */
    protected function assignedIssues(Team $team, User $user): array
    {
        $issues = $team->issues()
            ->with(['project', 'labels'])
            ->whereBelongsTo($user, 'assignee')
            ->whereNotIn('issues.status', IssueStatus::closed())
            ->orderByDesc('issues.priority')
            ->orderByDesc('issues.created_at')
            ->get();

        return IssueResource::collection($issues)->resolve();
    }

    /**
     * Get the team's open issues that are late or due within the next week.
     *
     * @return array<int|string, mixed>
     */
    protected function dueIssues(Team $team): array
    {
        $issues = $team->issues()
            ->with(['project', 'assignee'])
            ->whereNotIn('issues.status', IssueStatus::closed())
            ->whereNotNull('issues.due_date')
            ->whereDate('issues.due_date', '<=', today()->addDays(7))
            ->orderBy('issues.due_date')
            ->orderByDesc('issues.priority')
            ->get();

        return IssueResource::collection($issues)->resolve();
    }

    /**
     * Get when each issue done since the start of last week was done.
     *
     * An issue counts from its latest move to Done, or from its creation if it
     * was created done. Either one saves the issue, so only issues saved since
     * then need a look.
     *
     * @return array<int, array{issueId: string, completedAt: string}>
     */
    protected function completions(Team $team): array
    {
        $since = now()->startOfWeek(CarbonInterface::MONDAY)->subWeek()->subDay();

        $issues = $team->issues()
            ->where('issues.status', IssueStatus::Done)
            ->where('issues.updated_at', '>=', $since)
            ->with(['activities' => fn (HasMany $query) => $query
                ->where('type', IssueActivityType::StatusChanged)
                ->where('properties->to', IssueStatus::Done->value)
                ->latest()])
            ->get();

        $completions = [];

        foreach ($issues as $issue) {
            $completedAt = $issue->activities->first()->created_at ?? $issue->created_at;

            if ($completedAt !== null && $completedAt->gte($since)) {
                $completions[] = [
                    'issueId' => $issue->id,
                    'completedAt' => $completedAt->toISOString(),
                ];
            }
        }

        return collect($completions)->sortBy('completedAt')->values()->all();
    }

    /**
     * Get the team's latest changes and comments, newest first. Description
     * edits are left out, since they say nothing at a glance.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function activity(Team $team): array
    {
        $changes = IssueActivity::query()
            ->whereRelation('issue.project', 'team_id', $team->id)
            ->where('type', '!=', IssueActivityType::DescriptionChanged)
            ->with(['actor', 'issue.project'])
            ->latest()
            ->orderByDesc('id')
            ->limit(self::ACTIVITY_LIMIT)
            ->get()
            ->map(fn (IssueActivity $activity) => [
                'kind' => 'activity',
                'id' => $activity->id,
                'createdAt' => $activity->created_at?->toISOString(),
                'issue' => $this->issueReference($activity->issue),
                'activity' => IssueActivityResource::make($activity)->resolve(),
            ]);

        $comments = Comment::query()
            ->whereRelation('issue.project', 'team_id', $team->id)
            ->with(['author', 'issue.project'])
            ->latest()
            ->orderByDesc('id')
            ->limit(self::ACTIVITY_LIMIT)
            ->get()
            ->map(fn (Comment $comment) => [
                'kind' => 'comment',
                'id' => $comment->id,
                'createdAt' => $comment->created_at?->toISOString(),
                'issue' => $this->issueReference($comment->issue),
                'comment' => CommentResource::make($comment)->resolve(),
            ]);

        return $changes->concat($comments)
            ->sortBy([['createdAt', 'desc'], ['id', 'desc']])
            ->take(self::ACTIVITY_LIMIT)
            ->values()
            ->all();
    }

    /**
     * Name the issue an entry of the feed is about.
     *
     * @return array{identifier: string, title: string}
     */
    protected function issueReference(Issue $issue): array
    {
        return [
            'identifier' => $issue->identifier,
            'title' => $issue->title,
        ];
    }
}
