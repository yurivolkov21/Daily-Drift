<?php

namespace Tests\Feature\Ai;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Ai\Assistant;
use App\Enums\Hue;
use App\Enums\Priority;
use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\Fakes\FakeAssistant;
use Tests\TestCase;

/**
 * Spec 0011: Draft tasks, on a project page.
 */
class DraftTasksTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $member;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        Date::setTestNow('2026-11-16 09:00:00');

        $this->team = Team::factory()->create();
        $this->member = User::factory()->create();
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, ['name' => 'Website', 'color' => Hue::Indigo]);
        app(CreateTask::class)->handle($this->project->firstOpenList(), $this->member, 'Pick a domain');
    }

    private function url(string $name): string
    {
        return route($name, ['current_team' => $this->team->slug, 'project' => $this->project->id]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function draft(string $title, array $overrides = []): array
    {
        return ['title' => $title, 'description' => "Done when {$title} is live.", 'priority' => 'medium', 'steps' => [], ...$overrides];
    }

    public function test_tasks_are_drafted_from_the_brief_and_tidied()
    {
        $fake = FakeAssistant::replying(['tasks' => [
            $this->draft('Write the home page copy', ['priority' => 'high', 'steps' => ['Outline the sections', '- Write the hero', 'Outline the sections', 'Ask for a review', 'Fix the notes', 'Publish', 'One too many']]),
            $this->draft('write the home page copy'),
            $this->draft('  '),
            $this->draft('Set up analytics', ['priority' => 'whenever']),
            ...array_map(fn (int $n) => $this->draft("Task {$n}"), range(1, 15)),
        ]]);
        $this->app->instance(Assistant::class, $fake);

        $tasks = $this->actingAs($this->member)
            ->postJson($this->url('ai.tasks.draft'), ['brief' => 'A marketing site for the launch.'])
            ->assertOk()
            ->json('tasks');

        $this->assertCount(12, $tasks);
        $this->assertSame([
            'title' => 'Write the home page copy',
            'description' => 'Done when Write the home page copy is live.',
            'priority' => 'high',
            'steps' => ['Outline the sections', 'Write the hero', 'Ask for a review', 'Fix the notes', 'Publish'],
        ], $tasks[0]);
        $this->assertSame('Set up analytics', $tasks[1]['title']);
        $this->assertSame('none', $tasks[1]['priority']);
        $this->assertSame('Task 10', $tasks[11]['title']);

        $prompt = $fake->prompts[0];
        $this->assertSame('tasks', $prompt->purpose);
        $this->assertSame('medium', $prompt->effort);
        $this->assertStringContainsString("<brief>\nA marketing site for the launch.\n</brief>", $prompt->user);
        $this->assertStringContainsString('Name: Website', $prompt->user);
        $this->assertStringContainsString('Lists: To do, In progress, Done', $prompt->user);
        $this->assertStringContainsString('- Pick a domain', $prompt->user);

        // Nothing is saved until the person adds the tasks they keep.
        $this->assertSame(1, $this->project->tasks()->count());
    }

    public function test_the_brief_is_required_and_short()
    {
        $this->app->instance(Assistant::class, $fake = new FakeAssistant);

        $this->actingAs($this->member)->postJson($this->url('ai.tasks.draft'), ['brief' => ''])->assertJsonValidationErrors('brief');
        $this->actingAs($this->member)->postJson($this->url('ai.tasks.draft'), ['brief' => str_repeat('a', 2001)])->assertJsonValidationErrors('brief');

        $this->assertSame([], $fake->prompts);
    }

    public function test_kept_tasks_are_added_to_the_first_open_list_with_their_details()
    {
        $this->project->lists()->where('name', 'To do')->delete();

        $this->actingAs($this->member)
            ->from(route('projects.show', ['current_team' => $this->team->slug, 'project' => $this->project->id]))
            ->post($this->url('ai.tasks.store'), ['tasks' => [
                $this->draft('Write the home page copy', ['priority' => 'high', 'steps' => ['Outline the sections', 'Write the hero']]),
                $this->draft('Set up analytics', ['description' => null]),
            ]])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $list = $this->project->lists()->where('name', 'In progress')->sole();
        $tasks = $list->tasks()->orderBy('position')->get();

        $this->assertSame(['Write the home page copy', 'Set up analytics'], $tasks->pluck('title')->all());
        $this->assertSame([0, 1], $tasks->pluck('position')->all());

        $first = $tasks[0];
        $this->assertSame(Priority::High, $first->priority);
        $this->assertSame('Done when Write the home page copy is live.', $first->description);
        $this->assertSame($this->member->id, $first->created_by);
        $this->assertSame(['Outline the sections', 'Write the hero'], $first->checklistItems()->pluck('body')->all());
        $this->assertNull($tasks[1]->description);

        $created = Activity::query()->where('task_id', $first->id)->where('type', Activity::TASK_CREATED)->sole();
        $this->assertTrue($created->properties['drafted']);
        $this->assertSame('In progress', $created->properties['list']);
        // The details came with the task, not as later changes.
        $this->assertSame(1, Activity::query()->where('task_id', $first->id)->count());
    }

    public function test_added_tasks_are_checked_like_tasks_typed_by_hand()
    {
        $post = fn (array $tasks) => $this->actingAs($this->member)->post($this->url('ai.tasks.store'), ['tasks' => $tasks]);

        $post([])->assertSessionHasErrors('tasks');
        $post(array_map(fn (int $n) => $this->draft("Task {$n}"), range(1, 13)))->assertSessionHasErrors('tasks');
        $post([$this->draft('')])->assertSessionHasErrors('tasks.0.title');
        $post([$this->draft('Valid', ['priority' => 'whenever'])])->assertSessionHasErrors('tasks.0.priority');
        $post([$this->draft('Valid', ['steps' => [str_repeat('a', 301)]])])->assertSessionHasErrors('tasks.0.steps.0');
        $post([$this->draft('Valid', ['assignee_id' => $this->member->id])])->assertSessionHasErrors('tasks.0');

        $this->assertSame(1, $this->project->tasks()->count());
    }

    public function test_a_project_with_only_a_done_list_has_nowhere_to_add()
    {
        $this->app->instance(Assistant::class, $fake = new FakeAssistant);
        $this->project->lists()->where('is_done', false)->get()->each->delete();

        $this->actingAs($this->member)->postJson($this->url('ai.tasks.draft'), ['brief' => 'A site.'])->assertJsonValidationErrors('list');
        $this->actingAs($this->member)->post($this->url('ai.tasks.store'), ['tasks' => [$this->draft('Valid')]])->assertSessionHasErrors('list');

        $this->assertSame([], $fake->prompts);
    }

    public function test_archived_projects_and_strangers_cannot_draft()
    {
        $this->app->instance(Assistant::class, $fake = new FakeAssistant);
        $stranger = User::factory()->create();

        $this->actingAs($stranger)->postJson($this->url('ai.tasks.draft'), ['brief' => 'A site.'])->assertNotFound();

        $this->project->update(['archived_at' => now()]);
        $this->actingAs($this->member)->postJson($this->url('ai.tasks.draft'), ['brief' => 'A site.'])->assertForbidden();
        $this->actingAs($this->member)->post($this->url('ai.tasks.store'), ['tasks' => [$this->draft('Valid')]])->assertForbidden();

        $this->assertSame([], $fake->prompts);
        $this->assertSame(1, Task::query()->count());
    }
}
