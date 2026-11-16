<?php

namespace Tests\Feature\Tasks;

use App\Actions\Projects\CreateProject;
use App\Actions\Tasks\CreateTask;
use App\Enums\Hue;
use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\ChecklistItem;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

/**
 * Spec 0010: a task's checklist.
 */
class ChecklistTest extends TestCase
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

        $this->project = app(CreateProject::class)->handle($this->team, $this->member, ['name' => 'Board', 'color' => Hue::Indigo]);
        $this->task = app(CreateTask::class)->handle($this->project->lists()->where('name', 'To do')->sole(), $this->member, 'Release');
        Activity::query()->delete();
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    private function url(string $name, array $parameters = []): string
    {
        return route($name, ['current_team' => $this->team->slug, ...$parameters]);
    }

    private function add(string $body): void
    {
        $this->actingAs($this->member)
            ->post($this->url('checklist-items.store', ['task' => $this->task->id]), ['body' => $body])
            ->assertSessionHasNoErrors();
    }

    /**
     * @return list<string>
     */
    private function bodies(): array
    {
        return $this->task->checklistItems()->pluck('body')->all();
    }

    private function item(string $body): ChecklistItem
    {
        return $this->task->checklistItems()->where('body', $body)->sole();
    }

    public function test_members_add_items_in_order_and_pasted_lines_become_one_item_each()
    {
        $this->add('Write the notes');
        $this->add("Tag the release\r\n\n  Deploy  \nAnnounce it");

        $this->assertSame(['Write the notes', 'Tag the release', 'Deploy', 'Announce it'], $this->bodies());
        $this->assertSame([0, 1, 2, 3], $this->task->checklistItems()->pluck('position')->all());
        $this->assertSame([], Activity::query()->pluck('type')->all());
    }

    public function test_items_are_edited_checked_and_unchecked_and_only_checks_are_recorded()
    {
        $this->add('Write the notes');
        $item = $this->item('Write the notes');

        $this->actingAs($this->member)
            ->patch($this->url('checklist-items.update', ['item' => $item->id]), ['body' => "Write the\nrelease notes"])
            ->assertSessionHasNoErrors();
        $this->assertSame('Write the release notes', $item->fresh()->body);

        $this->actingAs($this->member)->patch($this->url('checklist-items.update', ['item' => $item->id]), ['checked' => true]);
        $item->refresh();
        $this->assertTrue($item->isChecked());
        $this->assertTrue($item->completer->is($this->member));

        $this->actingAs($this->member)->patch($this->url('checklist-items.update', ['item' => $item->id]), ['checked' => true]);
        $this->actingAs($this->member)->patch($this->url('checklist-items.update', ['item' => $item->id]), ['checked' => false]);
        $this->assertFalse($item->fresh()->isChecked());
        $this->assertNull($item->fresh()->completed_by);

        $events = Activity::query()->orderBy('id')->get();
        $this->assertSame([Activity::CHECKLIST_CHECKED, Activity::CHECKLIST_UNCHECKED], $events->pluck('type')->all());
        $this->assertSame(['id' => $item->id, 'text' => 'Write the release notes'], $events->first()->properties);
        $this->assertTrue($events->first()->user->is($this->member));
    }

    public function test_checking_every_item_does_not_complete_the_task()
    {
        $this->add('Only step');

        $this->actingAs($this->member)->patch($this->url('checklist-items.update', ['item' => $this->item('Only step')->id]), ['checked' => true]);

        $this->assertNull($this->task->fresh()->completed_at);
    }

    public function test_items_move_and_delete_and_an_undone_delete_comes_back_in_place()
    {
        $this->add("One\nTwo\nThree");

        $this->actingAs($this->member)
            ->patch($this->url('checklist-items.move', ['item' => $this->item('Three')->id]), ['index' => 0])
            ->assertSessionHasNoErrors();
        $this->assertSame(['Three', 'One', 'Two'], $this->bodies());

        $this->actingAs($this->member)->delete($this->url('checklist-items.destroy', ['item' => $this->item('One')->id]));
        $this->assertSame(['Three', 'Two'], $this->bodies());
        $this->assertSame([0, 1], $this->task->checklistItems()->pluck('position')->all());

        $this->actingAs($this->member)
            ->post($this->url('checklist-items.store', ['task' => $this->task->id]), ['body' => 'One', 'index' => 1, 'checked' => true])
            ->assertSessionHasNoErrors();
        $this->assertSame(['Three', 'One', 'Two'], $this->bodies());
        $this->assertTrue($this->item('One')->isChecked());
        $this->assertSame([], Activity::query()->pluck('type')->all());
    }

    public function test_a_checklist_holds_fifty_items()
    {
        $this->add(implode("\n", array_map(fn (int $n) => "Step {$n}", range(1, 49))));
        $this->add('Step 50');

        $this->actingAs($this->member)
            ->post($this->url('checklist-items.store', ['task' => $this->task->id]), ['body' => 'Step 51'])
            ->assertSessionHasErrors('body');

        $this->assertSame(50, $this->task->checklistItems()->count());
    }

    public function test_items_are_validated()
    {
        $this->actingAs($this->member)
            ->post($this->url('checklist-items.store', ['task' => $this->task->id]), ['body' => " \n "])
            ->assertSessionHasErrors('body');

        $this->actingAs($this->member)
            ->post($this->url('checklist-items.store', ['task' => $this->task->id]), ['body' => str_repeat('a', 301)])
            ->assertSessionHasErrors('body');

        $this->assertSame(0, $this->task->checklistItems()->count());
    }

    public function test_an_archived_projects_checklist_is_read_only()
    {
        $this->add('Frozen');
        $this->project->update(['archived_at' => now()]);
        $item = $this->item('Frozen');

        $this->actingAs($this->member)->post($this->url('checklist-items.store', ['task' => $this->task->id]), ['body' => 'New'])->assertForbidden();
        $this->actingAs($this->member)->patch($this->url('checklist-items.update', ['item' => $item->id]), ['checked' => true])->assertForbidden();
        $this->actingAs($this->member)->patch($this->url('checklist-items.move', ['item' => $item->id]), ['index' => 0])->assertForbidden();
        $this->actingAs($this->member)->delete($this->url('checklist-items.destroy', ['item' => $item->id]))->assertForbidden();

        $this->assertSame(['Frozen'], $this->bodies());
        $this->assertFalse($item->fresh()->isChecked());
    }

    public function test_people_outside_the_team_get_not_found()
    {
        $this->add('Private');
        $item = $this->item('Private');
        $stranger = User::factory()->create();
        $theirs = Team::factory()->create();
        $theirs->members()->attach($stranger, ['role' => TeamRole::Owner->value]);

        $this->actingAs($stranger)->post($this->url('checklist-items.store', ['task' => $this->task->id]), ['body' => 'Hi'])->assertNotFound();
        $this->actingAs($stranger)->patch($this->url('checklist-items.update', ['item' => $item->id]), ['checked' => true])->assertNotFound();

        // Through their own team's address, the item is still not found.
        $this->actingAs($stranger)
            ->patch(route('checklist-items.update', ['current_team' => $theirs->slug, 'item' => $item->id]), ['checked' => true])
            ->assertNotFound();
        $this->actingAs($stranger)
            ->delete(route('checklist-items.destroy', ['current_team' => $theirs->slug, 'item' => $item->id]))
            ->assertNotFound();

        $this->assertSame(['Private'], $this->bodies());
    }

    public function test_the_board_carries_each_tasks_checklist()
    {
        $this->add("Done step\nOpen step");
        $this->actingAs($this->member)->patch($this->url('checklist-items.update', ['item' => $this->item('Done step')->id]), ['checked' => true]);

        $this->actingAs($this->member)
            ->get($this->url('projects.show', ['project' => $this->project->id]))
            ->assertInertia(fn ($page) => $page
                ->where('project.lists.0.tasks.0.checklist.0.body', 'Done step')
                ->where('project.lists.0.tasks.0.checklist.0.checked', true)
                ->where('project.lists.0.tasks.0.checklist.1.checked', false));
    }

    public function test_changing_the_checklist_counts_as_an_update_of_the_task()
    {
        Date::setTestNow('2026-11-16 10:00:00');

        $this->add('Later');

        $this->assertSame('2026-11-16 10:00:00', $this->task->fresh()->updated_at->toDateTimeString());
    }
}
