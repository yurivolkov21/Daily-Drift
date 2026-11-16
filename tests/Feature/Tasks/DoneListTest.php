<?php

namespace Tests\Feature\Tasks;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Enums\Hue;
use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

/**
 * Spec 0010: completing moves a task to its project's Done list.
 */
class DoneListTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $member;

    private Project $project;

    private TaskList $todo;

    private TaskList $doing;

    private TaskList $done;

    protected function setUp(): void
    {
        parent::setUp();

        Date::setTestNow('2026-11-16 09:00:00');

        $this->team = Team::factory()->create();
        $this->member = User::factory()->create();
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, ['name' => 'Board', 'color' => Hue::Indigo]);
        $this->todo = $this->project->lists()->where('name', 'To do')->sole();
        $this->doing = $this->project->lists()->where('name', 'In progress')->sole();
        $this->done = $this->project->lists()->where('name', 'Done')->sole();
    }

    private function add(TaskList $list, string $title): Task
    {
        return app(CreateTask::class)->handle($list, $this->member, $title);
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    private function url(string $name, array $parameters): string
    {
        return route($name, ['current_team' => $this->team->slug, ...$parameters]);
    }

    private function complete(Task $task, bool $completed = true): void
    {
        $this->actingAs($this->member)
            ->patch($this->url('tasks.complete', ['task' => $task->id]), ['completed' => $completed])
            ->assertSessionHasNoErrors();
    }

    private function move(Task $task, TaskList $list, int $index): void
    {
        $this->actingAs($this->member)
            ->patch($this->url('tasks.move', ['task' => $task->id]), ['list_id' => $list->id, 'index' => $index])
            ->assertSessionHasNoErrors();
    }

    /**
     * @return list<string>
     */
    private function titles(TaskList $list): array
    {
        return $list->tasks()->pluck('title')->all();
    }

    /**
     * @return list<array{0: string, 1: array<string, mixed>}>
     */
    private function events(Task $task): array
    {
        return $task->activities()
            ->where('type', '!=', Activity::TASK_CREATED)
            ->get()
            ->map(fn (Activity $event) => [$event->type, $event->properties])
            ->all();
    }

    public function test_a_new_projects_done_list_is_marked_and_it_is_the_only_one()
    {
        $this->assertTrue($this->done->is_done);
        $this->assertSame(1, $this->project->lists()->where('is_done', true)->count());
        $this->assertTrue($this->project->doneList()->is($this->done));
    }

    public function test_completing_moves_the_task_to_the_top_of_done_with_one_event()
    {
        $this->add($this->done, 'Shipped earlier');
        $task = $this->add($this->doing, 'Review');
        $this->add($this->doing, 'Stays');

        $this->complete($task);

        $task->refresh();
        $this->assertNotNull($task->completed_at);
        $this->assertSame(['Review', 'Shipped earlier'], $this->titles($this->done));
        $this->assertSame(['Stays'], $this->titles($this->doing));
        $this->assertSame($this->doing->id, $task->completed_from_list_id);
        $this->assertSame([[Activity::TASK_COMPLETED, ['from' => 'In progress']]], $this->events($task));
    }

    public function test_reopening_moves_the_task_to_the_bottom_of_the_list_it_came_from()
    {
        $task = $this->add($this->doing, 'Review');
        $this->complete($task);
        $this->add($this->doing, 'Started meanwhile');

        $this->complete($task, false);

        $task->refresh();
        $this->assertNull($task->completed_at);
        $this->assertNull($task->completed_from_list_id);
        $this->assertSame(['Started meanwhile', 'Review'], $this->titles($this->doing));
        $this->assertSame([], $this->titles($this->done));
        $this->assertSame([Activity::TASK_REOPENED, ['to' => 'In progress']], $this->events($task)[1]);
        $this->assertCount(2, $this->events($task));
    }

    public function test_reopening_goes_to_the_first_list_when_the_old_one_is_gone()
    {
        $task = $this->add($this->doing, 'Review');
        $this->add($this->todo, 'Next up');
        $this->complete($task);

        $this->actingAs($this->member)->delete($this->url('lists.destroy', ['list' => $this->doing->id]));
        $this->complete($task, false);

        $this->assertSame(['Next up', 'Review'], $this->titles($this->todo));
    }

    public function test_moving_a_task_into_done_completes_it_and_moving_it_out_reopens_it()
    {
        $this->add($this->done, 'First done');
        $this->add($this->done, 'Second done');
        $task = $this->add($this->todo, 'Dragged');

        $this->move($task, $this->done, 1);

        $task->refresh();
        $this->assertNotNull($task->completed_at);
        $this->assertSame(['First done', 'Dragged', 'Second done'], $this->titles($this->done));
        $this->assertSame($this->todo->id, $task->completed_from_list_id);

        $this->move($task, $this->doing, 0);

        $task->refresh();
        $this->assertNull($task->completed_at);
        $this->assertSame(['Dragged'], $this->titles($this->doing));
        $this->assertSame([
            [Activity::TASK_COMPLETED, ['from' => 'To do']],
            [Activity::TASK_REOPENED, ['to' => 'In progress']],
        ], $this->events($task));
    }

    public function test_moving_within_done_or_between_other_lists_does_not_change_completion()
    {
        $task = $this->add($this->todo, 'Plain move');

        $this->move($task, $this->doing, 0);
        $this->assertNull($task->fresh()->completed_at);
        $this->assertSame([[Activity::TASK_MOVED, ['from' => 'To do', 'to' => 'In progress']]], $this->events($task));

        $this->complete($task);
        $this->add($this->done, 'Below');
        $this->move($task->fresh(), $this->done, 1);

        $this->assertNotNull($task->fresh()->completed_at);
        $this->assertSame(['Below', 'Plain move'], $this->titles($this->done));
    }

    public function test_without_a_done_list_completing_leaves_the_task_in_place()
    {
        $this->actingAs($this->member)
            ->patch($this->url('lists.update', ['list' => $this->done->id]), ['is_done' => false])
            ->assertSessionHasNoErrors();
        $task = $this->add($this->doing, 'Stays put');

        $this->complete($task);

        $task->refresh();
        $this->assertNotNull($task->completed_at);
        $this->assertSame($this->doing->id, $task->task_list_id);
        $this->assertSame([[Activity::TASK_COMPLETED, []]], $this->events($task));

        $this->complete($task, false);
        $this->assertSame($this->doing->id, $task->fresh()->task_list_id);
    }

    public function test_marking_another_list_moves_the_mark_and_leaves_tasks_where_they_are()
    {
        $task = $this->add($this->doing, 'Already here');

        $this->actingAs($this->member)
            ->patch($this->url('lists.update', ['list' => $this->doing->id]), ['is_done' => true])
            ->assertSessionHasNoErrors();

        $this->assertTrue($this->doing->fresh()->is_done);
        $this->assertFalse($this->done->fresh()->is_done);
        $this->assertNull($task->fresh()->completed_at);

        $other = $this->add($this->todo, 'Finished');
        $this->complete($other);
        $this->assertSame(['Finished', 'Already here'], $this->titles($this->doing));
    }

    public function test_the_database_refuses_a_second_done_list()
    {
        $this->expectException(QueryException::class);

        $this->todo->forceFill(['is_done' => true])->save();
    }

    public function test_marking_a_done_list_follows_the_list_rules()
    {
        $this->project->update(['archived_at' => now()]);

        $this->actingAs($this->member)
            ->patch($this->url('lists.update', ['list' => $this->doing->id]), ['is_done' => true])
            ->assertForbidden();

        $stranger = User::factory()->create();

        $this->actingAs($stranger)
            ->patch($this->url('lists.update', ['list' => $this->doing->id]), ['is_done' => true])
            ->assertNotFound();

        $this->assertTrue($this->done->fresh()->is_done);
    }

    public function test_moving_a_card_does_not_touch_the_cards_it_pushes_aside()
    {
        $pushed = $this->add($this->todo, 'Pushed');
        $moved = $this->add($this->doing, 'Moved');

        Date::setTestNow('2026-11-16 10:00:00');
        $this->move($moved, $this->todo, 0);

        $this->assertSame('2026-11-16 09:00:00', $pushed->fresh()->updated_at->toDateTimeString());
        $this->assertSame('2026-11-16 10:00:00', $moved->fresh()->updated_at->toDateTimeString());
        $this->assertSame(1, $pushed->fresh()->position);
    }

    public function test_the_board_says_which_list_is_done()
    {
        $this->actingAs($this->member)
            ->get($this->url('projects.show', ['project' => $this->project->id]))
            ->assertInertia(fn ($page) => $page
                ->where('project.lists.0.isDone', false)
                ->where('project.lists.2.isDone', true));
    }
}
