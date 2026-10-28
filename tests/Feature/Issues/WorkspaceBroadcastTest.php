<?php

use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Events\WorkspaceChanged;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\Label;
use App\Models\Project;
use App\Models\Subtask;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    Event::fake([WorkspaceChanged::class]);
});

/**
 * Assert that exactly one change was announced to the team.
 */
function assertWorkspaceChanged(User $user, string $subject, string $action, ?string $issue = null): void
{
    Event::assertDispatchedTimes(WorkspaceChanged::class, 1);
    Event::assertDispatched(
        WorkspaceChanged::class,
        fn (WorkspaceChanged $event) => $event->teamId === $user->currentTeam->id
            && $event->subject === $subject
            && $event->action === $action
            && $event->issueIdentifier === $issue,
    );
}

test('changes are announced on the team\'s private channel without their data', function () {
    $event = new WorkspaceChanged(7, 'issue', 'updated', 'DD-3');

    expect($event->broadcastOn()[0]->name)->toBe('private-team.7')
        ->and($event->broadcastAs())->toBe('workspace.changed')
        ->and($event->broadcastWith())->toBe(['subject' => 'issue', 'action' => 'updated', 'issue' => 'DD-3']);
});

test('creating an issue is announced to the team', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);

    $this->actingAs($user)->post(route('issues.store', $user->currentTeam), [
        'project_id' => $project->id,
        'title' => 'Add keyboard shortcuts',
        'status' => IssueStatus::Todo->value,
        'priority' => IssuePriority::High->value,
    ]);

    assertWorkspaceChanged($user, 'issue', 'created', 'DD-1');
});

test('changing an issue is announced to the team', function () {
    $user = User::factory()->create();
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this->actingAs($user)->patch(route('issues.update', [$user->currentTeam, 'DD-1']), [
        'status' => IssueStatus::InProgress->value,
    ]);

    assertWorkspaceChanged($user, 'issue', 'updated', 'DD-1');
});

test('deleting an issue is announced to the team', function () {
    $user = User::factory()->create();
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this->actingAs($user)->delete(route('issues.destroy', [$user->currentTeam, 'DD-1']));

    assertWorkspaceChanged($user, 'issue', 'deleted', 'DD-1');
});

test('comments on an issue are announced to the team', function (string $action) {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();
    $comment = Comment::factory()->for($issue)->for($user, 'author')->create();
    $this->actingAs($user);

    match ($action) {
        'created' => $this->post(route('issues.comments.store', [$user->currentTeam, 'DD-1']), ['body' => 'Looks good.']),
        'updated' => $this->patch(route('issues.comments.update', [$user->currentTeam, 'DD-1', $comment->id]), ['body' => 'Looks great.']),
        'deleted' => $this->delete(route('issues.comments.destroy', [$user->currentTeam, 'DD-1', $comment->id])),
    };

    assertWorkspaceChanged($user, 'comment', $action, 'DD-1');
})->with(['created', 'updated', 'deleted']);

test('sub-tasks of an issue are announced to the team', function (string $action) {
    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();
    $subtask = Subtask::factory()->for($issue)->create();
    $this->actingAs($user);

    match ($action) {
        'created' => $this->post(route('issues.subtasks.store', [$user->currentTeam, 'DD-1']), ['title' => 'Write the tests']),
        'updated' => $this->patch(route('issues.subtasks.update', [$user->currentTeam, 'DD-1', $subtask->id]), ['completed' => true]),
        'deleted' => $this->delete(route('issues.subtasks.destroy', [$user->currentTeam, 'DD-1', $subtask->id])),
    };

    assertWorkspaceChanged($user, 'subtask', $action, 'DD-1');
})->with(['created', 'updated', 'deleted']);

test('projects are announced to the team', function (string $action) {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    $this->actingAs($user);

    match ($action) {
        'created' => $this->post(route('projects.store', $user->currentTeam), ['name' => 'Website', 'key' => 'WEB']),
        'updated' => $this->patch(route('projects.update', [$user->currentTeam, $project]), ['status' => 'paused']),
        'deleted' => $this->delete(route('projects.destroy', [$user->currentTeam, $project])),
    };

    assertWorkspaceChanged($user, 'project', $action);
})->with(['created', 'updated', 'deleted']);

test('labels are announced to the team', function (string $action) {
    $user = User::factory()->create();
    $label = Label::factory()->for($user->currentTeam)->create(['name' => 'Bug']);
    $this->actingAs($user);

    match ($action) {
        'created' => $this->post(route('labels.store', $user->currentTeam), ['name' => 'Feature', 'color' => '#5e6ad2']),
        'updated' => $this->patch(route('labels.update', [$user->currentTeam, $label]), ['name' => 'Defect', 'color' => '#eb5757']),
        'deleted' => $this->delete(route('labels.destroy', [$user->currentTeam, $label])),
    };

    assertWorkspaceChanged($user, 'label', $action);
})->with(['created', 'updated', 'deleted']);

test('the person who made a change is left out of its announcement', function () {
    $user = User::factory()->create();
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this
        ->actingAs($user)
        ->withHeader('X-Socket-ID', '1234.5678')
        ->patch(route('issues.update', [$user->currentTeam, 'DD-1']), [
            'status' => IssueStatus::Done->value,
        ]);

    Event::assertDispatched(WorkspaceChanged::class, fn (WorkspaceChanged $event) => $event->socket === '1234.5678');
});
