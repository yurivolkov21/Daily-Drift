<?php

namespace Tests\Feature\Projects;

use App\Enums\Hue;
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

class ProjectListTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create();
        $this->user = User::factory()->create();
        $this->team->members()->attach($this->user, ['role' => TeamRole::Member->value]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function project(string $name, array $attributes = []): Project
    {
        return Project::factory()->for($this->team)->create(['name' => $name, ...$attributes]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function task(Project $project, array $attributes = []): Task
    {
        $list = $project->lists()->first() ?? TaskList::factory()->for($project)->create();

        return Task::factory()->for($list, 'list')->create(['due_on' => null, ...$attributes]);
    }

    /**
     * @param  array<string, string>  $query
     */
    private function visit(array $query = []): TestResponse
    {
        return $this->actingAs($this->user)
            ->get(route('projects.index', ['current_team' => $this->team->slug, ...$query]));
    }

    public function test_the_page_lists_active_projects_with_their_counts_and_default_filters()
    {
        $this->project('Active one');
        $this->project('Archived one', ['archived_at' => now()]);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->component('projects/index')
            ->has('projects', 1)
            ->where('projects.0.name', 'Active one')
            ->where('counts.active', 1)
            ->where('counts.archived', 1)
            ->where('filters', [
                'status' => 'active',
                'view' => 'grid',
                'sort' => 'updated',
                'health' => null,
                'colors' => [],
            ])
        );
    }

    public function test_the_archived_tab_lists_archived_projects_only()
    {
        $this->project('Active one');
        $this->project('Archived one', ['archived_at' => now()]);

        $this->visit(['status' => 'archived'])->assertInertia(fn (Assert $page) => $page
            ->has('projects', 1)
            ->where('projects.0.name', 'Archived one')
            ->where('filters.status', 'archived')
        );
    }

    public function test_a_project_with_an_overdue_task_needs_attention()
    {
        $project = $this->project('Late');
        $this->task($project, ['due_on' => now()->subDays(3)->toDateString()]);
        $this->task($project, ['due_on' => now()->subDay()->toDateString()]);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->where('projects.0.stats.health', 'attention')
            ->where('projects.0.stats.overdue', 2)
            ->where('projects.0.stats.oldestOverdueOn', now()->subDays(3)->toDateString())
            ->where('counts.attention', 1)
        );
    }

    public function test_a_project_whose_open_tasks_waited_a_week_without_progress_needs_attention()
    {
        $project = $this->project('Stalled');
        $this->task($project, ['created_at' => now()->subDays(10)]);

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->where('projects.0.stats.health', 'attention')
        );
    }

    public function test_recent_progress_new_tasks_and_empty_projects_are_on_track()
    {
        $moving = $this->project('Moving', ['updated_at' => now()->subMinutes(3)]);
        $this->task($moving, ['created_at' => now()->subDays(10)]);
        $this->task($moving, ['completed_at' => now()->subDays(2)]);

        $fresh = $this->project('Fresh', ['updated_at' => now()->subMinutes(2)]);
        $this->task($fresh);

        $this->project('Empty', ['updated_at' => now()->subMinute()]);

        $this->visit(['sort' => 'name'])->assertInertia(fn (Assert $page) => $page
            ->where('projects.0.name', 'Empty')
            ->where('projects.0.stats.health', 'track')
            ->where('projects.1.name', 'Fresh')
            ->where('projects.1.stats.health', 'track')
            ->where('projects.2.name', 'Moving')
            ->where('projects.2.stats.health', 'track')
            ->where('projects.2.stats.completedRecently', 1)
            ->where('counts.attention', 0)
        );
    }

    public function test_projects_can_be_filtered_by_health_and_color()
    {
        $late = $this->project('Late', ['color' => Hue::Red]);
        $this->task($late, ['due_on' => now()->subDay()->toDateString()]);
        $this->project('Calm red', ['color' => Hue::Red]);
        $this->project('Calm teal', ['color' => Hue::Teal]);

        $this->visit(['health' => 'attention'])->assertInertia(fn (Assert $page) => $page
            ->has('projects', 1)
            ->where('projects.0.name', 'Late')
            ->where('filters.health', 'attention')
        );

        $this->visit(['health' => 'track', 'color' => 'red'])->assertInertia(fn (Assert $page) => $page
            ->has('projects', 1)
            ->where('projects.0.name', 'Calm red')
        );

        $this->visit(['color' => 'teal,red', 'sort' => 'name'])->assertInertia(fn (Assert $page) => $page
            ->has('projects', 3)
            ->where('filters.colors', ['teal', 'red'])
        );
    }

    public function test_projects_can_be_sorted_by_name_progress_and_overdue_tasks()
    {
        $half = $this->project('Bravo', ['updated_at' => now()->subDays(2)]);
        $this->task($half, ['completed_at' => now()]);
        $this->task($half, ['due_on' => now()->subDay()->toDateString()]);

        $done = $this->project('alpha', ['updated_at' => now()->subDays(3)]);
        $this->task($done, ['completed_at' => now()]);

        $late = $this->project('Charlie', ['updated_at' => now()->subDay()]);
        $this->task($late, ['due_on' => now()->subDays(2)->toDateString()]);
        $this->task($late, ['due_on' => now()->subDay()->toDateString()]);

        Project::query()->whereKey($half->id)->update(['updated_at' => now()->subDays(2)]);
        Project::query()->whereKey($done->id)->update(['updated_at' => now()->subDays(3)]);
        Project::query()->whereKey($late->id)->update(['updated_at' => now()->subDay()]);

        $this->assertOrder([], ['Charlie', 'Bravo', 'alpha']);
        $this->assertOrder(['sort' => 'name'], ['alpha', 'Bravo', 'Charlie']);
        $this->assertOrder(['sort' => 'progress'], ['Charlie', 'Bravo', 'alpha']);
        $this->assertOrder(['sort' => 'overdue'], ['Charlie', 'Bravo', 'alpha']);
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<int, string>  $names
     */
    private function assertOrder(array $query, array $names): void
    {
        $this->visit($query)->assertInertia(function (Assert $page) use ($names) {
            $page->has('projects', count($names));

            foreach ($names as $index => $name) {
                $page->where("projects.{$index}.name", $name);
            }
        });
    }

    public function test_unknown_query_values_fall_back_to_the_defaults()
    {
        $this->project('One');

        $this->visit(['status' => 'deleted', 'view' => 'table', 'sort' => 'random', 'health' => 'bad', 'color' => 'plaid'])
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('projects', 1)
                ->where('filters', [
                    'status' => 'active',
                    'view' => 'grid',
                    'sort' => 'updated',
                    'health' => null,
                    'colors' => [],
                ])
            );
    }

    public function test_the_last_view_is_remembered_for_links_without_one()
    {
        $this->project('One');

        $this->withUnencryptedCookie('projects_view', 'list')
            ->visit()
            ->assertInertia(fn (Assert $page) => $page->where('filters.view', 'list'));

        $this->withUnencryptedCookie('projects_view', 'list')
            ->visit(['view' => 'grid'])
            ->assertInertia(fn (Assert $page) => $page->where('filters.view', 'grid'));
    }

    public function test_lists_report_how_many_tasks_they_hold()
    {
        $project = $this->project('Counted');
        $list = TaskList::factory()->for($project)->create(['position' => 0]);
        Task::factory()->count(3)->for($list, 'list')->create();

        $this->visit()->assertInertia(fn (Assert $page) => $page
            ->where('projects.0.lists.0.taskCount', 3)
        );
    }
}
