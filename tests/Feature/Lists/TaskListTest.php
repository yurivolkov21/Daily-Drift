<?php

namespace Tests\Feature\Lists;

use App\Actions\Lists\CreateTaskList;
use App\Actions\Projects\CreateProject;
use App\Enums\Hue;
use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskListTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $member;

    private Project $project;

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
    }

    /**
     * @return array<string, int|string>
     */
    private function listRoute(TaskList $list): array
    {
        return ['current_team' => $this->team->slug, 'list' => $list->id];
    }

    /**
     * @return list<array{0: string, 1: int}>
     */
    private function board(?Project $project = null): array
    {
        return ($project ?? $this->project)->lists()->get()
            ->map(fn (TaskList $list) => [$list->name, $list->position])
            ->all();
    }

    private function list(string $name): TaskList
    {
        return $this->project->lists()->where('name', $name)->sole();
    }

    public function test_members_can_add_a_list_at_the_end_in_the_next_unused_color()
    {
        $this->actingAs($this->member)
            ->post(route('lists.store', ['current_team' => $this->team->slug, 'project' => $this->project->id]), ['name' => 'Review'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame([['To do', 0], ['In progress', 1], ['Done', 2], ['Review', 3]], $this->board());
        // Slate, amber and green are taken by the default lists.
        $this->assertSame(Hue::Red, $this->list('Review')->color);
    }

    public function test_new_lists_cycle_through_the_palette_when_every_color_is_used()
    {
        foreach (range(1, 7) as $number) {
            app(CreateTaskList::class)->handle($this->project, "Extra {$number}");
        }

        $this->assertSame(10, $this->project->lists()->count());
        $this->assertSame(
            Hue::cases(),
            collect(Hue::cases())->filter(fn (Hue $hue) => $this->project->lists()->where('color', $hue)->exists())->values()->all(),
        );

        $eleventh = app(CreateTaskList::class)->handle($this->project, 'Eleventh');

        $this->assertSame(Hue::cases()[0], $eleventh->color);
        $this->assertSame(10, $eleventh->position);
    }

    public function test_list_names_are_validated()
    {
        $this->actingAs($this->member)
            ->post(route('lists.store', ['current_team' => $this->team->slug, 'project' => $this->project->id]), ['name' => str_repeat('a', 81)])
            ->assertSessionHasErrors('name');

        $this->actingAs($this->member)
            ->patch(route('lists.update', $this->listRoute($this->list('To do'))), ['name' => '', 'color' => 'purple'])
            ->assertSessionHasErrors(['name', 'color']);

        $this->assertSame(3, $this->project->lists()->count());
    }

    public function test_members_can_rename_and_recolor_a_list()
    {
        $list = $this->list('To do');

        $this->actingAs($this->member)
            ->patch(route('lists.update', $this->listRoute($list)), ['name' => 'Backlog'])
            ->assertSessionHasNoErrors();

        $this->actingAs($this->member)
            ->patch(route('lists.update', $this->listRoute($list)), ['color' => Hue::Blue->value])
            ->assertSessionHasNoErrors();

        $list->refresh();
        $this->assertSame('Backlog', $list->name);
        $this->assertSame(Hue::Blue, $list->color);
    }

    public function test_moving_a_list_rewrites_dense_positions()
    {
        $this->actingAs($this->member)
            ->patch(route('lists.move', $this->listRoute($this->list('Done'))), ['index' => 0])
            ->assertSessionHasNoErrors();

        $this->assertSame([['Done', 0], ['To do', 1], ['In progress', 2]], $this->board());

        $this->actingAs($this->member)
            ->patch(route('lists.move', $this->listRoute($this->list('Done'))), ['index' => 2])
            ->assertSessionHasNoErrors();

        $this->assertSame([['To do', 0], ['In progress', 1], ['Done', 2]], $this->board());

        $this->actingAs($this->member)
            ->patch(route('lists.move', $this->listRoute($this->list('To do'))), ['index' => 1])
            ->assertSessionHasNoErrors();

        $this->assertSame([['In progress', 0], ['To do', 1], ['Done', 2]], $this->board());
    }

    public function test_move_targets_must_be_on_the_board()
    {
        $list = $this->list('To do');

        foreach ([-1, 3, 'first', null] as $index) {
            $this->actingAs($this->member)
                ->patch(route('lists.move', $this->listRoute($list)), ['index' => $index])
                ->assertSessionHasErrors('index');
        }

        $this->assertSame([['To do', 0], ['In progress', 1], ['Done', 2]], $this->board());
    }

    public function test_deleting_a_list_closes_the_gap()
    {
        $this->actingAs($this->member)
            ->delete(route('lists.destroy', $this->listRoute($this->list('In progress'))))
            ->assertRedirect();

        $this->assertSame([['To do', 0], ['Done', 1]], $this->board());
    }

    public function test_lists_of_archived_projects_are_read_only()
    {
        $this->project->update(['archived_at' => now()]);
        $list = $this->list('To do');

        $this->actingAs($this->member)
            ->post(route('lists.store', ['current_team' => $this->team->slug, 'project' => $this->project->id]), ['name' => 'Review'])
            ->assertForbidden();
        $this->actingAs($this->member)
            ->patch(route('lists.update', $this->listRoute($list)), ['name' => 'Backlog'])
            ->assertForbidden();
        $this->actingAs($this->member)
            ->patch(route('lists.move', $this->listRoute($list)), ['index' => 2])
            ->assertForbidden();
        $this->actingAs($this->member)
            ->delete(route('lists.destroy', $this->listRoute($list)))
            ->assertForbidden();

        $this->assertSame([['To do', 0], ['In progress', 1], ['Done', 2]], $this->board());
    }

    public function test_people_outside_the_team_get_not_found()
    {
        $outsider = User::factory()->create();
        $list = $this->list('To do');

        $this->actingAs($outsider);

        $this->post(route('lists.store', ['current_team' => $this->team->slug, 'project' => $this->project->id]), ['name' => 'Review'])->assertNotFound();
        $this->patch(route('lists.update', $this->listRoute($list)), ['name' => 'Backlog'])->assertNotFound();
        $this->patch(route('lists.move', $this->listRoute($list)), ['index' => 2])->assertNotFound();
        $this->delete(route('lists.destroy', $this->listRoute($list)))->assertNotFound();

        $this->assertSame([['To do', 0], ['In progress', 1], ['Done', 2]], $this->board());
    }

    public function test_a_list_of_another_team_is_not_found_through_your_own_team()
    {
        $foreign = Project::factory()->create();
        $foreignList = TaskList::factory()->for($foreign)->create(['name' => 'Theirs']);
        $parameters = ['current_team' => $this->team->slug, 'list' => $foreignList->id];

        $this->actingAs($this->member);

        $this->patch(route('lists.update', $parameters), ['name' => 'Mine now'])->assertNotFound();
        $this->patch(route('lists.move', $parameters), ['index' => 0])->assertNotFound();
        $this->delete(route('lists.destroy', $parameters))->assertNotFound();
        $this->post(route('lists.store', ['current_team' => $this->team->slug, 'project' => $foreign->id]), ['name' => 'Sneaky'])->assertNotFound();

        $this->assertSame('Theirs', $foreignList->fresh()->name);
        $this->assertSame(0, $foreign->lists()->where('name', 'Sneaky')->count());
    }

    public function test_changing_a_list_marks_the_project_as_updated()
    {
        $this->project->forceFill(['updated_at' => now()->subDay()])->saveQuietly();

        $this->actingAs($this->member)
            ->patch(route('lists.update', $this->listRoute($this->list('To do'))), ['name' => 'Backlog']);

        $this->assertTrue($this->project->fresh()->updated_at->isToday());
    }
}
