<?php

namespace Tests\Feature\Tasks;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Enums\Hue;
use App\Enums\Priority;
use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\Attachment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use App\Notifications\TaskAssigned;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Spec 0010: recurring tasks.
 */
class RecurringTaskTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $member;

    private User $teammate;

    private Project $project;

    private TaskList $todo;

    private TaskList $done;

    protected function setUp(): void
    {
        parent::setUp();

        // Monday 16 November 2026.
        Date::setTestNow('2026-11-16 09:00:00');

        $this->team = Team::factory()->create();
        $this->member = User::factory()->create(['name' => 'Mai']);
        $this->teammate = User::factory()->create(['name' => 'Khoa']);
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);
        $this->team->members()->attach($this->teammate, ['role' => TeamRole::Member->value]);

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, ['name' => 'Board', 'color' => Hue::Indigo]);
        $this->todo = $this->project->lists()->where('name', 'To do')->sole();
        $this->done = $this->project->lists()->where('name', 'Done')->sole();
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    private function url(string $name, array $parameters = []): string
    {
        return route($name, ['current_team' => $this->team->slug, ...$parameters]);
    }

    private function task(string $title = 'Weekly review', ?string $due = '2026-11-16'): Task
    {
        $task = app(CreateTask::class)->handle($this->todo, $this->member, $title, $due);
        Activity::query()->delete();

        return $task;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function update(Task $task, array $data): void
    {
        $this->actingAs($this->member)
            ->patch($this->url('tasks.update', ['task' => $task->id]), $data)
            ->assertSessionHasNoErrors();
    }

    private function repeat(Task $task, string $unit, int $every = 1): Task
    {
        $this->update($task, ['repeat' => ['unit' => $unit, 'every' => $every]]);

        return $task->fresh();
    }

    private function complete(Task $task, bool $completed = true, ?User $as = null): void
    {
        $this->withoutExceptionHandling()
            ->actingAs($as ?? $this->member)
            ->patch($this->url('tasks.complete', ['task' => $task->id]), ['completed' => $completed])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
    }

    private function next(Task $task): ?Task
    {
        return Task::query()->where('repeated_from_id', $task->id)->first();
    }

    public function test_choosing_a_repeat_without_a_due_date_makes_the_task_due_today()
    {
        $task = $this->repeat($this->task(due: null), 'week');

        $this->assertSame('2026-11-16', $task->due_on->toDateString());
        $this->assertSame(['unit' => 'week', 'every' => 1], $task->repeatRule()->toArray());
        $this->assertSame('2026-11-16', $task->repeat_anchor->toDateString());
    }

    public function test_removing_the_due_date_stops_the_repeat_and_each_change_is_recorded()
    {
        $task = $this->repeat($this->task(), 'week', 2);
        $this->update($task, ['repeat' => ['unit' => 'month', 'every' => 1]]);
        $this->update($task, ['due_on' => null]);

        $task->refresh();
        $this->assertNull($task->repeatRule());
        $this->assertNull($task->due_on);

        $events = Activity::query()->orderBy('id')->get()->map(fn (Activity $event) => [$event->type, $event->properties])->all();
        $this->assertSame([
            [Activity::TASK_REPEAT_CHANGED, ['from' => null, 'to' => ['unit' => 'week', 'every' => 2]]],
            [Activity::TASK_REPEAT_CHANGED, ['from' => ['unit' => 'week', 'every' => 2], 'to' => ['unit' => 'month', 'every' => 1]]],
            [Activity::TASK_DUE_CHANGED, ['from' => '2026-11-16', 'to' => null]],
            [Activity::TASK_REPEAT_CHANGED, ['from' => ['unit' => 'month', 'every' => 1], 'to' => null]],
        ], $events);
    }

    public function test_a_weekday_repeats_every_1_and_rules_are_validated()
    {
        $task = $this->repeat($this->task(), 'weekday', 5);
        $this->assertSame(['unit' => 'weekday', 'every' => 1], $task->repeatRule()->toArray());

        $this->actingAs($this->member)
            ->patch($this->url('tasks.update', ['task' => $task->id]), ['repeat' => ['unit' => 'fortnight', 'every' => 31]])
            ->assertSessionHasErrors(['repeat.unit', 'repeat.every']);
    }

    public function test_resending_the_same_due_date_and_rule_keeps_the_anchor()
    {
        $task = $this->repeat($this->task(due: '2027-01-31'), 'month');
        $task->forceFill(['due_on' => '2027-02-28'])->saveQuietly();

        $this->update($task, ['title' => 'Renamed', 'due_on' => '2027-02-28', 'repeat' => ['unit' => 'month', 'every' => 1]]);

        $this->assertSame('2027-01-31', $task->fresh()->repeat_anchor->toDateString());
    }

    public function test_completing_creates_one_next_occurrence_with_the_copied_fields()
    {
        Notification::fake();

        $task = $this->task();
        $label = $this->team->labels()->create(['name' => 'Ops', 'icon' => 'server']);
        $task->labels()->attach($label);
        $task->checklistItems()->create(['body' => 'Check backups', 'position' => 0]);
        $task->checklistItems()->create(['body' => 'Write notes', 'position' => 1]);
        $task->checklistItems()->first()->forceFill(['completed_at' => now()])->save();
        $task->update(['description' => 'Every Monday.', 'priority' => Priority::High, 'assignee_id' => $this->teammate->id]);
        Notification::fake();
        $task = $this->repeat($task->fresh(), 'week');
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $task->id]), ['body' => 'First run']);

        $this->complete($task);

        $task->refresh();
        $this->assertNotNull($task->completed_at);
        $this->assertSame($this->done->id, $task->task_list_id);
        $this->assertNull($task->repeatRule());

        $next = $this->next($task);
        $this->assertNotNull($next);
        $this->assertSame(1, Task::query()->where('repeated_from_id', $task->id)->count());
        $this->assertSame($this->todo->id, $next->task_list_id);
        $this->assertSame('2026-11-23', $next->due_on->toDateString());
        $this->assertSame(['Weekly review', 'Every Monday.', Priority::High, $this->teammate->id], [$next->title, $next->description, $next->priority, $next->assignee_id]);
        $this->assertSame(['unit' => 'week', 'every' => 1], $next->repeatRule()->toArray());
        $this->assertSame([$label->id], $next->labels()->pluck('labels.id')->all());
        $this->assertSame(['Check backups', 'Write notes'], $next->checklistItems()->pluck('body')->all());
        $this->assertSame(0, $next->checklistItems()->whereNotNull('completed_at')->count());
        $this->assertSame(0, $next->comments()->count());
        $this->assertNull($next->completed_at);

        $created = $next->activities()->sole();
        $this->assertSame(Activity::TASK_CREATED, $created->type);
        $this->assertSame($task->id, $created->properties['repeated_from']);
        $this->assertTrue($created->user->is($this->member));
        Notification::assertNotSentTo($this->teammate, TaskAssigned::class);
    }

    /**
     * @return array<string, array{0: string, 1: int, 2: string, 3: string}>
     */
    public static function schedules(): array
    {
        return [
            'every day' => ['day', 1, '2026-11-16', '2026-11-17'],
            'every 3 days' => ['day', 3, '2026-11-16', '2026-11-19'],
            'every weekday, from a Friday' => ['weekday', 1, '2026-11-20', '2026-11-23'],
            'every 2 weeks' => ['week', 2, '2026-11-19', '2026-12-03'],
            'every month on the 31st' => ['month', 1, '2027-01-31', '2027-02-28'],
            'every year on 29 February' => ['year', 1, '2028-02-29', '2029-02-28'],
        ];
    }

    #[DataProvider('schedules')]
    public function test_the_next_due_date_follows_the_schedule(string $unit, int $every, string $due, string $expected)
    {
        $task = $this->repeat($this->task(due: $due), $unit, $every);

        $this->complete($task);

        $this->assertSame($expected, $this->next($task)->due_on->toDateString());
    }

    public function test_monthly_and_yearly_repeats_come_back_to_their_day()
    {
        Date::setTestNow('2027-01-31 09:00:00');
        $monthly = $this->repeat($this->task(due: '2027-01-31'), 'month');
        $this->complete($monthly);
        $february = $this->next($monthly);

        Date::setTestNow('2027-02-28 09:00:00');
        $this->complete($february);
        $this->assertSame('2027-03-31', $this->next($february)->due_on->toDateString());

        Date::setTestNow('2028-02-29 09:00:00');
        $yearly = $this->repeat($this->task(due: '2028-02-29'), 'year');
        $this->complete($yearly);
        $in2029 = $this->next($yearly);
        $this->assertSame('2029-02-28', $in2029->due_on->toDateString());

        Date::setTestNow('2031-03-01 09:00:00');
        $this->complete($in2029);
        $this->assertSame('2032-02-29', $this->next($in2029)->due_on->toDateString());
    }

    public function test_a_task_completed_late_skips_dates_already_past()
    {
        // Due three Mondays ago; today is Monday 16 November.
        $task = $this->repeat($this->task(due: '2026-10-26'), 'week');

        $this->complete($task);

        $this->assertSame('2026-11-16', $this->next($task)->due_on->toDateString());
    }

    public function test_reopening_takes_back_an_untouched_next_occurrence_and_repeats_again()
    {
        $task = $this->repeat($this->task(), 'week');
        $this->complete($task);
        $next = $this->next($task);

        $this->complete($task, false);

        $task->refresh();
        $this->assertNull($task->completed_at);
        $this->assertSame(['unit' => 'week', 'every' => 1], $task->repeatRule()->toArray());
        $this->assertNull(Task::query()->find($next->id));
        $this->assertSame($this->todo->id, $task->task_list_id);

        // Completing again makes a new next occurrence.
        $this->complete($task);
        $this->assertNotNull($this->next($task));
    }

    public function test_reopening_keeps_a_changed_next_occurrence_and_stops_repeating()
    {
        $task = $this->repeat($this->task(), 'week');
        $this->complete($task);
        $next = $this->next($task);
        $next->checklistItems()->create(['body' => 'Added later', 'position' => 0]);

        $this->complete($task, false);

        $this->assertNotNull(Task::query()->find($next->id));
        $this->assertNull($task->fresh()->repeatRule());
    }

    public function test_a_comment_or_a_file_also_counts_as_a_change()
    {
        $task = $this->repeat($this->task(), 'week');
        $this->complete($task);
        $next = $this->next($task);
        $this->actingAs($this->member)->post($this->url('comments.store', ['task' => $next->id]), ['body' => 'Started']);

        $this->complete($task, false);
        $this->assertNotNull(Task::query()->find($next->id));

        $other = $this->repeat($this->task('Monthly report'), 'month');
        $this->complete($other);
        $otherNext = $this->next($other);
        $otherNext->attachments()->create(['name' => 'a.pdf', 'path' => 'x', 'mime_type' => 'application/pdf', 'size' => 1]);
        Attachment::query()->update(['created_at' => now(), 'updated_at' => now()]);

        $this->complete($other, false);
        $this->assertNotNull(Task::query()->find($otherNext->id));
    }

    public function test_moving_a_recurring_task_into_done_also_creates_the_next_one()
    {
        $task = $this->repeat($this->task(), 'day');

        $this->actingAs($this->member)
            ->patch($this->url('tasks.move', ['task' => $task->id]), ['list_id' => $this->done->id, 'index' => 0])
            ->assertSessionHasNoErrors();

        $this->assertSame('2026-11-17', $this->next($task)->due_on->toDateString());
        $this->assertSame($this->todo->id, $this->next($task)->task_list_id);
    }

    public function test_without_a_done_list_the_next_occurrence_joins_the_same_list()
    {
        $this->done->update(['is_done' => false]);
        $task = $this->repeat($this->task(), 'day');

        $this->complete($task);

        $this->assertSame($this->todo->id, $task->fresh()->task_list_id);
        $this->assertSame($this->todo->id, $this->next($task)->task_list_id);
    }

    public function test_deleting_a_recurring_task_deletes_only_that_occurrence()
    {
        $task = $this->repeat($this->task(), 'week');
        $this->complete($task);
        $next = $this->next($task);

        $this->actingAs($this->member)->delete($this->url('tasks.destroy', ['task' => $next->id]));

        $this->assertNotNull(Task::query()->find($task->id));
        $this->assertSame(0, Task::query()->where('repeated_from_id', $task->id)->count());
    }

    public function test_the_board_says_which_tasks_repeat()
    {
        $this->repeat($this->task(), 'week', 2);

        $this->actingAs($this->member)
            ->get($this->url('projects.show', ['project' => $this->project->id]))
            ->assertInertia(fn ($page) => $page->where('project.lists.0.tasks.0.repeat', ['unit' => 'week', 'every' => 2, 'anchorOn' => '2026-11-16']));
    }
}
