<?php

namespace Tests\Feature\Ai;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Ai\Assistant;
use App\Enums\Hue;
use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Fakes\FakeAssistant;
use Tests\TestCase;

/**
 * Spec 0011: the helpers are off without a key, and their requests are
 * limited per person and per team.
 */
class AiHelpersTest extends TestCase
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
        $this->member->switchTeam($this->team);

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, ['name' => 'Launch', 'color' => Hue::Indigo]);
        $this->task = app(CreateTask::class)->handle($this->project->firstOpenList(), $this->member, 'Release');
    }

    private function steps(?User $user = null): TestResponse
    {
        return $this->actingAs($user ?? $this->member)->postJson(route('ai.steps', ['current_team' => $this->team->slug, 'task' => $this->task->id]));
    }

    /**
     * A full checklist answers without asking the assistant, which keeps
     * these tests about the limits only.
     */
    private function fillChecklist(): void
    {
        foreach (range(0, 49) as $position) {
            $this->task->checklistItems()->create(['body' => "Step {$position}", 'position' => $position]);
        }
    }

    public function test_without_a_key_the_helpers_are_off()
    {
        config(['services.anthropic.key' => null]);

        $this->actingAs($this->member)
            ->get(route('projects.show', ['current_team' => $this->team->slug, 'project' => $this->project->id]))
            ->assertInertia(fn (Assert $page) => $page->where('aiHelpers', false)->where('project.can.summarize', true));

        $this->steps()->assertStatus(503)->assertJsonPath('message', 'AI helpers are off. Add ANTHROPIC_API_KEY to turn them on.');
        $this->actingAs($this->member)
            ->postJson(route('ai.summary.store', ['current_team' => $this->team->slug, 'project' => $this->project->id]))
            ->assertStatus(503);
    }

    public function test_with_a_key_the_helpers_are_on()
    {
        config(['services.anthropic.key' => 'test-key']);

        $this->actingAs($this->member)
            ->get(route('projects.show', ['current_team' => $this->team->slug, 'project' => $this->project->id]))
            ->assertInertia(fn (Assert $page) => $page->where('aiHelpers', true));
    }

    public function test_a_person_makes_ten_requests_a_minute()
    {
        $this->app->instance(Assistant::class, new FakeAssistant);
        $this->fillChecklist();

        foreach (range(1, 10) as $request) {
            $this->steps()->assertOk();
        }

        $this->steps()->assertStatus(429)->assertJsonPath('message', 'Too many AI requests. Try again in a minute.');

        // A teammate has their own minute.
        $teammate = User::factory()->create();
        $this->team->members()->attach($teammate, ['role' => TeamRole::Member->value]);
        $this->steps($teammate)->assertOk();

        $this->travel(61)->seconds();
        $this->steps()->assertOk();
    }

    public function test_a_team_makes_a_hundred_requests_a_day()
    {
        $this->app->instance(Assistant::class, new FakeAssistant);
        $this->fillChecklist();

        foreach (range(1, 10) as $minute) {
            foreach (range(1, 10) as $request) {
                $this->steps()->assertOk();
            }

            $this->travel(61)->seconds();
        }

        $this->steps()->assertStatus(429)->assertExactJson(['message' => 'Your team has used today\'s 100 AI requests. Try again tomorrow.']);

        $this->travel(1)->days();
        $this->steps()->assertOk();
    }
}
