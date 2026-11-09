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

/**
 * Spec 0004: My tasks, the sidebar count, My focus and the projects page's
 * "Assigned to me" filter.
 */
class MyTasksTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $me;

    private User $teammate;

    private TaskList $list;

    protected function setUp(): void
    {
        parent::setUp();

        // Wednesday 11 November.
        $this->travelTo('2026-11-11 10:00:00');

        $this->team = Team::factory()->create();
        $this->me = User::factory()->create(['timezone' => 'UTC']);
        $this->teammate = User::factory()->create();
        $this->team->members()->attach($this->me, ['role' => TeamRole::Member->value]);
        $this->team->members()->attach($this->teammate, ['role' => TeamRole::Member->value]);
        $this->me->switchTeam($this->team);

        $project = Project::factory()->for($this->team)->create(['name' => 'Board']);
        $this->list = TaskList::factory()->for($project)->create(['name' => 'To do']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function task(array $attributes = [], ?TaskList $list = null): Task
    {
        return Task::factory()->for($list ?? $this->list, 'list')->create([
            'assignee_id' => $this->me->id,
            'due_on' => null,
            'priority' => Priority::None,
            'created_at' => '2026-11-01 09:00:00',
            ...$attributes,
        ]);
    }

    /**
     * @param  array<string, mixed>  $query
     */
    private function visit(array $query = []): TestResponse
    {
        return $this->actingAs($this->me)
            ->get(route('my-tasks', ['current_team' => $this->team->slug, ...$query]));
    }

    public function test_it_lists_only_my_open_tasks_in_the_teams_active_projects()
    {
        $this->task(['title' => 'Mine']);
        $this->task(['title' => 'Someone else', 'assignee_id' => $this->teammate->id]);
        $this->task(['title' => 'Nobody', 'assignee_id' => null]);
        $this->task(['title' => 'Done', 'completed_at' => '2026-11-01 12:00:00']);
        $archived = Project::factory()->for($this->team)->create(['archived_at' => now()]);
        $this->task(['title' => 'Archived'], TaskList::factory()->for($archived)->create());
        $otherTeam = Team::factory()->create();
        $otherTeam->members()->attach($this->me, ['role' => TeamRole::Member->value]);
        $this->task(['title' => 'Other team'], TaskList::factory()->for(Project::factory()->for($otherTeam))->create());

        $this->visit()->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('my-tasks')
            ->where('myTasks.openCount', 1)
            ->has('myTasks.groups.none', 1)
            ->where('myTasks.groups.none.0.title', 'Mine')
            ->where('myOpenTaskCount', 1)
        );
    }

    public function test_tasks_are_grouped_by_my_day_and_ordered_by_due_date_then_priority()
    {
        $this->task(['title' => 'Late', 'due_on' => '2026-11-09']);
        $this->task(['title' => 'Today low', 'due_on' => '2026-11-11', 'priority' => Priority::Low]);
        $this->task(['title' => 'Today urgent', 'due_on' => '2026-11-11', 'priority' => Priority::Urgent]);
        $this->task(['title' => 'Soon', 'due_on' => '2026-11-18']);
        $this->task(['title' => 'Later', 'due_on' => '2026-11-19']);
        $this->task(['title' => 'Whenever']);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->where('myTasks.today', '2026-11-11')
            ->where('myTasks.groups.overdue.0.title', 'Late')
            ->where('myTasks.groups.today.0.title', 'Today urgent')
            ->where('myTasks.groups.today.1.title', 'Today low')
            ->where('myTasks.groups.week.0.title', 'Soon')
            ->where('myTasks.groups.later.0.title', 'Later')
            ->where('myTasks.groups.none.0.title', 'Whenever')
        );
    }

    public function test_the_groups_follow_my_time_zone()
    {
        // 12:00 UTC on the 11th is 01:00 on the 12th in Auckland (UTC+13).
        $this->travelTo('2026-11-11 12:00:00');
        $this->me->update(['timezone' => 'Pacific/Auckland']);
        $this->task(['title' => 'Due the 11th', 'due_on' => '2026-11-11']);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->where('myTasks.today', '2026-11-12')
            ->has('myTasks.groups.overdue', 1)
            ->has('myTasks.groups.today', 0)
        );
    }

    public function test_done_lately_holds_my_tasks_completed_in_the_last_7_days()
    {
        $this->task(['title' => 'Yesterday', 'completed_at' => '2026-11-10 15:00:00']);
        $this->task(['title' => 'Too old', 'completed_at' => '2026-11-03 09:00:00']);
        $this->task(['title' => 'Theirs', 'assignee_id' => $this->teammate->id, 'completed_at' => '2026-11-10 15:00:00']);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->has('myTasks.done', 1)
            ->where('myTasks.done.0.title', 'Yesterday')
        );
    }

    public function test_the_project_filter_comes_from_the_query_string()
    {
        $other = Project::factory()->for($this->team)->create(['name' => 'Another']);
        $this->task(['title' => 'In board']);
        $this->task(['title' => 'In another'], TaskList::factory()->for($other)->create());

        $this->visit(['project' => $other->id])->assertInertia(fn (Assert $page) => $page
            ->where('filters.project', $other->id)
            ->where('myTasks.groups.none.0.title', 'In another')
            ->has('myTasks.groups.none', 1)
            ->has('myTasks.projects', 2)
            ->where('myTasks.openCount', 2)
        );

        $elsewhere = Project::factory()->for(Team::factory())->create();
        $this->visit(['project' => $elsewhere->id])->assertInertia(fn (Assert $page) => $page
            ->where('filters.project', null)
            ->has('myTasks.groups.none', 2)
        );
    }

    public function test_my_focus_shows_my_tasks_and_unassigned_ones_while_due_today_stays_team_wide()
    {
        $this->task(['title' => 'Mine', 'due_on' => '2026-11-11']);
        $this->task(['title' => 'Nobody', 'due_on' => '2026-11-11', 'assignee_id' => null]);
        $this->task(['title' => 'Theirs', 'due_on' => '2026-11-11', 'assignee_id' => $this->teammate->id]);

        $this->actingAs($this->me)
            ->get(route('dashboard', ['current_team' => $this->team->slug]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboard.focus.today.total', 2)
                ->where('dashboard.dueToday.total', 3)
                ->where('dashboard.focus.today.items', fn ($items) => collect($items)->pluck('title')->sort()->values()->all() === ['Mine', 'Nobody'])
            );
    }

    public function test_the_projects_page_can_keep_projects_with_a_task_assigned_to_me()
    {
        $this->task(['title' => 'Mine']);
        $theirs = Project::factory()->for($this->team)->create(['name' => 'Theirs']);
        $this->task(['assignee_id' => $this->teammate->id], TaskList::factory()->for($theirs)->create());

        $this->actingAs($this->me)
            ->get(route('projects.index', ['current_team' => $this->team->slug, 'mine' => '1']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.mine', true)
                ->has('projects', 1)
                ->where('projects.0.name', 'Board')
                ->where('projects.0.stats.assignedToMe', 1)
            );
    }
}
