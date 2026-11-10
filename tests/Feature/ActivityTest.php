<?php

namespace Tests\Feature;

use App\Enums\Priority;
use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Spec 0005: the event log, comments, the task's activity and the team feed.
 */
class ActivityTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $owner;

    private User $member;

    private Project $project;

    private TaskList $todo;

    private TaskList $doing;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create();
        $this->owner = User::factory()->create(['name' => 'Olivia Owner']);
        $this->member = User::factory()->create(['name' => 'Minh An']);
        $this->team->members()->attach($this->owner, ['role' => TeamRole::Owner->value]);
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);
        $this->owner->switchTeam($this->team);

        $this->project = Project::factory()->for($this->team)->create();
        $this->todo = TaskList::factory()->for($this->project)->create(['name' => 'To do', 'position' => 0]);
        $this->doing = TaskList::factory()->for($this->project)->create(['name' => 'In progress', 'position' => 1]);
        $this->task = Task::factory()->for($this->todo, 'list')->create([
            'title' => 'Event log', 'priority' => Priority::None, 'due_on' => null, 'description' => null,
        ]);
        Activity::query()->delete();
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    private function url(string $name, array $parameters = []): string
    {
        return route($name, ['current_team' => $this->team->slug, ...$parameters]);
    }

    /**
     * @return array<int, string>
     */
    private function types(): array
    {
        return Activity::query()->orderBy('id')->pluck('type')->all();
    }

    public function test_creating_a_task_records_who_and_where()
    {
        $this->actingAs($this->member)->post($this->url('tasks.store', ['list' => $this->todo->id]), ['title' => 'New one']);

        $event = Activity::query()->sole();
        $this->assertSame(Activity::TASK_CREATED, $event->type);
        $this->assertSame(['title' => 'New one', 'list' => 'To do'], $event->properties);
        $this->assertSame($this->member->id, $event->user_id);
        $this->assertSame($this->team->id, $event->team_id);
    }

    public function test_one_save_records_one_event_per_changed_field_with_its_values()
    {
        $this->actingAs($this->owner)->patch($this->url('tasks.update', ['task' => $this->task->id]), [
            'title' => 'Event log table',
            'description' => 'One table.',
            'priority' => 'high',
            'due_on' => '2026-11-12',
        ]);

        $events = Activity::query()->orderBy('id')->get()->keyBy('type');
        $this->assertSame([Activity::TASK_RENAMED, Activity::TASK_DESCRIBED, Activity::TASK_PRIORITY_CHANGED, Activity::TASK_DUE_CHANGED], $this->types());
        $this->assertSame(['from' => 'Event log', 'to' => 'Event log table'], $events[Activity::TASK_RENAMED]->properties);
        $this->assertSame([], $events[Activity::TASK_DESCRIBED]->properties);
        $this->assertSame(['from' => 'none', 'to' => 'high'], $events[Activity::TASK_PRIORITY_CHANGED]->properties);
        $this->assertSame(['from' => null, 'to' => '2026-11-12'], $events[Activity::TASK_DUE_CHANGED]->properties);
    }

    public function test_a_save_that_changes_nothing_records_nothing()
    {
        $this->actingAs($this->owner)->patch($this->url('tasks.update', ['task' => $this->task->id]), [
            'title' => 'Event log', 'priority' => 'none', 'due_on' => null,
        ]);

        $this->assertSame([], $this->types());
    }

    public function test_moving_to_another_list_is_recorded_and_reordering_is_not()
    {
        Task::factory()->for($this->todo, 'list')->create();
        Activity::query()->delete();

        $this->actingAs($this->owner)->patch($this->url('tasks.move', ['task' => $this->task->id]), ['list_id' => $this->todo->id, 'index' => 1]);
        $this->assertSame([], $this->types());

        $this->actingAs($this->owner)->patch($this->url('tasks.move', ['task' => $this->task->id]), ['list_id' => $this->doing->id, 'index' => 0]);
        $this->assertSame([Activity::TASK_MOVED], $this->types());
        $this->assertSame(['from' => 'To do', 'to' => 'In progress'], Activity::query()->sole()->properties);
    }

    public function test_assigning_completing_and_reopening_are_recorded()
    {
        $update = $this->url('tasks.update', ['task' => $this->task->id]);
        $complete = $this->url('tasks.complete', ['task' => $this->task->id]);

        $this->actingAs($this->owner)->patch($update, ['assignee_id' => $this->member->id]);
        $this->actingAs($this->owner)->patch($update, ['assignee_id' => null]);
        $this->actingAs($this->owner)->patch($complete, ['completed' => true]);
        $this->actingAs($this->owner)->patch($complete, ['completed' => true]);
        $this->actingAs($this->owner)->patch($complete, ['completed' => false]);

        $this->assertSame([Activity::TASK_ASSIGNED, Activity::TASK_UNASSIGNED, Activity::TASK_COMPLETED, Activity::TASK_REOPENED], $this->types());
        $this->assertSame(['id' => $this->member->id, 'name' => 'Minh An'], Activity::query()->oldest('id')->first()->properties);
    }

    public function test_leaving_a_team_records_an_unassignment_without_an_actor()
    {
        $this->task->update(['assignee_id' => $this->member->id]);
        Activity::query()->delete();

        $this->actingAs($this->member)->delete(route('teams.leave', $this->team));

        $event = Activity::query()->sole();
        $this->assertSame(Activity::TASK_UNASSIGNED, $event->type);
        $this->assertNull($event->user_id);
        $this->assertSame('Minh An', $event->properties['name']);
    }

    public function test_deleting_a_task_removes_its_comments_and_keeps_a_deleted_event_in_the_feed()
    {
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $this->task->id]), ['body' => 'Hello']);
        $this->actingAs($this->owner)->delete($this->url('tasks.destroy', ['task' => $this->task->id]));

        $this->assertSame(0, Comment::query()->count());

        $this->actingAs($this->owner)->get($this->url('dashboard'))->assertInertia(fn (Assert $page) => $page
            ->has('activity.items', 1)
            ->where('activity.items.0.type', Activity::TASK_DELETED)
            ->where('activity.items.0.task', null)
            ->where('activity.items.0.properties.title', 'Event log')
            ->where('activity.items.0.actor.name', 'Olivia Owner')
        );
    }

    public function test_members_comment_and_mention_teammates()
    {
        $this->actingAs($this->member)
            ->post($this->url('comments.store', ['task' => $this->task->id]), ['body' => '  @Olivia Owner look  ', 'mentions' => [$this->owner->id]])
            ->assertSessionHasNoErrors();

        $comment = Comment::query()->sole();
        $this->assertSame('@Olivia Owner look', $comment->body);
        $this->assertSame([$this->owner->id], $comment->mentions);
        $this->assertSame($this->member->id, $comment->user_id);
        $this->assertSame([Activity::COMMENT_ADDED], $this->types());
    }

    public function test_a_comment_needs_text_and_mentions_must_be_team_members()
    {
        $outsider = User::factory()->create();
        $store = $this->url('comments.store', ['task' => $this->task->id]);

        $this->actingAs($this->member)->post($store, ['body' => '   '])->assertSessionHasErrors('body');
        $this->actingAs($this->member)->post($store, ['body' => str_repeat('a', 5001)])->assertSessionHasErrors('body');
        $this->actingAs($this->member)->post($store, ['body' => 'Hi', 'mentions' => [$outsider->id]])->assertSessionHasErrors('mentions.0');
        $this->assertSame(0, Comment::query()->count());
    }

    public function test_outsiders_get_a_404_and_archived_projects_are_read_only()
    {
        $outsider = User::factory()->create();
        $store = $this->url('comments.store', ['task' => $this->task->id]);

        $this->actingAs($outsider)->post($store, ['body' => 'Hi'])->assertNotFound();
        $this->actingAs($outsider)->getJson($this->url('tasks.activity', ['task' => $this->task->id]))->assertNotFound();

        $this->project->update(['archived_at' => now()]);
        $this->actingAs($this->owner)->post($store, ['body' => 'Hi'])->assertForbidden();
    }

    public function test_only_the_author_edits_and_the_author_owners_and_admins_delete()
    {
        $admin = User::factory()->create();
        $other = User::factory()->create();
        $this->team->members()->attach($admin, ['role' => TeamRole::Admin->value]);
        $this->team->members()->attach($other, ['role' => TeamRole::Member->value]);
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $this->task->id]), ['body' => 'First']);
        $comment = Comment::query()->sole();
        $update = $this->url('comments.update', ['comment' => $comment->id]);
        $destroy = $this->url('comments.destroy', ['comment' => $comment->id]);

        $this->actingAs($this->owner)->patch($update, ['body' => 'Hijacked'])->assertForbidden();
        $this->travel(1)->minutes();
        $this->actingAs($this->member)->patch($update, ['body' => 'Second'])->assertSessionHasNoErrors();
        $this->assertSame('Second', $comment->refresh()->body);
        $this->assertTrue($comment->isEdited());

        $this->actingAs($other)->delete($destroy)->assertForbidden();
        $this->actingAs($admin)->delete($destroy)->assertRedirect();
        $this->assertSame(0, Comment::query()->count());
    }

    public function test_a_comment_of_another_team_is_not_found()
    {
        $otherTeam = Team::factory()->create();
        $otherTeam->members()->attach($this->member, ['role' => TeamRole::Member->value]);
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $this->task->id]), ['body' => 'Mine']);
        $comment = Comment::query()->sole();

        $this->actingAs($this->member)
            ->patch(route('comments.update', ['current_team' => $otherTeam->slug, 'comment' => $comment->id]), ['body' => 'Moved'])
            ->assertNotFound();
    }

    public function test_the_tasks_activity_lists_its_comments_and_events_oldest_first()
    {
        $other = Task::factory()->for($this->todo, 'list')->create();
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $other->id]), ['body' => 'Elsewhere']);
        Activity::query()->delete();

        $this->actingAs($this->owner)->patch($this->url('tasks.update', ['task' => $this->task->id]), ['priority' => 'urgent']);
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $this->task->id]), ['body' => 'On it']);
        $this->actingAs($this->owner)->patch($this->url('tasks.complete', ['task' => $this->task->id]), ['completed' => true]);

        $this->actingAs($this->member)->getJson($this->url('tasks.activity', ['task' => $this->task->id]))
            ->assertOk()
            ->assertJsonCount(1, 'comments')
            ->assertJsonPath('comments.0.body', 'On it')
            ->assertJsonPath('comments.0.author.name', 'Minh An')
            ->assertJsonPath('comments.0.canEdit', true)
            ->assertJsonPath('comments.0.edited', false)
            ->assertJsonCount(2, 'events')
            ->assertJsonPath('events.0.type', Activity::TASK_PRIORITY_CHANGED)
            ->assertJsonPath('events.0.actor.name', 'Olivia Owner')
            ->assertJsonPath('events.1.type', Activity::TASK_COMPLETED)
            ->assertJsonPath('canComment', true);
    }

    public function test_the_board_counts_comments_per_task()
    {
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $this->task->id]), ['body' => 'One']);
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $this->task->id]), ['body' => 'Two']);

        $this->actingAs($this->owner)->get($this->url('projects.show', ['project' => $this->project->id]))
            ->assertInertia(fn (Assert $page) => $page->where('project.lists.0.tasks.0.commentCount', 2));
    }

    public function test_the_dashboard_feed_is_the_teams_latest_ten_in_active_projects_and_can_be_filtered()
    {
        $archived = Project::factory()->for($this->team)->create(['archived_at' => now()]);
        Task::factory()->for(TaskList::factory()->for($archived), 'list')->create();
        Task::factory()->for(TaskList::factory()->for(Project::factory()->for(Team::factory())), 'list')->create();
        Activity::query()->delete();

        foreach (range(1, 11) as $minute) {
            $this->travelTo(now()->addMinute());
            $this->actingAs($this->owner)->patch($this->url('tasks.update', ['task' => $this->task->id]), ['title' => "Title {$minute}"]);
        }
        $this->travelTo(now()->addMinute());
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $this->task->id]), ['body' => "A long\ncomment"]);
        $this->travelTo(now()->addMinute());
        $this->actingAs($this->owner)->patch($this->url('tasks.complete', ['task' => $this->task->id]), ['completed' => true]);

        $this->actingAs($this->owner)->get($this->url('dashboard'))->assertInertia(fn (Assert $page) => $page
            ->where('activity.filter', 'all')
            ->has('activity.items', 10)
            ->where('activity.items.0.type', Activity::TASK_COMPLETED)
            ->where('activity.items.1.type', Activity::COMMENT_ADDED)
            ->where('activity.items.1.quote', 'A long comment')
            ->where('activity.items.1.task.title', 'Title 11')
            ->where('activity.items.2.properties.to', 'Title 11')
        );

        $this->actingAs($this->owner)->get($this->url('dashboard', ['activity' => 'comments']))->assertInertia(fn (Assert $page) => $page
            ->where('activity.filter', 'comments')
            ->has('activity.items', 1)
        );
        $this->actingAs($this->owner)->get($this->url('dashboard', ['activity' => 'nonsense']))->assertInertia(fn (Assert $page) => $page
            ->where('activity.filter', 'all')
        );
    }
}
