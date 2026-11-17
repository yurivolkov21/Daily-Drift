<?php

namespace Tests\Feature\Ai;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\AddDraftedTasks;
use App\Actions\Tasks\CreateTask;
use App\Ai\Assistant;
use App\Ai\AssistantException;
use App\Ai\Failure;
use App\Enums\Hue;
use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\ProjectSummary;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\Fakes\FakeAssistant;
use Tests\TestCase;

/**
 * Spec 0011: the weekly summary of a project.
 */
class WeeklySummaryTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $member;

    private User $teammate;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        // 03:00 on Tuesday 17 November in Ho Chi Minh City.
        Date::setTestNow('2026-11-16 20:00:00');

        $this->team = Team::factory()->create();
        $this->member = User::factory()->create(['name' => 'Linh Tran', 'timezone' => 'Asia/Ho_Chi_Minh']);
        $this->teammate = User::factory()->create(['name' => 'Khoa Pham']);
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);
        $this->team->members()->attach($this->teammate, ['role' => TeamRole::Member->value]);

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, ['name' => 'Release 0.4', 'color' => Hue::Indigo]);
    }

    private function url(string $name): string
    {
        return route($name, ['current_team' => $this->team->slug, 'project' => $this->project->id]);
    }

    private function task(string $title, ?string $dueOn = null, ?User $by = null): Task
    {
        return app(CreateTask::class)->handle($this->project->firstOpenList(), $by ?? $this->member, $title, $dueOn);
    }

    /**
     * @return array<string, mixed>
     */
    private function reply(string $headline = 'A steady week.'): array
    {
        return [
            'headline' => $headline,
            'done' => ['Linh Tran completed "Write the notes".', '', 'Linh Tran completed "Write the notes".'],
            'risks' => ['"Fix the upload limit" is 5 days late.'],
            'next' => [],
        ];
    }

    public function test_a_member_writes_the_summary_from_the_week()
    {
        // Ten days ago: outside the 7 days.
        Date::setTestNow('2026-11-06 20:00:00');
        $this->task('An old task');
        Date::setTestNow('2026-11-16 20:00:00');

        $notes = $this->task('Write the notes', by: $this->teammate);
        $this->actingAs($this->member)->patch(route('tasks.complete', ['current_team' => $this->team->slug, 'task' => $notes->id]), ['completed' => true]);
        $this->actingAs($this->teammate)->post(route('comments.store', ['current_team' => $this->team->slug, 'task' => $notes->id]), ['body' => 'The secret launch date is Friday.']);
        $late = $this->task('Fix the upload limit', '2026-11-12');
        $late->update(['priority' => 'high']);
        $this->task('Tag the release', '2026-11-20');
        app(AddDraftedTasks::class)->handle($this->project->firstOpenList(), $this->member, [
            ['title' => 'Write the beta post', 'description' => null, 'priority' => 'none', 'steps' => []],
        ]);

        $this->app->instance(Assistant::class, $fake = FakeAssistant::replying($this->reply()));

        $summary = $this->actingAs($this->member)->postJson($this->url('ai.summary.store'))->assertOk()->json('summary');

        $this->assertSame('2026-11-11', $summary['startsOn']);
        $this->assertSame('2026-11-17', $summary['endsOn']);
        $this->assertSame('A steady week.', $summary['headline']);
        $this->assertSame(['Linh Tran completed "Write the notes".'], $summary['done']);
        $this->assertSame(['"Fix the upload limit" is 5 days late.'], $summary['risks']);
        $this->assertSame([], $summary['next']);
        $this->assertSame(['id' => $this->member->id, 'name' => 'Linh Tran'], $summary['author']);
        $this->assertSame('claude-opus-5-5', $summary['model']);

        $digest = $fake->prompts[0]->user;
        $this->assertSame('summary', $fake->prompts[0]->purpose);
        $this->assertStringContainsString('Project: Release 0.4', $digest);
        $this->assertStringContainsString('The 7 days: Wed 11 Nov to Tue 17 Nov 2026', $digest);
        $this->assertStringContainsString('Tue 17 Nov · Khoa Pham created "Write the notes" in To do', $digest);
        $this->assertStringContainsString('Tue 17 Nov · Linh Tran completed "Write the notes"', $digest);
        $this->assertStringContainsString('Khoa Pham commented on "Write the notes"', $digest);
        $this->assertStringContainsString('Linh Tran created "Write the beta post" from an AI draft in To do', $digest);
        $this->assertStringContainsString("Open tasks past their due date:\n- \"Fix the upload limit\" · due Thu 12 Nov · unassigned · high priority", $digest);
        $this->assertStringContainsString("Open tasks due in the next 7 days:\n- \"Tag the release\" · due Fri 20 Nov · unassigned", $digest);
        $this->assertStringContainsString("Open urgent or high-priority tasks that nobody is assigned to:\n- \"Fix the upload limit\"", $digest);
        $this->assertStringContainsString('Tasks completed in the 7 days: 1', $digest);
        $this->assertStringNotContainsString('An old task', $digest);
        $this->assertStringNotContainsString('secret launch date', $digest);

        // Every member reads the saved one.
        $this->actingAs($this->teammate)->getJson($this->url('ai.summary.show'))->assertOk()->assertJsonPath('summary.headline', 'A steady week.');
    }

    public function test_a_new_summary_replaces_the_saved_one()
    {
        $this->task('Write the notes');
        $this->app->instance(Assistant::class, FakeAssistant::replying($this->reply('First.'), $this->reply('Second.')));

        $this->actingAs($this->member)->postJson($this->url('ai.summary.store'))->assertOk();
        $this->actingAs($this->teammate)->postJson($this->url('ai.summary.store'))->assertOk();

        $summary = ProjectSummary::query()->sole();
        $this->assertSame('Second.', $summary->content['headline']);
        $this->assertSame($this->teammate->id, $summary->user_id);
    }

    public function test_a_quiet_week_asks_nothing()
    {
        Date::setTestNow('2026-11-01 20:00:00');
        $this->task('An old task');
        Date::setTestNow('2026-11-16 20:00:00');

        $this->app->instance(Assistant::class, $fake = new FakeAssistant);

        $this->actingAs($this->member)->getJson($this->url('ai.summary.show'))->assertOk()->assertExactJson(['summary' => null]);
        $this->actingAs($this->member)->postJson($this->url('ai.summary.store'))->assertJsonValidationErrors('summary');

        $this->assertSame([], $fake->prompts);
        $this->assertSame(0, ProjectSummary::query()->count());
    }

    public function test_a_reply_without_a_headline_is_not_saved()
    {
        $this->task('Write the notes');
        $this->app->instance(Assistant::class, FakeAssistant::replying(['headline' => ' ', 'done' => [], 'risks' => [], 'next' => []], new AssistantException(Failure::Refused)));

        $this->actingAs($this->member)->postJson($this->url('ai.summary.store'))->assertStatus(502);
        $this->actingAs($this->member)->postJson($this->url('ai.summary.store'))->assertStatus(422)->assertJsonPath('message', 'Claude couldn\'t help with this one.');

        $this->assertSame(0, ProjectSummary::query()->count());
    }

    public function test_archived_projects_keep_their_summary_but_get_no_new_one()
    {
        $this->task('Write the notes');
        $this->app->instance(Assistant::class, $fake = FakeAssistant::replying($this->reply()));
        $this->actingAs($this->member)->postJson($this->url('ai.summary.store'))->assertOk();

        $this->project->update(['archived_at' => now()]);

        $this->actingAs($this->member)->getJson($this->url('ai.summary.show'))->assertOk()->assertJsonPath('summary.headline', 'A steady week.');
        $this->actingAs($this->member)->postJson($this->url('ai.summary.store'))->assertForbidden();
        $this->assertCount(1, $fake->prompts);
    }

    public function test_strangers_read_and_write_nothing()
    {
        $stranger = User::factory()->create();
        $this->app->instance(Assistant::class, $fake = new FakeAssistant);

        $this->actingAs($stranger)->getJson($this->url('ai.summary.show'))->assertNotFound();
        $this->actingAs($stranger)->postJson($this->url('ai.summary.store'))->assertNotFound();
        $this->assertSame([], $fake->prompts);
    }
}
