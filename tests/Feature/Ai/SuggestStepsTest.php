<?php

namespace Tests\Feature\Ai;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Ai\Assistant;
use App\Ai\AssistantException;
use App\Ai\Failure;
use App\Enums\Hue;
use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\Fakes\FakeAssistant;
use Tests\TestCase;

/**
 * Spec 0011: Suggest steps, in a task's checklist.
 */
class SuggestStepsTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $member;

    private Project $project;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        Date::setTestNow('2026-11-16 09:00:00');

        $this->team = Team::factory()->create();
        $this->member = User::factory()->create();
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, ['name' => 'Launch', 'color' => Hue::Indigo]);
        $this->task = app(CreateTask::class)->handle($this->project->firstOpenList(), $this->member, 'Publish the release notes');
        $this->task->update(['description' => 'Version 0.4 ships on Friday.', 'priority' => 'high']);
    }

    private function fake(array|AssistantException ...$replies): FakeAssistant
    {
        $fake = FakeAssistant::replying(...$replies);
        $this->app->instance(Assistant::class, $fake);

        return $fake;
    }

    private function url(?Task $task = null): string
    {
        return route('ai.steps', ['current_team' => $this->team->slug, 'task' => ($task ?? $this->task)->id]);
    }

    public function test_steps_are_drafted_from_the_task_and_tidied()
    {
        $this->task->checklistItems()->create(['body' => 'Write the changelog', 'position' => 0]);
        $fake = $this->fake(['steps' => [
            '1. Collect the merged pull requests',
            'write the CHANGELOG',
            '',
            '- Draft the announcement',
            'Draft the announcement',
            str_repeat('Long ', 80),
            'Post it in the team channel',
            'Tag the release',
            'Publish the notes',
            'Thank the contributors',
            'Archive the milestone',
        ]]);

        $steps = $this->actingAs($this->member)->postJson($this->url())->assertOk()->json('steps');

        $this->assertSame([
            'Collect the merged pull requests',
            'Draft the announcement',
            rtrim(mb_substr(trim(str_repeat('Long ', 80)), 0, 299)).'…',
            'Post it in the team channel',
            'Tag the release',
            'Publish the notes',
            'Thank the contributors',
            'Archive the milestone',
        ], $steps);

        $prompt = $fake->prompts[0];
        $this->assertSame('steps', $prompt->purpose);
        $this->assertSame('low', $prompt->effort);
        $this->assertStringContainsString('Title: Publish the release notes', $prompt->user);
        $this->assertStringContainsString('Version 0.4 ships on Friday.', $prompt->user);
        $this->assertStringContainsString('Priority: high', $prompt->user);
        $this->assertStringContainsString('- Write the changelog', $prompt->user);
        $this->assertStringContainsString('Project: Launch', $prompt->user);

        // Nothing is saved until the person adds the steps they keep.
        $this->assertSame(1, $this->task->checklistItems()->count());
    }

    public function test_suggestions_fit_the_room_left_in_the_checklist()
    {
        foreach (range(1, 48) as $position) {
            $this->task->checklistItems()->create(['body' => "Step {$position}", 'position' => $position]);
        }

        $this->fake(['steps' => ['One', 'Two', 'Three', 'Four']]);

        $this->actingAs($this->member)->postJson($this->url())->assertOk()->assertExactJson(['steps' => ['One', 'Two']]);
    }

    public function test_a_full_checklist_asks_nothing()
    {
        foreach (range(1, 50) as $position) {
            $this->task->checklistItems()->create(['body' => "Step {$position}", 'position' => $position]);
        }

        $fake = $this->fake();

        $this->actingAs($this->member)->postJson($this->url())->assertOk()->assertExactJson(['steps' => []]);
        $this->assertSame([], $fake->prompts);
    }

    public function test_failures_answer_with_their_message()
    {
        $this->fake(new AssistantException(Failure::Refused), new AssistantException(Failure::Busy), ['steps' => 'not a list']);

        $this->actingAs($this->member)->postJson($this->url())
            ->assertStatus(422)
            ->assertExactJson([
                'message' => 'Claude couldn\'t help with this one.',
                'errors' => ['assistant' => ['Claude couldn\'t help with this one.']],
            ]);
        $this->actingAs($this->member)->postJson($this->url())
            ->assertStatus(503)
            ->assertJsonPath('message', 'Claude is busy right now. Try again in a moment.');
        $this->actingAs($this->member)->postJson($this->url())
            ->assertStatus(502)
            ->assertJsonPath('message', 'Claude\'s reply couldn\'t be used. Try again.');
    }

    public function test_only_people_who_can_edit_the_task_ask()
    {
        $fake = $this->fake();
        $stranger = User::factory()->create();

        $this->actingAs($stranger)->postJson($this->url())->assertNotFound();

        $this->project->update(['archived_at' => now()]);
        $this->actingAs($this->member)->postJson($this->url())->assertForbidden();

        $this->assertSame([], $fake->prompts);
    }
}
