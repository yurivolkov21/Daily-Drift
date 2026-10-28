<?php

use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Enums\TeamRole;
use App\Events\NotificationsChanged;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Notifications\IssueAssigned;
use App\Notifications\MentionedInComment;
use Carbon\CarbonInterface;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Notifications\Notification as BaseNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Add a new member to the user's current team.
 */
function teammateOf(User $user, string $name = 'Ada Lovelace'): User
{
    $teammate = User::factory()->create(['name' => $name]);

    $user->currentTeam->members()->attach($teammate, ['role' => TeamRole::Member->value]);

    return $teammate;
}

/**
 * Write a mention of the user the way the comment box does.
 */
function mentionOf(User $user): string
{
    return "@[{$user->name}](user:{$user->id})";
}

/**
 * Store a notification for the user without going through an issue.
 */
function notificationFor(User $user, ?CarbonInterface $createdAt = null, ?CarbonInterface $readAt = null): DatabaseNotification
{
    return $user->notifications()->create([
        'id' => Str::uuid()->toString(),
        'type' => 'issue-assigned',
        'data' => ['issue' => ['identifier' => 'DD-1', 'title' => 'Fix the login page']],
        'read_at' => $readAt,
        'created_at' => $createdAt ?? now(),
    ]);
}

test('people are notified when an issue is created for them', function () {
    Notification::fake();
    $user = User::factory()->create();
    $assignee = teammateOf($user);
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);

    $this->actingAs($user)->post(route('issues.store', $user->currentTeam), [
        'project_id' => $project->id,
        'title' => 'Add keyboard shortcuts',
        'status' => IssueStatus::Todo->value,
        'priority' => IssuePriority::High->value,
        'assignee_id' => $assignee->id,
    ]);

    Notification::assertCount(1);
    Notification::assertSentTo(
        $assignee,
        IssueAssigned::class,
        fn (IssueAssigned $notification) => $notification->issue->identifier === 'DD-1' && $notification->actor->is($user),
    );
});

test('people are notified when an issue is assigned to them', function () {
    Notification::fake();
    $user = User::factory()->create();
    $assignee = teammateOf($user);
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this->actingAs($user)->patch(route('issues.update', [$user->currentTeam, 'DD-1']), [
        'assignee_id' => $assignee->id,
    ]);

    Notification::assertCount(1);
    Notification::assertSentTo(
        $assignee,
        IssueAssigned::class,
        fn (IssueAssigned $notification) => $notification->issue->identifier === 'DD-1' && $notification->actor->is($user),
    );
});

test('assigning an issue to yourself sends no notification', function () {
    Notification::fake();
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['key' => 'DD']);
    Issue::factory()->for($project)->create();
    $this->actingAs($user);

    $this->post(route('issues.store', $user->currentTeam), [
        'project_id' => $project->id,
        'title' => 'Add keyboard shortcuts',
        'status' => IssueStatus::Todo->value,
        'priority' => IssuePriority::High->value,
        'assignee_id' => $user->id,
    ]);
    $this->patch(route('issues.update', [$user->currentTeam, 'DD-1']), [
        'assignee_id' => $user->id,
    ]);

    expect(Issue::query()->where('assignee_id', $user->id)->count())->toBe(2);
    Notification::assertNothingSent();
});

test('other changes to an assigned issue send no notification', function () {
    Notification::fake();
    $user = User::factory()->create();
    $assignee = teammateOf($user);
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create([
        'assignee_id' => $assignee->id,
    ]);
    $this->actingAs($user);

    $this->patch(route('issues.update', [$user->currentTeam, 'DD-1']), ['status' => IssueStatus::Done->value]);
    $this->patch(route('issues.update', [$user->currentTeam, 'DD-1']), ['assignee_id' => null]);

    Notification::assertNothingSent();
});

test('people mentioned in a comment are notified', function () {
    Notification::fake();
    $user = User::factory()->create();
    $ada = teammateOf($user, 'Ada Lovelace');
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this->actingAs($user)->post(route('issues.comments.store', [$user->currentTeam, 'DD-1']), [
        'body' => 'Could you check this, '.mentionOf($ada).'?',
    ]);

    Notification::assertCount(1);
    Notification::assertSentTo(
        $ada,
        MentionedInComment::class,
        fn (MentionedInComment $notification) => $notification->comment->issue->identifier === 'DD-1' && $notification->actor->is($user),
    );
});

test('mentions of the author and of people outside the team are not notified', function () {
    Notification::fake();
    $user = User::factory()->create();
    $outsider = User::factory()->create();
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this->actingAs($user)->post(route('issues.comments.store', [$user->currentTeam, 'DD-1']), [
        'body' => 'Note to self '.mentionOf($user).', and '.mentionOf($outsider).'.',
    ]);

    expect(Comment::query()->count())->toBe(1);
    Notification::assertNothingSent();
});

test('editing a comment notifies only the people it newly mentions', function () {
    Notification::fake();
    $user = User::factory()->create();
    $ada = teammateOf($user, 'Ada Lovelace');
    $grace = teammateOf($user, 'Grace Hopper');
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();
    $comment = Comment::factory()->for($issue)->for($user, 'author')->create([
        'body' => 'Thanks '.mentionOf($ada),
    ]);

    $this->actingAs($user)->patch(route('issues.comments.update', [$user->currentTeam, 'DD-1', $comment->id]), [
        'body' => 'Thanks '.mentionOf($ada).' and '.mentionOf($grace),
    ]);

    Notification::assertCount(1);
    Notification::assertSentTo($grace, MentionedInComment::class);
});

test('notifications keep what the recipient needs to read them later', function () {
    $user = User::factory()->create(['name' => 'Grace Hopper']);
    $ada = teammateOf($user, 'Ada Lovelace');
    $team = $user->currentTeam;
    Issue::factory()->for(Project::factory()->for($team)->create(['key' => 'DD']))->create([
        'title' => 'Fix the login page',
    ]);
    $this->actingAs($user);

    $this->patch(route('issues.update', [$team, 'DD-1']), ['assignee_id' => $ada->id]);
    $this->post(route('issues.comments.store', [$team, 'DD-1']), [
        'body' => mentionOf($ada)." can you\ntake a look?",
    ]);

    $sharedData = [
        'team' => ['slug' => $team->slug, 'name' => $team->name],
        'issue' => ['identifier' => 'DD-1', 'title' => 'Fix the login page'],
        'actor' => ['id' => $user->id, 'name' => 'Grace Hopper'],
    ];

    expect($ada->notifications()->where('type', 'issue-assigned')->sole()->data)->toBe($sharedData)
        ->and($ada->notifications()->where('type', 'comment-mention')->sole()->data)->toBe([
            ...$sharedData,
            'comment' => [
                'id' => Comment::query()->sole()->id,
                'excerpt' => '@Ada Lovelace can you take a look?',
            ],
        ]);
});

test('people see their own notifications, newest first', function () {
    $user = User::factory()->create();
    $older = notificationFor($user, now()->subHour());
    $newer = notificationFor($user, now(), readAt: now());
    notificationFor(User::factory()->create());

    $response = $this->actingAs($user)->getJson(route('notifications.index'));

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.0.type', 'issue-assigned')
        ->assertJsonPath('data.0.data.issue.identifier', 'DD-1')
        ->assertJsonPath('data.0.readAt', $newer->read_at->toISOString())
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonPath('data.1.readAt', null);
});

test('guests cannot read notifications', function () {
    $this->getJson(route('notifications.index'))->assertUnauthorized();
});

test('a notification can be marked as read and unread again', function () {
    $user = User::factory()->create();
    $notification = notificationFor($user);
    $this->actingAs($user);

    $this->patchJson(route('notifications.update', $notification->id), ['read' => true])->assertNoContent();
    expect($notification->fresh()->read_at)->not->toBeNull();

    $this->patchJson(route('notifications.update', $notification->id), ['read' => false])->assertNoContent();
    expect($notification->fresh()->read_at)->toBeNull();
});

test('marking a notification needs to say whether it was read', function () {
    $user = User::factory()->create();
    $notification = notificationFor($user);

    $this->actingAs($user)
        ->patchJson(route('notifications.update', $notification->id), ['read' => 'maybe'])
        ->assertJsonValidationErrors(['read' => 'The read field must be true or false.']);
});

test('people cannot mark someone else\'s notification', function () {
    $notification = notificationFor(User::factory()->create());

    $this->actingAs(User::factory()->create())
        ->patchJson(route('notifications.update', $notification->id), ['read' => true])
        ->assertNotFound();

    expect($notification->fresh()->read_at)->toBeNull();
});

test('all of a person\'s notifications can be marked as read at once', function () {
    $user = User::factory()->create();
    notificationFor($user);
    notificationFor($user);
    $someoneElses = notificationFor(User::factory()->create());

    $this->actingAs($user)->postJson(route('notifications.read-all'))->assertNoContent();

    expect($user->unreadNotifications()->count())->toBe(0)
        ->and($someoneElses->fresh()->read_at)->toBeNull();
});

test('pages share how many notifications are unread', function () {
    $user = User::factory()->create();
    notificationFor($user);
    notificationFor($user);
    notificationFor($user, readAt: now());

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('unreadNotificationsCount', 2));
});

test('people are told live when a notification arrives for them', function () {
    Event::fake([NotificationsChanged::class]);
    $user = User::factory()->create();
    $assignee = teammateOf($user);
    Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this->actingAs($user)->patch(route('issues.update', [$user->currentTeam, 'DD-1']), [
        'assignee_id' => $assignee->id,
    ]);

    Event::assertDispatchedTimes(NotificationsChanged::class, 1);
    Event::assertDispatched(NotificationsChanged::class, fn (NotificationsChanged $event) => $event->user->is($assignee));
});

test('notifications sent by email are not announced', function () {
    Event::fake([NotificationsChanged::class]);

    event(new NotificationSent(User::factory()->create(), new class extends BaseNotification {}, 'mail'));

    Event::assertNotDispatched(NotificationsChanged::class);
});

test('reading notifications updates the person\'s other tabs', function (string $action) {
    Event::fake([NotificationsChanged::class]);
    $user = User::factory()->create();
    $notification = notificationFor($user);
    $this->actingAs($user)->withHeader('X-Socket-ID', '1234.5678');

    match ($action) {
        'read' => $this->patchJson(route('notifications.update', $notification->id), ['read' => true]),
        'unread' => $this->patchJson(route('notifications.update', $notification->id), ['read' => false]),
        'read all' => $this->postJson(route('notifications.read-all')),
    };

    Event::assertDispatched(
        NotificationsChanged::class,
        fn (NotificationsChanged $event) => $event->user->is($user) && $event->socket === '1234.5678',
    );
})->with(['read', 'unread', 'read all']);

test('the live update goes to the person\'s own channel with their unread count', function () {
    $user = User::factory()->create();
    notificationFor($user);
    notificationFor($user);
    notificationFor($user, readAt: now());

    $event = new NotificationsChanged($user);

    expect($event->broadcastOn()[0]->name)->toBe('private-user.'.$user->id)
        ->and($event->broadcastAs())->toBe('notifications.changed')
        ->and($event->broadcastWith())->toBe(['unreadCount' => 2]);
});
