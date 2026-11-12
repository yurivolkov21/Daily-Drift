<?php

namespace Tests\Feature;

use App\Enums\TeamRole;
use App\Models\Label;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Spec 0007: the Ctrl K box searches one team's tasks and projects.
 */
class SearchTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $me;

    private TaskList $list;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create();
        $this->me = User::factory()->create();
        $this->team->members()->attach($this->me, ['role' => TeamRole::Member->value]);
        $project = Project::factory()->for($this->team)->create(['name' => 'Daily-Drift v1', 'description' => null]);
        $this->list = TaskList::factory()->for($project)->create(['name' => 'To do']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function task(string $title, array $attributes = [], ?TaskList $list = null): Task
    {
        return Task::factory()->for($list ?? $this->list, 'list')->create(['title' => $title, 'description' => null, 'completed_at' => null, ...$attributes]);
    }

    private function search(string $query): TestResponse
    {
        return $this->actingAs($this->me)->getJson(route('search', ['current_team' => $this->team->slug, 'q' => $query]))->assertOk();
    }

    /**
     * @return array<int, string>
     */
    private function titles(TestResponse $response): array
    {
        return array_column($response->json('tasks'), 'title');
    }

    public function test_one_character_returns_nothing()
    {
        $this->task('Search endpoint');

        $this->search('s')->assertExactJson(['query' => 's', 'tasks' => [], 'projects' => []]);
    }

    public function test_tasks_are_found_by_title_description_and_label_in_that_order()
    {
        $bySpec = $this->task('Report bug in exports', ['updated_at' => now()->subDays(3)]);
        $this->task('Bugfix release', ['updated_at' => now()->subDays(2)]);
        $byDescription = $this->task('Polish the login', ['description' => 'A bug with the remember me box.', 'updated_at' => now()]);
        $byLabel = $this->task('Drag slot flicker', ['updated_at' => now()->subDay()]);
        $label = Label::factory()->for($this->team)->create(['name' => 'Bug', 'icon' => 'bug']);
        $byLabel->labels()->attach($label);
        $this->task('Unrelated');

        $response = $this->search('BUG');

        $this->assertSame(['Bugfix release', 'Report bug in exports', 'Drag slot flicker', 'Polish the login'], $this->titles($response));
        $response->assertJsonPath('tasks.2.labels.0', ['id' => $label->id, 'name' => 'Bug', 'icon' => 'bug'])
            ->assertJsonPath('tasks.0.project.name', 'Daily-Drift v1')
            ->assertJsonPath('tasks.0.list', 'To do');
        unset($bySpec, $byDescription);
    }

    public function test_open_tasks_come_before_completed_ones_and_active_projects_before_archived()
    {
        $this->task('Spec 0007 draft', ['completed_at' => now(), 'updated_at' => now()]);
        $this->task('Spec 0007 review', ['updated_at' => now()->subDay()]);
        $archived = Project::factory()->for($this->team)->create(['name' => 'Spec archive', 'archived_at' => now()]);
        $this->task('Spec 0007 old', ['updated_at' => now()->addMinute()], TaskList::factory()->for($archived)->create());

        $response = $this->search('spec');

        $this->assertSame(['Spec 0007 review', 'Spec 0007 draft', 'Spec 0007 old'], $this->titles($response));
        $response->assertJsonPath('tasks.1.completed', true)->assertJsonPath('tasks.2.archived', true)
            ->assertJsonPath('projects.0', ['id' => $archived->id, 'name' => 'Spec archive', 'color' => $archived->color->value, 'archived' => true]);
    }

    public function test_projects_are_found_by_name_and_description()
    {
        $thesis = Project::factory()->for($this->team)->create(['name' => 'Graduation thesis', 'description' => null]);
        $byDescription = Project::factory()->for($this->team)->create(['name' => 'Reading list', 'description' => 'Sources for the thesis.']);

        $this->assertSame([$thesis->id, $byDescription->id], array_column($this->search('thesis')->json('projects'), 'id'));
    }

    public function test_only_the_current_team_is_searched_and_at_most_8_tasks()
    {
        foreach (range(1, 10) as $n) {
            $this->task("Label menu {$n}");
        }
        $other = Team::factory()->create();
        $other->members()->attach($this->me, ['role' => TeamRole::Member->value]);
        $this->task('Label menu elsewhere', [], TaskList::factory()->for(Project::factory()->for($other))->create());

        $titles = $this->titles($this->search('label menu'));

        $this->assertCount(8, $titles);
        $this->assertNotContains('Label menu elsewhere', $titles);
    }
}
