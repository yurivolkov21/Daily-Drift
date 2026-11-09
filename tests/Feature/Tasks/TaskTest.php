<?php

namespace Tests\Feature\Tasks;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Enums\Hue;
use App\Enums\Priority;
use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $member;

    private Project $project;

    private TaskList $todo;

    private TaskList $doing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create();
        $this->member = User::factory()->create();
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, [
            'name' => 'Board',
            'color' => Hue::Indigo,
        ]);
        $this->todo = $this->project->lists()->where('name', 'To do')->sole();
        $this->doing = $this->project->lists()->where('name', 'In progress')->sole();
    }

    private function add(TaskList $list, string $title): Task
    {
        return app(CreateTask::class)->handle($list, $this->member, $title);
    }

    /**
     * @return array<string, int|string>
     */
    private function taskRoute(Task $task): array
    {
        return ['current_team' => $this->team->slug, 'task' => $task->id];
    }

    /**
     * @return list<array{0: string, 1: int}>
     */
    private function column(TaskList $list): array
    {
        return $list->tasks()->get()->map(fn (Task $task) => [$task->title, $task->position])->all();
    }

    public function test_members_can_add_tasks_at_the_bottom_of_a_list()
    {
        $this->add($this->todo, 'First');

        $this->actingAs($this->member)
            ->post(route('tasks.store', ['current_team' => $this->team->slug, 'list' => $this->todo->id]), ['title' => 'Second'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame([['First', 0], ['Second', 1]], $this->column($this->todo));

        $task = $this->todo->tasks()->where('title', 'Second')->sole();
        $this->assertTrue($task->creator->is($this->member));
        $this->assertSame($this->project->id, $task->project_id);
        $this->assertSame(Priority::None, $task->fresh()->priority);
        $this->assertNull($task->completed_at);
    }

    public function test_task_fields_are_validated()
    {
        $task = $this->add($this->todo, 'Task');

        $this->actingAs($this->member)
            ->post(route('tasks.store', ['current_team' => $this->team->slug, 'list' => $this->todo->id]), ['title' => ''])
            ->assertSessionHasErrors('title');

        $this->actingAs($this->member)
            ->patch(route('tasks.update', $this->taskRoute($task)), [
                'title' => str_repeat('a', 256),
                'priority' => 'critical',
                'due_on' => '05/11/2026',
            ])
            ->assertSessionHasErrors(['title', 'priority', 'due_on']);

        $this->assertSame('Task', $task->fresh()->title);
    }

    public function test_members_can_edit_a_task()
    {
        $task = $this->add($this->todo, 'Draft');

        $this->actingAs($this->member)
            ->patch(route('tasks.update', $this->taskRoute($task)), [
                'title' => 'Final',
                'description' => 'Some detail.',
                'priority' => Priority::High->value,
                'due_on' => '2026-11-20',
            ])
            ->assertSessionHasNoErrors();

        $task->refresh();
        $this->assertSame('Final', $task->title);
        $this->assertSame('Some detail.', $task->description);
        $this->assertSame(Priority::High, $task->priority);
        $this->assertSame('2026-11-20', $task->due_on->toDateString());

        $this->actingAs($this->member)
            ->patch(route('tasks.update', $this->taskRoute($task)), ['due_on' => null, 'description' => null])
            ->assertSessionHasNoErrors();

        $task->refresh();
        $this->assertNull($task->due_on);
        $this->assertNull($task->description);
        $this->assertSame('Final', $task->title);
    }

    public function test_completing_a_task_does_not_move_it()
    {
        $task = $this->add($this->todo, 'Task');

        $this->actingAs($this->member)
            ->patch(route('tasks.complete', $this->taskRoute($task)), ['completed' => true])
            ->assertSessionHasNoErrors();

        $task->refresh();
        $this->assertNotNull($task->completed_at);
        $this->assertSame($this->todo->id, $task->task_list_id);

        $this->actingAs($this->member)
            ->patch(route('tasks.complete', $this->taskRoute($task)), ['completed' => false])
            ->assertSessionHasNoErrors();

        $this->assertNull($task->fresh()->completed_at);
    }

    public function test_moving_a_task_within_its_list_keeps_positions_dense()
    {
        $a = $this->add($this->todo, 'A');
        $this->add($this->todo, 'B');
        $this->add($this->todo, 'C');

        $this->actingAs($this->member)
            ->patch(route('tasks.move', $this->taskRoute($a)), ['list_id' => $this->todo->id, 'index' => 2])
            ->assertSessionHasNoErrors();

        $this->assertSame([['B', 0], ['C', 1], ['A', 2]], $this->column($this->todo));
    }

    public function test_moving_a_task_to_another_list_keeps_both_lists_dense()
    {
        $this->add($this->todo, 'A');
        $b = $this->add($this->todo, 'B');
        $this->add($this->todo, 'C');
        $this->add($this->doing, 'X');
        $this->add($this->doing, 'Y');

        $this->actingAs($this->member)
            ->patch(route('tasks.move', $this->taskRoute($b)), ['list_id' => $this->doing->id, 'index' => 1])
            ->assertSessionHasNoErrors();

        $this->assertSame([['A', 0], ['C', 1]], $this->column($this->todo));
        $this->assertSame([['X', 0], ['B', 1], ['Y', 2]], $this->column($this->doing));
        $this->assertSame($this->doing->id, $b->fresh()->task_list_id);

        // One past the end appends.
        $this->actingAs($this->member)
            ->patch(route('tasks.move', $this->taskRoute($b)), ['list_id' => $this->todo->id, 'index' => 2])
            ->assertSessionHasNoErrors();

        $this->assertSame([['A', 0], ['C', 1], ['B', 2]], $this->column($this->todo));
        $this->assertSame([['X', 0], ['Y', 1]], $this->column($this->doing));
    }

    public function test_tasks_cannot_move_to_another_project_or_past_the_end()
    {
        $task = $this->add($this->todo, 'A');
        $otherProject = app(CreateProject::class)->handle($this->team, $this->member, ['name' => 'Other', 'color' => Hue::Teal]);
        $otherList = $otherProject->lists()->first();

        $this->actingAs($this->member)
            ->patch(route('tasks.move', $this->taskRoute($task)), ['list_id' => $otherList->id, 'index' => 0])
            ->assertSessionHasErrors('list_id');

        $this->actingAs($this->member)
            ->patch(route('tasks.move', $this->taskRoute($task)), ['list_id' => $this->doing->id, 'index' => 1])
            ->assertSessionHasErrors('index');

        $this->actingAs($this->member)
            ->patch(route('tasks.move', $this->taskRoute($task)), ['list_id' => $this->doing->id, 'index' => -1])
            ->assertSessionHasErrors('index');

        $this->assertSame($this->todo->id, $task->fresh()->task_list_id);
    }

    public function test_deleting_a_task_closes_the_gap()
    {
        $this->add($this->todo, 'A');
        $b = $this->add($this->todo, 'B');
        $this->add($this->todo, 'C');

        $this->actingAs($this->member)
            ->delete(route('tasks.destroy', $this->taskRoute($b)))
            ->assertRedirect();

        $this->assertSame([['A', 0], ['C', 1]], $this->column($this->todo));
    }

    public function test_deleting_a_list_deletes_its_tasks()
    {
        $task = $this->add($this->todo, 'A');

        $this->actingAs($this->member)
            ->delete(route('lists.destroy', ['current_team' => $this->team->slug, 'list' => $this->todo->id]));

        $this->assertModelMissing($task);
    }

    public function test_tasks_of_archived_projects_are_read_only()
    {
        $task = $this->add($this->todo, 'A');
        $this->project->update(['archived_at' => now()]);

        $this->actingAs($this->member);

        $this->post(route('tasks.store', ['current_team' => $this->team->slug, 'list' => $this->todo->id]), ['title' => 'B'])->assertForbidden();
        $this->patch(route('tasks.update', $this->taskRoute($task)), ['title' => 'Changed'])->assertForbidden();
        $this->patch(route('tasks.move', $this->taskRoute($task)), ['list_id' => $this->doing->id, 'index' => 0])->assertForbidden();
        $this->patch(route('tasks.complete', $this->taskRoute($task)), ['completed' => true])->assertForbidden();
        $this->delete(route('tasks.destroy', $this->taskRoute($task)))->assertForbidden();

        $task->refresh();
        $this->assertSame('A', $task->title);
        $this->assertSame($this->todo->id, $task->task_list_id);
        $this->assertNull($task->completed_at);
    }

    public function test_people_outside_the_team_and_other_teams_tasks_get_not_found()
    {
        $task = $this->add($this->todo, 'A');
        $outsider = User::factory()->create();

        $this->actingAs($outsider);
        $this->post(route('tasks.store', ['current_team' => $this->team->slug, 'list' => $this->todo->id]), ['title' => 'B'])->assertNotFound();
        $this->patch(route('tasks.update', $this->taskRoute($task)), ['title' => 'Changed'])->assertNotFound();
        $this->patch(route('tasks.move', $this->taskRoute($task)), ['list_id' => $this->doing->id, 'index' => 0])->assertNotFound();
        $this->patch(route('tasks.complete', $this->taskRoute($task)), ['completed' => true])->assertNotFound();
        $this->delete(route('tasks.destroy', $this->taskRoute($task)))->assertNotFound();

        $foreign = Task::factory()->create(['title' => 'Theirs']);
        $parameters = ['current_team' => $this->team->slug, 'task' => $foreign->id];

        $this->actingAs($this->member);
        $this->patch(route('tasks.update', $parameters), ['title' => 'Mine'])->assertNotFound();
        $this->delete(route('tasks.destroy', $parameters))->assertNotFound();
        $this->post(route('tasks.store', ['current_team' => $this->team->slug, 'list' => $foreign->task_list_id]), ['title' => 'Sneaky'])->assertNotFound();

        $this->assertSame('Theirs', $foreign->fresh()->title);
        $this->assertModelExists($task);
    }

    public function test_the_board_and_the_projects_page_show_tasks_and_progress()
    {
        $this->travelTo(now()->setDate(2026, 11, 5)->setTime(12, 0));

        $this->add($this->todo, 'Overdue')->update(['due_on' => '2026-11-03']);
        $this->add($this->todo, 'Due soon')->update(['due_on' => '2026-11-08']);
        $this->add($this->todo, 'Later')->update(['due_on' => '2026-12-01']);
        $this->add($this->doing, 'Done already')->update(['completed_at' => now(), 'due_on' => '2026-11-01']);

        $this->actingAs($this->member)
            ->get(route('projects.show', ['current_team' => $this->team->slug, 'project' => $this->project->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('project.lists.0.tasks.0.title', 'Overdue')
                ->where('project.lists.0.tasks.0.dueOn', '2026-11-03')
                ->has('project.lists.0.tasks', 3)
                ->has('project.lists.1.tasks', 1)
                ->has('project.lists.2.tasks', 0)
                ->where('project.stats', ['tasks' => 4, 'completed' => 1, 'overdue' => 1, 'dueSoon' => 1, 'completedRecently' => 1, 'oldestOverdueOn' => '2026-11-03', 'health' => 'attention', 'assignedToMe' => 0])
            );

        $this->actingAs($this->member)
            ->get(route('projects.index', ['current_team' => $this->team->slug]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('projects.0.stats', ['tasks' => 4, 'completed' => 1, 'overdue' => 1, 'dueSoon' => 1, 'completedRecently' => 1, 'oldestOverdueOn' => '2026-11-03', 'health' => 'attention', 'assignedToMe' => 0])
                ->where('projects.0.lists.0.tasks', null)
            );
    }
}
