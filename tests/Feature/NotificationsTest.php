<?php

namespace Tests\Feature;

use App\Enums\Priority;
use App\Enums\TeamRole;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use App\Notifications\MentionedInComment;
use App\Notifications\TaskAssigned;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Spec 0006: who is notified and when, the bell's panel, the notifications
 * page and marking as read.
 */
class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $me;

    private User $minh;

    private User $linh;

    private User $khoa;

    private Project $project;

    private TaskList $list;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        // Thursday 12 November.
        $this->travelTo('2026-11-12 03:00:00');

        $this->team = Team::factory()->create();
        $this->me = User::factory()->create(['name' => 'Giang', 'timezone' => 'UTC']);
        $this->minh = User::factory()->create(['name' => 'Minh An']);
        $this->linh = User::factory()->create(['name' => 'Thuy Linh']);
        $this->khoa = User::factory()->create(['name' => 'Dang Khoa']);

        foreach ([$this->me, $this->minh, $this->linh, $this->khoa] as $user) {
            $this->team->members()->attach($user, ['role' => TeamRole::Member->value]);
            $user->switchTeam($this->team);
        }

        $this->project = Project::factory()->for($this->team)->create(['name' => 'Daily-Drift v1']);
        $this->list = TaskList::factory()->for($this->project)->create(['name' => 'To do']);
        $this->task = Task::factory()->for($this->list, 'list')->create(['title' => 'Event log table', 'assignee_id' => null]);
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    private function url(string $name, array $parameters = [], ?Team $team = null): string
    {
        return route($name, ['current_team' => ($team ?? $this->team)->slug, ...$parameters]);
    }

    private function assign(User $actor, ?User $assignee, ?Task $task = null): TestResponse
    {
        return $this->actingAs($actor)->patch($this->url('tasks.update', ['task' => ($task ?? $this->task)->id]), ['assignee_id' => $assignee?->id]);
    }

    /**
     * @param  array<int, User>  $mentions
     */
    private function comment(User $author, string $body, array $mentions, ?Task $task = null): TestResponse
    {
        return $this->actingAs($author)->post(
            $this->url('comments.store', ['task' => ($task ?? $this->task)->id]),
            ['body' => $body, 'mentions' => array_map(fn (User $user) => $user->id, $mentions)],
        );
    }

    private function notificationsOf(User $user): Collection
    {
        return DatabaseNotification::query()->where('notifiable_id', $user->id)->get();
    }

    /**
     * Store a notification directly, at a given time.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function stored(User $user, string $type = TaskAssigned::class, ?Team $team = null, ?string $at = null, array $overrides = []): DatabaseNotification
    {
        $team ??= $this->team;

        return DatabaseNotification::query()->create([
            'id' => (string) str()->uuid(),
            'type' => $type,
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'team_id' => $team->id,
            'data' => [
                'actor' => ['id' => $this->minh->id, 'name' => 'Minh An'],
                'task' => ['id' => $this->task->id, 'title' => $this->task->title],
                'project' => ['id' => $this->project->id, 'name' => $this->project->name, 'color' => $this->project->color->value],
                ...($type === MentionedInComment::class ? ['comment' => ['id' => 0, 'excerpt' => 'Hello']] : []),
            ],
            'created_at' => $at ?? now(),
            'updated_at' => $at ?? now(),
            ...$overrides,
        ]);
    }

    public function test_assigning_a_task_to_someone_else_notifies_them_in_the_tasks_team()
    {
        $this->assign($this->minh, $this->me)->assertSessionHasNoErrors();

        $notification = $this->notificationsOf($this->me)->sole();
        $this->assertSame(TaskAssigned::class, $notification->type);
        $this->assertSame($this->team->id, $notification->getAttribute('team_id'));
        $this->assertNull($notification->read_at);
        $this->assertSame([
            'actor' => ['id' => $this->minh->id, 'name' => 'Minh An'],
            'task' => ['id' => $this->task->id, 'title' => 'Event log table'],
            'project' => ['id' => $this->project->id, 'name' => 'Daily-Drift v1', 'color' => $this->project->color->value],
        ], $notification->data);
    }

    public function test_assigning_yourself_or_unassigning_notifies_nobody()
    {
        $this->assign($this->me, $this->me);
        $this->assign($this->me, null);

        $this->assertSame(0, DatabaseNotification::query()->count());
    }

    public function test_a_comment_notifies_each_mentioned_teammate_but_not_its_author()
    {
        $this->comment($this->me, '@Minh An @Thuy Linh @Giang have a look', [$this->minh, $this->linh, $this->me])->assertSessionHasNoErrors();

        $this->assertCount(1, $this->notificationsOf($this->minh));
        $this->assertCount(1, $this->notificationsOf($this->linh));
        $this->assertCount(0, $this->notificationsOf($this->me));

        $data = $this->notificationsOf($this->minh)->sole()->data;
        $this->assertSame(MentionedInComment::class, $this->notificationsOf($this->minh)->sole()->type);
        $this->assertSame(Comment::query()->sole()->id, $data['comment']['id']);
        $this->assertSame('@Minh An @Thuy Linh @Giang have a look', $data['comment']['excerpt']);
    }

    public function test_editing_a_comment_notifies_only_the_people_it_newly_mentions()
    {
        $this->comment($this->me, '@Minh An @Thuy Linh', [$this->minh, $this->linh]);
        $comment = Comment::query()->sole();

        $this->actingAs($this->me)->patch($this->url('comments.update', ['comment' => $comment->id]), [
            'body' => '@Minh An @Thuy Linh @Dang Khoa',
            'mentions' => [$this->minh->id, $this->linh->id, $this->khoa->id],
        ])->assertSessionHasNoErrors();

        $this->assertCount(1, $this->notificationsOf($this->minh));
        $this->assertCount(1, $this->notificationsOf($this->linh));
        $this->assertCount(1, $this->notificationsOf($this->khoa));

        // Dropping a mention and adding it back does not notify again.
        $this->actingAs($this->me)->patch($this->url('comments.update', ['comment' => $comment->id]), ['body' => 'No one', 'mentions' => []]);
        $this->actingAs($this->me)->patch($this->url('comments.update', ['comment' => $comment->id]), ['body' => '@Minh An', 'mentions' => [$this->minh->id]]);

        $this->assertCount(1, $this->notificationsOf($this->minh));
    }

    public function test_the_excerpt_is_the_first_line_with_text_up_to_120_characters()
    {
        $this->assertSame('First line', MentionedInComment::excerpt("\n  First line  \nSecond"));
        $this->assertSame(123, mb_strlen(MentionedInComment::excerpt(str_repeat('a', 200))));
    }

    public function test_a_notification_keeps_its_copies_after_the_task_is_renamed_or_deleted()
    {
        $this->assign($this->minh, $this->me);
        $this->task->update(['title' => 'Renamed']);
        $this->task->delete();

        $this->actingAs($this->me)->getJson($this->url('notifications.recent'))
            ->assertOk()
            ->assertJsonPath('updates.0.task.title', 'Event log table')
            ->assertJsonPath('updates.0.gone', true);
    }

    public function test_the_panel_holds_the_latest_10_updates_of_the_current_team_newest_first()
    {
        foreach (range(1, 12) as $minute) {
            $this->stored($this->me, at: now()->subMinutes($minute)->toDateTimeString(), overrides: ['data' => [
                'actor' => ['id' => $this->minh->id, 'name' => 'Minh An'],
                'task' => ['id' => $this->task->id, 'title' => "Task {$minute}"],
                'project' => ['id' => $this->project->id, 'name' => 'Daily-Drift v1', 'color' => 'indigo'],
            ]]);
        }
        $other = Team::factory()->create();
        $other->members()->attach($this->me, ['role' => TeamRole::Member->value]);
        $this->stored($this->me, team: $other);
        $this->stored($this->minh);

        $this->actingAs($this->me)->getJson($this->url('notifications.recent'))
            ->assertOk()
            ->assertJsonCount(10, 'updates')
            ->assertJsonPath('updates.0.task.title', 'Task 1')
            ->assertJsonPath('updates.9.task.title', 'Task 10')
            ->assertJsonPath('updates.0.kind', 'assigned')
            ->assertJsonPath('updates.0.read', false)
            ->assertJsonPath('unread', 12);
    }

    public function test_the_unread_count_is_shared_for_the_current_team_only()
    {
        $this->stored($this->me);
        $this->stored($this->me, overrides: ['read_at' => now()]);
        $other = Team::factory()->create();
        $other->members()->attach($this->me, ['role' => TeamRole::Member->value]);
        $this->stored($this->me, team: $other);

        $this->actingAs($this->me)->get($this->url('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('unreadNotifications', 1));

        $this->actingAs($this->me)->get($this->url('dashboard', team: $other))
            ->assertInertia(fn (Assert $page) => $page->where('unreadNotifications', 1));
    }

    public function test_due_soon_lists_my_open_tasks_due_today_or_tomorrow_in_my_day()
    {
        $task = fn (array $attributes, ?TaskList $list = null) => Task::factory()->for($list ?? $this->list, 'list')->create([
            'assignee_id' => $this->me->id, 'priority' => Priority::None, ...$attributes,
        ]);
        $task(['title' => 'Today low', 'due_on' => '2026-11-12', 'priority' => Priority::Low]);
        $task(['title' => 'Today urgent', 'due_on' => '2026-11-12', 'priority' => Priority::Urgent]);
        $task(['title' => 'Tomorrow', 'due_on' => '2026-11-13']);
        $task(['title' => 'Later', 'due_on' => '2026-11-14']);
        $task(['title' => 'Late', 'due_on' => '2026-11-11']);
        $task(['title' => 'Done', 'due_on' => '2026-11-12', 'completed_at' => now()]);
        $task(['title' => 'Theirs', 'due_on' => '2026-11-12', 'assignee_id' => $this->minh->id]);
        $archived = Project::factory()->for($this->team)->create(['archived_at' => now()]);
        $task(['title' => 'Archived', 'due_on' => '2026-11-12'], TaskList::factory()->for($archived)->create());

        $this->actingAs($this->me)->getJson($this->url('notifications.recent'))
            ->assertJsonPath('dueSoon', fn (array $rows) => array_column($rows, 'title') === ['Today urgent', 'Today low', 'Tomorrow'])
            ->assertJsonPath('dueSoon.0.when', 'today')
            ->assertJsonPath('dueSoon.2.when', 'tomorrow');

        // 20:00 UTC on the 12th is already the 13th in Ho Chi Minh City (UTC+7).
        $this->travelTo('2026-11-12 20:00:00');
        $this->me->update(['timezone' => 'Asia/Ho_Chi_Minh']);

        $this->actingAs($this->me)->getJson($this->url('notifications.recent'))
            ->assertJsonPath('dueSoon', fn (array $rows) => array_column($rows, 'title') === ['Tomorrow', 'Later'])
            ->assertJsonPath('dueSoon.0.when', 'today');
    }

    public function test_marking_one_as_read_works_only_for_your_own_in_this_team()
    {
        $mine = $this->stored($this->me);
        $theirs = $this->stored($this->minh);

        $this->actingAs($this->me)->patchJson($this->url('notifications.read', ['notification' => $mine->id]))
            ->assertOk()
            ->assertJsonPath('unread', 0);
        $this->assertNotNull($mine->refresh()->read_at);

        $this->actingAs($this->me)->patchJson($this->url('notifications.read', ['notification' => $theirs->id]))->assertNotFound();
        $this->assertNull($theirs->refresh()->read_at);

        $other = Team::factory()->create();
        $other->members()->attach($this->me, ['role' => TeamRole::Member->value]);
        $elsewhere = $this->stored($this->me, team: $other);
        $this->actingAs($this->me)->patchJson($this->url('notifications.read', ['notification' => $elsewhere->id]))->assertNotFound();
    }

    public function test_mark_all_as_read_clears_only_the_current_teams()
    {
        $this->stored($this->me);
        $this->stored($this->me);
        $other = Team::factory()->create();
        $other->members()->attach($this->me, ['role' => TeamRole::Member->value]);
        $elsewhere = $this->stored($this->me, team: $other);
        $theirs = $this->stored($this->minh);

        $this->actingAs($this->me)->postJson($this->url('notifications.read-all'))->assertOk();

        $this->assertSame(0, DatabaseNotification::query()->where('team_id', $this->team->id)->where('notifiable_id', $this->me->id)->whereNull('read_at')->count());
        $this->assertNull($elsewhere->refresh()->read_at);
        $this->assertNull($theirs->refresh()->read_at);
    }

    public function test_the_page_lists_the_current_teams_notifications_30_at_a_time()
    {
        foreach (range(1, 32) as $minute) {
            $this->stored($this->me, at: now()->subMinutes($minute)->toDateTimeString());
        }
        $this->stored($this->minh);

        $this->actingAs($this->me)->get($this->url('notifications.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('notifications')
                ->where('filter', 'all')
                ->has('notifications.data', 30)
                ->where('counts.all', 32)
                ->where('counts.unread', 32)
                ->where('selected', null)
            );
    }

    public function test_the_next_30_come_from_the_cursor()
    {
        foreach (range(1, 32) as $minute) {
            $this->stored($this->me, at: now()->subMinutes($minute)->toDateTimeString());
        }

        $next = $this->actingAs($this->me)->get($this->url('notifications.index'))->viewData('page')['props']['notifications']['next_cursor'];

        $this->actingAs($this->me)->get($this->url('notifications.index', ['cursor' => $next]))
            ->assertInertia(fn (Assert $page) => $page->has('notifications.data', 2)->where('notifications.next_cursor', null));
    }

    public function test_the_page_filters_unread_mentions_and_assigned()
    {
        $this->stored($this->me, TaskAssigned::class);
        $this->stored($this->me, TaskAssigned::class, overrides: ['read_at' => now()]);
        $this->stored($this->me, MentionedInComment::class);

        $kinds = fn (string $filter) => $this->actingAs($this->me)->get($this->url('notifications.index', ['filter' => $filter]))
            ->assertInertia(fn (Assert $page) => $page->where('filter', $filter));

        $kinds('unread')->assertInertia(fn (Assert $page) => $page->has('notifications.data', 2));
        $kinds('mentions')->assertInertia(fn (Assert $page) => $page->has('notifications.data', 1)->where('notifications.data.0.kind', 'mentioned'));
        $kinds('assigned')->assertInertia(fn (Assert $page) => $page->has('notifications.data', 2)->where('counts.mentions', 1));
    }

    public function test_selecting_one_on_the_page_marks_it_as_read_and_shows_the_task_as_it_is_now()
    {
        $this->assign($this->minh, $this->me);
        $this->task->update(['title' => 'Event log, renamed']);
        $notification = $this->notificationsOf($this->me)->sole();

        $this->actingAs($this->me)->get($this->url('notifications.index', ['n' => $notification->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('selected.id', $notification->id)
                ->where('selected.read', true)
                ->where('selected.task.title', 'Event log, renamed')
                ->where('selected.task.assignee.id', $this->me->id)
                ->where('selected.task.list', 'To do')
                ->where('selected.snapshot.title', 'Event log table')
                ->where('selected.recent', fn ($events) => collect($events)->where('isThis', true)->pluck('type')->all() === ['task.assigned'])
                ->where('counts.unread', 0)
            );

        $this->assertNotNull($notification->refresh()->read_at);
    }

    public function test_a_selected_mention_carries_the_whole_comment()
    {
        $this->comment($this->minh, "@Giang can you check?\nSecond line.", [$this->me]);
        $notification = $this->notificationsOf($this->me)->sole();

        $this->actingAs($this->me)->get($this->url('notifications.index', ['n' => $notification->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('selected.kind', 'mentioned')
                ->where('selected.excerpt', '@Giang can you check?')
                ->where('selected.comment.body', "@Giang can you check?\nSecond line.")
                ->where('selected.comment.mentionNames', ['Giang'])
                ->where('selected.canReply', true)
            );
    }

    public function test_someone_elses_notification_on_the_page_is_a_404()
    {
        $theirs = $this->stored($this->minh);

        $this->actingAs($this->me)->get($this->url('notifications.index', ['n' => $theirs->id]))->assertNotFound();
        $this->assertNull($theirs->refresh()->read_at);
    }

    public function test_a_selected_notification_about_a_deleted_task_has_no_task()
    {
        $this->assign($this->minh, $this->me);
        $this->task->delete();
        $notification = $this->notificationsOf($this->me)->sole();

        $this->actingAs($this->me)->get($this->url('notifications.index', ['n' => $notification->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('selected.gone', true)
                ->where('selected.task', null)
                ->where('selected.snapshot.title', 'Event log table')
                ->where('selected.recent', [])
            );
    }

    public function test_after_leaving_a_team_its_notifications_no_longer_show()
    {
        $this->stored($this->me);
        $this->team->members()->detach($this->me);

        $this->actingAs($this->me)->get($this->url('notifications.index'))->assertNotFound();
        $this->assertSame(1, DatabaseNotification::query()->where('notifiable_id', $this->me->id)->count());
    }
}
