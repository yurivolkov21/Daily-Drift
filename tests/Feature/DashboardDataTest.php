<?php

namespace Tests\Feature;

use App\Enums\Priority;
use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardDataTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $user;

    private TaskList $list;

    protected function setUp(): void
    {
        parent::setUp();

        // A Wednesday; the week runs from Monday 9 to Sunday 15 November.
        $this->travelTo('2026-11-11 10:00:00');

        $this->team = Team::factory()->create();
        $this->user = User::factory()->create();
        $this->team->members()->attach($this->user, ['role' => TeamRole::Member->value]);
        $this->user->switchTeam($this->team);

        $project = Project::factory()->for($this->team)->create(['name' => 'Board']);
        $this->list = TaskList::factory()->for($project)->create(['name' => 'To do']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function task(array $attributes = []): Task
    {
        return Task::factory()->for($this->list, 'list')->create([
            'due_on' => null,
            'priority' => Priority::None,
            'created_at' => '2026-11-01 09:00:00',
            ...$attributes,
        ]);
    }

    private function visit(): TestResponse
    {
        return $this->actingAs($this->user)->get(route('dashboard', ['current_team' => $this->team->slug]));
    }

    public function test_the_stat_cards_count_open_due_today_overdue_and_done_tasks()
    {
        $this->task(['title' => 'Late', 'due_on' => '2026-11-08']);
        $this->task(['title' => 'Later late', 'due_on' => '2026-11-10']);
        $this->task(['title' => 'Today urgent', 'due_on' => '2026-11-11', 'priority' => Priority::Urgent]);
        $this->task(['title' => 'Today low', 'due_on' => '2026-11-11', 'priority' => Priority::Low]);
        $this->task(['title' => 'New this week', 'created_at' => '2026-11-10 08:00:00']);
        $this->task(['title' => 'Done yesterday', 'completed_at' => '2026-11-10 15:00:00']);
        $this->task(['title' => 'Done last week', 'completed_at' => '2026-11-02 15:00:00']);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('dashboard.today', '2026-11-11')
            ->where('dashboard.activeProjects', 1)
            ->where('dashboard.stats.open.value', 5)
            ->where('dashboard.stats.open.sinceMonday', 0)
            ->where('dashboard.stats.dueToday.value', 2)
            ->where('dashboard.stats.dueToday.byPriority.urgent', 1)
            ->where('dashboard.stats.dueToday.byPriority.low', 1)
            ->where('dashboard.stats.overdue.value', 2)
            ->where('dashboard.stats.overdue.projects', 1)
            ->where('dashboard.stats.overdue.oldestOn', '2026-11-08')
            ->where('dashboard.stats.done.value', 1)
            ->where('dashboard.stats.done.previous', 1)
        );
    }

    public function test_sparklines_hold_one_value_per_day_for_the_last_seven_days()
    {
        $this->task(['completed_at' => '2026-11-05 12:00:00']);
        $this->task(['completed_at' => '2026-11-11 08:00:00']);
        $this->task(['due_on' => '2026-11-09']);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            // 5 to 11 November.
            ->where('dashboard.stats.done.series', [1, 0, 0, 0, 0, 0, 1])
            ->where('dashboard.stats.dueToday.series', [0, 0, 0, 0, 1, 0, 0])
            ->where('dashboard.stats.overdue.series', [0, 0, 0, 0, 0, 1, 1])
            ->where('dashboard.stats.open.series', [2, 2, 2, 2, 2, 2, 1])
        );
    }

    public function test_the_week_ring_counts_the_tasks_due_this_week()
    {
        $this->task(['due_on' => '2026-11-09', 'completed_at' => '2026-11-09 18:00:00']);
        $this->task(['due_on' => '2026-11-12']);
        $this->task(['due_on' => '2026-11-15']);
        $this->task(['due_on' => '2026-11-16']);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.week.due', 3)
            ->where('dashboard.week.completed', 1)
        );
    }

    public function test_throughput_covers_fourteen_days_and_the_periods_before()
    {
        $this->task(['completed_at' => '2026-11-11 09:00:00']);
        $this->task(['completed_at' => '2026-10-29 09:00:00']);
        $this->task(['completed_at' => '2026-10-20 09:00:00']);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->has('dashboard.throughput.days', 14)
            ->where('dashboard.throughput.days.0.date', '2026-10-29')
            ->where('dashboard.throughput.days.0.count', 1)
            ->where('dashboard.throughput.days.13.date', '2026-11-11')
            ->where('dashboard.throughput.days.13.count', 1)
            ->where('dashboard.throughput.previous7', 1)
            ->where('dashboard.throughput.previous14', 1)
        );
    }

    public function test_my_focus_groups_open_tasks_by_due_date()
    {
        $this->task(['title' => 'Late', 'due_on' => '2026-11-03']);
        $this->task(['title' => 'Today', 'due_on' => '2026-11-11']);
        $this->task(['title' => 'Soon', 'due_on' => '2026-11-18']);
        $this->task(['title' => 'Too far', 'due_on' => '2026-11-19']);
        $this->task(['title' => 'Done late', 'due_on' => '2026-11-03', 'completed_at' => now()]);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.focus.overdue.total', 1)
            ->where('dashboard.focus.overdue.items.0.title', 'Late')
            ->where('dashboard.focus.overdue.items.0.project.name', 'Board')
            ->where('dashboard.focus.overdue.items.0.list.name', 'To do')
            ->where('dashboard.focus.today.items.0.title', 'Today')
            ->where('dashboard.focus.week.total', 1)
            ->where('dashboard.focus.week.items.0.title', 'Soon')
        );
    }

    public function test_only_the_current_teams_active_projects_count()
    {
        $this->task(['due_on' => '2026-11-11']);

        $archived = Project::factory()->for($this->team)->archived()->create();
        Task::factory()->for(TaskList::factory()->for($archived), 'list')->create(['due_on' => '2026-11-11', 'completed_at' => null]);

        $other = Project::factory()->create();
        Task::factory()->for(TaskList::factory()->for($other), 'list')->create(['due_on' => '2026-11-11', 'completed_at' => null]);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.stats.dueToday.value', 1)
            ->where('dashboard.activeProjects', 1)
            ->has('dashboard.projects', 1)
            ->where('dashboard.projects.0.name', 'Board')
        );
    }
}
