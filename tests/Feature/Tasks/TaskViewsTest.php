<?php

namespace Tests\Feature\Tasks;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Enums\Hue;
use App\Enums\Priority;
use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Spec 0008: the list and calendar views read the board's tasks and save
 * through the task routes; the calendar reschedules with a due date only and
 * adds tasks on a day.
 */
class TaskViewsTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $member;

    private Project $project;

    private TaskList $todo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create();
        $this->member = User::factory()->create();
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, [
            'name' => 'Views',
            'color' => Hue::Teal,
        ]);
        $this->todo = $this->project->lists()->where('name', 'To do')->sole();
    }

    private function task(string $title = 'Calendar grid', ?string $dueOn = '2026-11-16'): Task
    {
        $task = app(CreateTask::class)->handle($this->todo, $this->member, $title, $dueOn);
        $task->update(['priority' => Priority::High]);
        Activity::query()->delete();

        return $task;
    }

    private function reschedule(Task $task, ?string $dueOn): TestResponse
    {
        return $this->actingAs($this->member)->patch(
            route('tasks.update', ['current_team' => $this->team->slug, 'task' => $task->id]),
            ['due_on' => $dueOn],
        );
    }

    private function add(string $title, ?string $dueOn): TestResponse
    {
        return $this->actingAs($this->member)->post(
            route('tasks.store', ['current_team' => $this->team->slug, 'list' => $this->todo->id]),
            ['title' => $title, 'due_on' => $dueOn],
        );
    }

    public function test_dragging_a_task_to_another_day_saves_the_date_and_records_one_event()
    {
        $task = $this->task();

        $this->reschedule($task, '2026-11-18')->assertSessionHasNoErrors()->assertRedirect();

        $task->refresh();
        $this->assertSame('2026-11-18', $task->due_on?->toDateString());
        $this->assertSame(['Calendar grid', Priority::High], [$task->title, $task->priority]);
        $events = Activity::query()->get(['type', 'properties']);
        $this->assertSame([Activity::TASK_DUE_CHANGED], $events->pluck('type')->all());
        $this->assertSame(['from' => '2026-11-16', 'to' => '2026-11-18'], $events->first()->properties);
    }

    public function test_dropping_an_undated_task_on_a_day_gives_it_a_date()
    {
        $task = $this->task('Remember the view', null);

        $this->reschedule($task, '2026-11-20')->assertSessionHasNoErrors();

        $this->assertSame('2026-11-20', $task->refresh()->due_on?->toDateString());
        $this->assertSame(['from' => null, 'to' => '2026-11-20'], Activity::query()->sole()->properties);
    }

    public function test_dropping_a_task_on_its_own_day_records_nothing()
    {
        $task = $this->task();

        $this->reschedule($task, '2026-11-16')->assertSessionHasNoErrors();

        $this->assertSame(0, Activity::query()->count());
    }

    public function test_a_bad_date_is_refused()
    {
        $task = $this->task();

        $this->reschedule($task, '18/11/2026')->assertSessionHasErrors('due_on');
        $this->add('Agenda', 'tomorrow')->assertSessionHasErrors('due_on');

        $this->assertSame('2026-11-16', $task->refresh()->due_on?->toDateString());
        $this->assertSame(1, $this->todo->tasks()->count());
    }

    public function test_a_task_added_on_a_day_of_the_calendar_starts_with_that_date()
    {
        $this->add('Plan the sprint', '2026-11-26')->assertSessionHasNoErrors()->assertRedirect();
        $this->add('No date yet', null)->assertSessionHasNoErrors();

        $tasks = $this->todo->tasks()->get();
        $this->assertSame(['Plan the sprint', 'No date yet'], $tasks->pluck('title')->all());
        $this->assertSame(['2026-11-26', null], $tasks->map(fn (Task $task) => $task->due_on?->toDateString())->all());
        // Adding records that the task was created, not a due date change.
        $this->assertSame([Activity::TASK_CREATED, Activity::TASK_CREATED], Activity::query()->orderBy('id')->pluck('type')->all());
    }

    public function test_archived_projects_cannot_be_rescheduled_or_added_to_from_the_views()
    {
        $task = $this->task();
        $this->project->update(['archived_at' => now()]);

        $this->reschedule($task, '2026-11-18')->assertForbidden();
        $this->add('Too late', '2026-11-20')->assertForbidden();

        $this->assertSame('2026-11-16', $task->refresh()->due_on?->toDateString());
        $this->assertSame(1, $this->todo->tasks()->count());
    }
}
