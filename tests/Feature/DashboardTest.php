<?php

use App\Actions\Issues\UpdateIssue;
use App\Enums\IssueActivityType;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Enums\ProjectStatus;
use App\Enums\TeamRole;
use App\Http\Controllers\DashboardController;
use App\Models\Comment;
use App\Models\GithubWebhook;
use App\Models\Issue;
use App\Models\IssueLink;
use App\Models\Project;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\ToolEvent;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();
});

test('dashboard includes pending invitations for the authenticated user', function () {
    $owner = User::factory()->create(['name' => 'Taylor Otwell']);
    $invitedUser = User::factory()->create(['email' => 'invited@example.com']);
    $team = Team::factory()->create(['name' => 'Laravel Team']);

    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);

    $invitation = TeamInvitation::factory()->create([
        'team_id' => $team->id,
        'email' => 'invited@example.com',
        'invited_by' => $owner->id,
    ]);

    $response = $this
        ->actingAs($invitedUser)
        ->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->has('pendingInvitations', 1)
        ->where('pendingInvitations.0.code', $invitation->code)
        ->where('pendingInvitations.0.inviterName', 'Taylor Otwell')
        ->where('pendingInvitations.0.team.name', 'Laravel Team')
        ->where('pendingInvitations.0.team.slug', $team->slug)
        ->missing('pendingInvitations.0.teamName'),
    );
});

test('dashboard does not include accepted invitations', function () {
    $owner = User::factory()->create();
    $invitedUser = User::factory()->create(['email' => 'invited@example.com']);
    $team = Team::factory()->create();

    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);

    TeamInvitation::factory()->accepted()->create([
        'team_id' => $team->id,
        'email' => 'invited@example.com',
        'invited_by' => $owner->id,
    ]);

    $response = $this
        ->actingAs($invitedUser)
        ->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->has('pendingInvitations', 0),
    );
});

test('dashboard excludes expired invitations without deleting them', function () {
    $owner = User::factory()->create();
    $invitedUser = User::factory()->create(['email' => 'invited@example.com']);
    $team = Team::factory()->create();

    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);

    $invitation = TeamInvitation::factory()->expired()->create([
        'team_id' => $team->id,
        'email' => 'invited@example.com',
        'invited_by' => $owner->id,
    ]);

    $response = $this
        ->actingAs($invitedUser)
        ->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->has('pendingInvitations', 0),
    );

    $this->assertDatabaseHas('team_invitations', [
        'id' => $invitation->id,
    ]);
});

test('dashboard does not include or delete other users invitations', function () {
    $owner = User::factory()->create();
    $invitedUser = User::factory()->create(['email' => 'invited@example.com']);
    $team = Team::factory()->create();

    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);

    $invitation = TeamInvitation::factory()->expired()->create([
        'team_id' => $team->id,
        'email' => 'someone@example.com',
        'invited_by' => $owner->id,
    ]);

    $response = $this
        ->actingAs($invitedUser)
        ->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->has('pendingInvitations', 0),
    );

    $this->assertDatabaseHas('team_invitations', [
        'id' => $invitation->id,
    ]);
});

test('the dashboard lists the open issues assigned to the user in the team', function () {
    $user = User::factory()->create();
    $teammate = User::factory()->create();
    $team = $user->currentTeam;
    $team->members()->attach($teammate, ['role' => TeamRole::Member->value]);
    $project = Project::factory()->for($team)->create(['key' => 'DD']);
    $urgent = Issue::factory()->for($project)->withStatus(IssueStatus::InProgress)->create([
        'assignee_id' => $user->id,
        'priority' => IssuePriority::Urgent,
    ]);
    $backlog = Issue::factory()->for($project)->withStatus(IssueStatus::Backlog)->create([
        'assignee_id' => $user->id,
        'priority' => IssuePriority::Low,
    ]);
    Issue::factory()->for($project)->withStatus(IssueStatus::Done)->create(['assignee_id' => $user->id]);
    Issue::factory()->for($project)->withStatus(IssueStatus::Canceled)->create(['assignee_id' => $user->id]);
    Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create(['assignee_id' => $teammate->id]);
    Issue::factory()->withStatus(IssueStatus::Todo)->create(['assignee_id' => $user->id]);

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard', $team));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->has('assignedIssues', 2)
        ->where('assignedIssues.0.identifier', $urgent->identifier)
        ->where('assignedIssues.0.projectId', $project->id)
        ->where('assignedIssues.0.labelIds', [])
        ->where('assignedIssues.1.identifier', $backlog->identifier),
    );
});

test('the dashboard lists the team\'s open issues that are late or due within a week', function () {
    $this->travelTo(Carbon::parse('2026-10-28 10:00:00'));
    $user = User::factory()->create();
    $teammate = User::factory()->create(['name' => 'Grace Hopper']);
    $team = $user->currentTeam;
    $team->members()->attach($teammate, ['role' => TeamRole::Member->value]);
    $project = Project::factory()->for($team)->create();
    $late = Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create([
        'due_date' => '2026-10-20',
        'assignee_id' => $teammate->id,
    ]);
    $inAWeek = Issue::factory()->for($project)->withStatus(IssueStatus::InProgress)->create([
        'due_date' => '2026-11-04',
    ]);
    Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create(['due_date' => '2026-11-05']);
    Issue::factory()->for($project)->withStatus(IssueStatus::Done)->create(['due_date' => '2026-10-27']);
    Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create(['due_date' => null]);
    Issue::factory()->withStatus(IssueStatus::Todo)->create(['due_date' => '2026-10-29']);

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard', $team));

    $response->assertInertia(fn (Assert $page) => $page
        ->has('dueIssues', 2)
        ->where('dueIssues.0.identifier', $late->identifier)
        ->where('dueIssues.0.dueDate', '2026-10-20')
        ->where('dueIssues.0.assignee.name', 'Grace Hopper')
        ->where('dueIssues.1.identifier', $inAWeek->identifier)
        ->where('dueIssues.1.assignee', null),
    );
});

test('the dashboard tells when each issue done since the start of last week was done', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $updateIssue = app(UpdateIssue::class);

    $this->travelTo(Carbon::parse('2026-10-01 09:00:00'));
    $doneLongAgo = Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create();
    $updateIssue->handle($user, $doneLongAgo, ['status' => IssueStatus::Done]);
    $doneTwice = Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create();
    $updateIssue->handle($user, $doneTwice, ['status' => IssueStatus::Done]);

    $this->travelTo(Carbon::parse('2026-10-20 15:00:00'));
    $doneLastWeek = Issue::factory()->for($project)->withStatus(IssueStatus::InReview)->create();
    $updateIssue->handle($user, $doneLastWeek, ['status' => IssueStatus::Done]);

    $this->travelTo(Carbon::parse('2026-10-27 08:30:00'));
    $createdDone = Issue::factory()->for($project)->withStatus(IssueStatus::Done)->create();
    $updateIssue->handle($user, $doneLongAgo, ['title' => 'Renamed after it was done']);

    $this->travelTo(Carbon::parse('2026-10-27 11:00:00'));
    $updateIssue->handle($user, $doneTwice, ['status' => IssueStatus::InProgress]);
    $updateIssue->handle($user, $doneTwice, ['status' => IssueStatus::Done]);
    $reopened = Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create();
    $updateIssue->handle($user, $reopened, ['status' => IssueStatus::Done]);
    $updateIssue->handle($user, $reopened, ['status' => IssueStatus::Todo]);

    $this->travelTo(Carbon::parse('2026-10-28 10:00:00'));
    $updateIssue->handle($user, Issue::factory()->withStatus(IssueStatus::Todo)->create(), ['status' => IssueStatus::Done]);

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard', $user->currentTeam));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('completions', [
            ['issueId' => $doneLastWeek->id, 'completedAt' => '2026-10-20T15:00:00.000000Z'],
            ['issueId' => $createdDone->id, 'completedAt' => '2026-10-27T08:30:00.000000Z'],
            ['issueId' => $doneTwice->id, 'completedAt' => '2026-10-27T11:00:00.000000Z'],
        ]),
    );
});

test('the activity feed shows the team\'s latest changes and comments, newest first', function () {
    $user = User::factory()->create(['name' => 'Ada Lovelace']);
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    $issue = Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create(['title' => 'Ship the dashboard']);
    $issue->recordActivity(IssueActivityType::Created, $user);
    $this->travel(1)->minutes();
    $issue->recordActivity(IssueActivityType::DescriptionChanged, $user);
    $this->travel(1)->minutes();
    $comment = Comment::factory()->for($issue)->for($user, 'author')->create(['body' => 'Looks good to me']);
    $this->travel(1)->minutes();
    $issue->recordActivity(IssueActivityType::StatusChanged, $user, ['from' => 'todo', 'to' => 'in_progress']);
    Issue::factory()->create()->recordActivity(IssueActivityType::Created, $user);

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard', $user->currentTeam));

    $response->assertInertia(fn (Assert $page) => $page
        ->has('activity', 3)
        ->where('activity.0.kind', 'activity')
        ->where('activity.0.issue', ['identifier' => 'DD-1', 'title' => 'Ship the dashboard'])
        ->where('activity.0.activity.type', 'status_changed')
        ->where('activity.0.activity.properties', ['from' => 'todo', 'to' => 'in_progress'])
        ->where('activity.0.activity.actor.name', 'Ada Lovelace')
        ->where('activity.1.kind', 'comment')
        ->where('activity.1.id', $comment->id)
        ->where('activity.1.comment.body', 'Looks good to me')
        ->where('activity.1.comment.author.name', 'Ada Lovelace')
        ->where('activity.2.activity.type', 'created'),
    );
});

test('the development card shows the team\'s latest pull requests, commits and tool reports, newest first', function () {
    $user = User::factory()->create(['name' => 'Ada Lovelace']);
    $issue = Issue::factory()
        ->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))
        ->create(['title' => 'Ship the API']);
    $pullRequest = IssueLink::factory()->for($issue)->create(['updated_at' => now()->subMinutes(30)]);
    $event = ToolEvent::factory()->for($user->currentTeam)->for($user)->for($issue)->create([
        'tool' => 'codex',
        'event' => 'session_started',
        'branch' => 'dd-1-ship-the-api',
        'created_at' => now()->subMinutes(10),
    ]);
    $commit = IssueLink::factory()->commit()->for($issue)->create(['updated_at' => now()->subHour()]);
    IssueLink::factory()->create();
    ToolEvent::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard', $user->currentTeam));

    $response->assertInertia(fn (Assert $page) => $page
        ->has('development', 3)
        ->where('development.0.kind', 'tool')
        ->where('development.0.id', $event->id)
        ->where('development.0.tool', 'codex')
        ->where('development.0.event', 'session_started')
        ->where('development.0.branch', 'dd-1-ship-the-api')
        ->where('development.0.user', 'Ada Lovelace')
        ->where('development.0.issue', ['identifier' => 'DD-1', 'title' => 'Ship the API'])
        ->where('development.1.kind', 'link')
        ->where('development.1.id', $pullRequest->id)
        ->where('development.1.link.type', 'pull_request')
        ->where('development.2.id', $commit->id),
    );
});

test('the dashboard says whether github is connected and who may connect it', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($owner, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($member, ['role' => TeamRole::Member->value]);
    GithubWebhook::factory()->for($team)->create();

    $this
        ->actingAs($owner)
        ->get(route('dashboard', $team))
        ->assertInertia(fn (Assert $page) => $page->where('github', ['connected' => true, 'canConnect' => true]));

    $this
        ->actingAs($member)
        ->get(route('dashboard', $team))
        ->assertInertia(fn (Assert $page) => $page->where('github', ['connected' => true, 'canConnect' => false]));
});

test('the activity feed keeps only the latest entries', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();
    $oldest = Comment::factory()->for($issue)->for($user, 'author')->create();

    foreach (range(1, DashboardController::ACTIVITY_LIMIT) as $minute) {
        $this->travel(1)->minutes();
        Comment::factory()->for($issue)->for($user, 'author')->create();
    }

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard', $user->currentTeam));

    $response->assertInertia(fn (Assert $page) => $page
        ->has('activity', DashboardController::ACTIVITY_LIMIT)
        ->where('activity', fn ($activity) => collect($activity)->doesntContain('id', $oldest->id)),
    );
});

test('the dashboard lists the team\'s projects with their progress', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->withStatus(ProjectStatus::InProgress)->create(['key' => 'DD']);
    Issue::factory()->for($project)->withStatus(IssueStatus::Done)->create();
    Issue::factory()->for($project)->withStatus(IssueStatus::Todo)->create();
    Project::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard', $user->currentTeam));

    $response->assertInertia(fn (Assert $page) => $page
        ->has('projects', 1)
        ->where('projects.0.key', 'DD')
        ->where('projects.0.status', 'in_progress')
        ->where('projects.0.issuesCount', 2)
        ->where('projects.0.completedIssuesCount', 1),
    );
});

test('only members who may invite are offered to invite from the dashboard', function () {
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $team = $owner->currentTeam;
    $team->members()->attach($member, ['role' => TeamRole::Member->value]);

    $this->actingAs($owner)
        ->get(route('dashboard', $team))
        ->assertInertia(fn (Assert $page) => $page->where('canInviteMembers', true));

    $this->actingAs($member)
        ->get(route('dashboard', $team))
        ->assertInertia(fn (Assert $page) => $page->where('canInviteMembers', false));
});
