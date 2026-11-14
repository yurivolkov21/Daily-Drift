<?php

namespace Tests\Feature\Seeders;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The demo workspace (`php artisan db:seed`) is built through the app's own
 * actions, so it has a history, notifications and dates around today.
 */
class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    private function me(): User
    {
        return User::query()->where('email', 'test@example.com')->sole();
    }

    private function team(): Team
    {
        return Team::query()->where('name', DemoData::TEAM)->sole();
    }

    public function test_the_demo_owner_signs_in_with_the_documented_password()
    {
        $me = $this->me();

        $this->assertTrue(Hash::check('password', $me->password));
        $this->assertTrue($me->hasVerifiedEmail());
        $this->assertTrue($me->currentTeam?->is($this->team()));
    }

    public function test_the_team_has_its_people_projects_labels_and_an_invitation()
    {
        $team = $this->team();

        $this->assertSame(count(DemoData::PEOPLE), $team->members()->count());
        $this->assertSame(count(DemoData::projects()), $team->projects()->count());
        $this->assertSame(1, $team->projects()->whereNotNull('archived_at')->count());
        $this->assertSame(count(DemoData::LABELS), $team->labels()->count());
        $this->assertTrue(TeamInvitation::query()->where('team_id', $team->id)->where('email', DemoData::INVITATION['email'])->exists());
        $this->assertSame(1, Project::query()->where('team_id', $this->me()->personalTeam()?->id)->count());
    }

    public function test_a_task_is_done_exactly_when_it_sits_in_done()
    {
        $tasks = Task::query()->with('list')->get();

        $this->assertGreaterThan(40, $tasks->count());
        $tasks->each(fn (Task $task) => $this->assertSame(
            $task->list->name === 'Done',
            $task->completed_at !== null,
            "{$task->title} is in {$task->list->name}",
        ));
    }

    public function test_the_history_spreads_over_weeks_and_ends_today()
    {
        $this->assertTrue(Activity::query()->where('created_at', '<', now()->subDays(20))->exists());
        $this->assertTrue(Activity::query()->where('created_at', '>=', now()->startOfDay())->exists());
        $this->assertFalse(Activity::query()->where('created_at', '>', now())->exists());
        $this->assertTrue(Task::query()->whereNotNull('completed_at')->where('completed_at', '>=', now()->subDays(7))->exists());
        $this->assertTrue(Comment::query()->exists());
    }

    public function test_the_owner_has_work_due_and_unread_notifications()
    {
        $me = $this->me();
        $mine = Task::query()->whereBelongsTo($me, 'assignee')->whereNull('completed_at');

        $this->assertTrue((clone $mine)->whereDate('due_on', '<', today())->exists());
        $this->assertTrue((clone $mine)->whereDate('due_on', today())->exists());
        $this->assertGreaterThan(0, $me->unreadNotifications()->count());
        $this->assertGreaterThan($me->unreadNotifications()->count(), $me->notifications()->count());
    }

    public function test_the_main_pages_open_with_the_demo_data()
    {
        $me = $this->me();
        $slug = $this->team()->slug;
        $project = $this->team()->projects()->whereNull('archived_at')->firstOrFail();

        $this->actingAs($me)->get(route('dashboard', ['current_team' => $slug]))->assertOk();
        $this->actingAs($me)->get(route('my-tasks', ['current_team' => $slug]))->assertOk();
        $this->actingAs($me)->get(route('projects.index', ['current_team' => $slug]))->assertOk();
        $this->actingAs($me)->get(route('projects.show', ['current_team' => $slug, 'project' => $project->id]))->assertOk();
        $this->actingAs($me)->get(route('notifications.index', ['current_team' => $slug]))->assertOk();
    }
}
