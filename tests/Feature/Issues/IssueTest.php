<?php

use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Enums\TeamRole;
use App\Models\Issue;
use App\Models\Label;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $team = Team::factory()->create();

    $response = $this->get(route('issues.index', $team));

    $response->assertRedirect(route('login'));
});

test('members see the issues of their team only', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create(['title' => 'Ship the board view']);
    Issue::factory()->create(['title' => 'Another team issue']);

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', $user->currentTeam));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('issues/index')
        ->has('issues', 1)
        ->where('issues.0.identifier', 'DD-1')
        ->where('issues.0.title', 'Ship the board view')
        ->where('view', 'list'),
    );
});

test('issues can be filtered by project key', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $project = Project::factory()->for($team)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create();
    Issue::factory()->for(Project::factory()->for($team)->create(['key' => 'WEB']))->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', ['current_team' => $team, 'project' => 'dd']));

    $response->assertInertia(fn (Assert $page) => $page
        ->has('issues', 1)
        ->where('issues.0.identifier', 'DD-1')
        ->where('filters.project', 'DD'),
    );
});

test('issues can be filtered to those assigned to the current user', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $assigned = Issue::factory()->for($project)->for($user, 'assignee')->create();
    Issue::factory()->for($project)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', ['current_team' => $user->currentTeam, 'assignee' => 'me']));

    $response->assertInertia(fn (Assert $page) => $page
        ->has('issues', 1)
        ->where('issues.0.id', $assigned->id)
        ->where('filters.assignee', 'me'),
    );
});

test('issues can be shown as a board', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', ['current_team' => $user->currentTeam, 'view' => 'board']));

    $response->assertInertia(fn (Assert $page) => $page->where('view', 'board'));
});

test('non members cannot view a team\'s issues', function () {
    $user = User::factory()->create();
    $team = Team::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.index', $team));

    $response->assertForbidden();
});

test('issues can be created', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $assignee = User::factory()->create();
    $team->members()->attach($assignee, ['role' => TeamRole::Member->value]);
    $project = Project::factory()->for($team)->create(['key' => 'DD']);
    $label = Label::factory()->for($team)->create();

    $response = $this
        ->actingAs($user)
        ->from(route('issues.index', $team))
        ->post(route('issues.store', $team), [
            'project_id' => $project->id,
            'title' => 'Add keyboard shortcuts',
            'description' => 'Press C to create an issue.',
            'status' => IssueStatus::Todo->value,
            'priority' => IssuePriority::High->value,
            'assignee_id' => $assignee->id,
            'due_date' => '2026-11-15',
            'label_ids' => [$label->id],
        ]);

    $response->assertRedirect(route('issues.index', $team));
    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Issue DD-1 created.']);

    $issue = $project->issues()->sole();

    expect($issue)
        ->number->toBe(1)
        ->title->toBe('Add keyboard shortcuts')
        ->description->toBe('Press C to create an issue.')
        ->status->toBe(IssueStatus::Todo)
        ->priority->toBe(IssuePriority::High)
        ->assignee_id->toBe($assignee->id)
        ->creator_id->toBe($user->id);
    expect($issue->due_date->toDateString())->toBe('2026-11-15');
    expect($issue->labels->modelKeys())->toBe([$label->id]);
});

test('issue numbers increase independently in each project', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $first = Project::factory()->for($team)->create(['key' => 'DD']);
    $second = Project::factory()->for($team)->create(['key' => 'WEB']);

    foreach ([$first, $first, $second] as $project) {
        $this->actingAs($user)->post(route('issues.store', $team), [
            'project_id' => $project->id,
            'title' => 'Issue',
            'status' => IssueStatus::Backlog->value,
            'priority' => IssuePriority::None->value,
        ]);
    }

    expect($first->issues()->orderBy('number')->pluck('number')->all())->toBe([1, 2]);
    expect($second->issues()->pluck('number')->all())->toBe([1]);
});

test('issue numbers are not reused after an issue is deleted', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    Issue::factory()->for($project)->create()->delete();

    $issue = Issue::factory()->for($project)->create();

    expect($issue->number)->toBe(2);
});

test('issue creation requires a project, title, status and priority', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('issues.store', $user->currentTeam), []);

    $response->assertSessionHasErrors([
        'project_id' => 'The project field is required.',
        'title' => 'The title field is required.',
        'status' => 'The status field is required.',
        'priority' => 'The priority field is required.',
    ]);
    expect(Issue::count())->toBe(0);
});

test('issues cannot be created in another team\'s project', function () {
    $user = User::factory()->create();
    $otherProject = Project::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('issues.store', $user->currentTeam), [
            'project_id' => $otherProject->id,
            'title' => 'Sneaky issue',
            'status' => IssueStatus::Todo->value,
            'priority' => IssuePriority::None->value,
        ]);

    $response->assertSessionHasErrors(['project_id' => 'The selected project is invalid.']);
    expect(Issue::count())->toBe(0);
});

test('issues cannot be assigned to users outside the team', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $outsider = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('issues.store', $user->currentTeam), [
            'project_id' => $project->id,
            'title' => 'Issue',
            'status' => IssueStatus::Todo->value,
            'priority' => IssuePriority::None->value,
            'assignee_id' => $outsider->id,
        ]);

    $response->assertSessionHasErrors(['assignee_id' => 'The selected assignee is invalid.']);
});

test('issues cannot use labels from another team', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $foreignLabel = Label::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('issues.store', $user->currentTeam), [
            'project_id' => $project->id,
            'title' => 'Issue',
            'status' => IssueStatus::Todo->value,
            'priority' => IssuePriority::None->value,
            'label_ids' => [$foreignLabel->id],
        ]);

    $response->assertSessionHasErrors(['label_ids.0' => 'The selected label is invalid.']);
});

test('an issue can be viewed by its identifier', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    $issue = Issue::factory()->for($project)->for($user, 'creator')->create(['title' => 'Write the docs']);

    $response = $this
        ->actingAs($user)
        ->get(route('issues.show', [$user->currentTeam, 'dd-1']));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('issues/show')
        ->where('issue.id', $issue->id)
        ->where('issue.identifier', 'DD-1')
        ->where('issue.title', 'Write the docs')
        ->where('issue.creator.name', $user->name),
    );
});

test('issues of another team are not found through the current team', function () {
    $user = User::factory()->create();
    Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for(Project::factory()->create(['key' => 'DD']))->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.show', [$user->currentTeam, 'DD-1']));

    $response->assertNotFound();
});

test('non members cannot view another team\'s issue', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['key' => 'DD']);
    Issue::factory()->for($project)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('issues.show', [$project->team, 'DD-1']));

    $response->assertForbidden();
});

test('issues can be updated one property at a time', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $issue = Issue::factory()->for($project)->create([
        'title' => 'Keep this title',
        'status' => IssueStatus::Todo,
    ]);

    $response = $this
        ->actingAs($user)
        ->from(route('issues.show', [$user->currentTeam, $issue->identifier]))
        ->patch(route('issues.update', [$user->currentTeam, $issue->identifier]), [
            'status' => IssueStatus::InProgress->value,
            'assignee_id' => $user->id,
        ]);

    $response->assertRedirect(route('issues.show', [$user->currentTeam, $issue->identifier]));

    expect($issue->fresh())
        ->title->toBe('Keep this title')
        ->status->toBe(IssueStatus::InProgress)
        ->assignee_id->toBe($user->id);
});

test('updating labels replaces the issue\'s labels', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $issue = Issue::factory()->for(Project::factory()->for($team))->create();
    $bug = Label::factory()->for($team)->create();
    $feature = Label::factory()->for($team)->create();
    $issue->labels()->attach($bug);

    $this
        ->actingAs($user)
        ->patch(route('issues.update', [$team, $issue->identifier]), [
            'label_ids' => [$feature->id],
        ]);

    expect($issue->labels()->pluck('labels.id')->all())->toBe([$feature->id]);
});

test('all labels can be removed from an issue', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $issue = Issue::factory()->for(Project::factory()->for($team))->create();
    $issue->labels()->attach(Label::factory()->for($team)->create());

    $this
        ->actingAs($user)
        ->patch(route('issues.update', [$team, $issue->identifier]), [
            'label_ids' => [],
        ]);

    expect($issue->labels()->count())->toBe(0);
});

test('issues cannot be moved to an unknown status', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('issues.update', [$user->currentTeam, $issue->identifier]), [
            'status' => 'shipped',
        ]);

    $response->assertSessionHasErrors(['status' => 'The selected status is invalid.']);
    expect($issue->fresh()->status)->toBe(IssueStatus::Backlog);
});

test('issues can be deleted', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('issues.destroy', [$user->currentTeam, $issue->identifier]));

    $response->assertRedirect(route('issues.index', $user->currentTeam));
    $response->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Issue DD-1 deleted.']);
    $this->assertModelMissing($issue);
});
