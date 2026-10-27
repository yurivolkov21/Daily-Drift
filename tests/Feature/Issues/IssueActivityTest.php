<?php

use App\Enums\IssueActivityType;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Enums\TeamRole;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\Label;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('creating an issue records who created it', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $this->actingAs($user)->post(route('issues.store', $user->currentTeam), [
        'project_id' => $project->id,
        'title' => 'New issue',
        'status' => IssueStatus::Todo->value,
        'priority' => IssuePriority::None->value,
    ]);

    $activity = $project->issues()->sole()->activities()->sole();

    expect($activity)
        ->type->toBe(IssueActivityType::Created)
        ->user_id->toBe($user->id)
        ->properties->toBeNull();
});

test('changing an issue records each changed property', function () {
    $user = User::factory()->create(['name' => 'Ada']);
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->create([
        'title' => 'Old title',
        'status' => IssueStatus::Todo,
        'priority' => IssuePriority::Low,
        'due_date' => '2026-11-01',
    ]);

    $this->actingAs($user)->patch(route('issues.update', [$user->currentTeam, $issue->identifier]), [
        'title' => 'New title',
        'description' => 'Now with details.',
        'status' => IssueStatus::InProgress->value,
        'priority' => IssuePriority::High->value,
        'assignee_id' => $user->id,
        'due_date' => '2026-11-15',
    ]);

    $activities = $issue->activities()->get()->keyBy(fn ($activity) => $activity->type->value);

    expect($activities->keys()->sort()->values()->all())->toBe([
        'assignee_changed',
        'description_changed',
        'due_date_changed',
        'priority_changed',
        'status_changed',
        'title_changed',
    ]);
    expect($activities['title_changed']->properties)->toBe(['from' => 'Old title', 'to' => 'New title']);
    expect($activities['description_changed']->properties)->toBeNull();
    expect($activities['status_changed']->properties)->toBe(['from' => 'todo', 'to' => 'in_progress']);
    expect($activities['priority_changed']->properties)->toBe(['from' => 1, 'to' => 3]);
    expect($activities['assignee_changed']->properties)->toBe(['from' => null, 'to' => ['id' => $user->id, 'name' => 'Ada']]);
    expect($activities['due_date_changed']->properties)->toBe(['from' => '2026-11-01', 'to' => '2026-11-15']);
    expect($activities->every(fn ($activity) => $activity->user_id === $user->id))->toBeTrue();
});

test('saving an unchanged property records nothing', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam))->withStatus(IssueStatus::Todo)->create();

    $this->actingAs($user)->patch(route('issues.update', [$user->currentTeam, $issue->identifier]), [
        'status' => IssueStatus::Todo->value,
    ]);

    expect($issue->activities()->count())->toBe(0);
});

test('changing labels records the added and removed labels', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;
    $issue = Issue::factory()->for(Project::factory()->for($team))->create();
    $bug = Label::factory()->for($team)->create(['name' => 'Bug', 'color' => '#eb5757']);
    $feature = Label::factory()->for($team)->create(['name' => 'Feature', 'color' => '#5e6ad2']);
    $issue->labels()->attach($bug);

    $this->actingAs($user)->patch(route('issues.update', [$team, $issue->identifier]), [
        'label_ids' => [$feature->id],
    ]);

    expect($issue->activities()->sole())
        ->type->toBe(IssueActivityType::LabelsChanged)
        ->properties->toBe([
            'added' => [['id' => $feature->id, 'name' => 'Feature', 'color' => '#5e6ad2']],
            'removed' => [['id' => $bug->id, 'name' => 'Bug', 'color' => '#eb5757']],
        ]);
});

test('the issue page lists comments and history oldest first', function () {
    $user = User::factory()->create();
    $teammate = User::factory()->create(['name' => 'Grace']);
    $team = $user->currentTeam;
    $team->members()->attach($teammate, ['role' => TeamRole::Member->value]);
    $issue = Issue::factory()->for(Project::factory()->for($team))->create();
    $issue->recordActivity(IssueActivityType::Created, $user);
    $this->travel(1)->minutes();
    Comment::factory()->for($issue)->for($teammate, 'author')->create(['body' => 'First comment']);
    $this->travel(1)->minutes();
    Comment::factory()->for($issue)->for($user, 'author')->create(['body' => 'Second comment']);

    $response = $this
        ->actingAs($user)
        ->get(route('issues.show', [$team, $issue->identifier]));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('issues/show')
        ->has('activities', 1)
        ->where('activities.0.type', 'created')
        ->where('activities.0.actor.id', $user->id)
        ->has('comments', 2)
        ->where('comments.0.body', 'First comment')
        ->where('comments.0.author.name', 'Grace')
        ->where('comments.1.body', 'Second comment'),
    );
});
