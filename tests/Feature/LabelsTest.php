<?php

namespace Tests\Feature;

use App\Enums\TeamRole;
use App\Models\Activity;
use App\Models\Label;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Spec 0007: team labels with an icon, on up to 5 tasks' worth of badges.
 */
class LabelsTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $owner;

    private User $admin;

    private User $member;

    private Project $project;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create();
        $this->owner = User::factory()->create();
        $this->admin = User::factory()->create();
        $this->member = User::factory()->create();
        $this->team->members()->attach($this->owner, ['role' => TeamRole::Owner->value]);
        $this->team->members()->attach($this->admin, ['role' => TeamRole::Admin->value]);
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);

        $this->project = Project::factory()->for($this->team)->create();
        $this->task = Task::factory()->for(TaskList::factory()->for($this->project), 'list')->create();
        Activity::query()->delete();
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    private function url(string $name, array $parameters = [], ?Team $team = null): string
    {
        return route($name, ['current_team' => ($team ?? $this->team)->slug, ...$parameters]);
    }

    private function label(string $name = 'Bug', string $icon = 'bug', ?Team $team = null): Label
    {
        return Label::factory()->for($team ?? $this->team)->create(['name' => $name, 'icon' => $icon]);
    }

    /**
     * @param  array<int, Label|int>  $labels
     */
    private function sync(User $user, array $labels, ?Task $task = null): TestResponse
    {
        return $this->actingAs($user)->put(
            $this->url('tasks.labels.update', ['task' => ($task ?? $this->task)->id]),
            ['labels' => array_map(fn ($label) => $label instanceof Label ? $label->id : $label, $labels)],
        );
    }

    public function test_a_member_creates_a_label_with_an_icon_from_the_list()
    {
        $this->actingAs($this->member)->post($this->url('labels.store'), ['name' => ' Bug ', 'icon' => 'bug'])->assertSessionHasNoErrors();

        $label = Label::query()->sole();
        $this->assertSame(['Bug', 'bug', $this->team->id], [$label->name, $label->icon, $label->team_id]);
    }

    public function test_an_unknown_icon_or_a_taken_name_in_any_case_fails_validation()
    {
        $this->label('Bug');

        $this->actingAs($this->member)->post($this->url('labels.store'), ['name' => 'Perf', 'icon' => 'skull'])->assertSessionHasErrors('icon');
        $this->actingAs($this->member)->post($this->url('labels.store'), ['name' => 'bUG', 'icon' => 'bug'])->assertSessionHasErrors('name');
        $this->actingAs($this->member)->post($this->url('labels.store'), ['name' => str_repeat('a', 25), 'icon' => 'tag'])->assertSessionHasErrors('name');

        // The same name is fine in another team.
        $other = Team::factory()->create();
        $other->members()->attach($this->member, ['role' => TeamRole::Member->value]);
        $this->actingAs($this->member)->post($this->url('labels.store', team: $other), ['name' => 'Bug', 'icon' => 'bug'])->assertSessionHasNoErrors();

        $this->assertSame(2, Label::query()->count());
    }

    public function test_creating_from_the_task_sheet_also_puts_the_label_on_the_task()
    {
        $this->actingAs($this->member)->post($this->url('labels.store'), ['name' => 'Perf', 'icon' => 'gauge', 'task_id' => $this->task->id])->assertSessionHasNoErrors();

        $this->assertSame(['Perf'], $this->task->labels()->pluck('name')->all());
        $this->assertSame([Activity::TASK_LABELED], Activity::query()->pluck('type')->all());
    }

    public function test_only_owners_and_admins_rename_change_the_icon_of_or_delete_a_label()
    {
        $label = $this->label('Bug', 'bug');

        $this->actingAs($this->member)->patch($this->url('labels.update', ['label' => $label->id]), ['name' => 'Defect'])->assertForbidden();
        $this->actingAs($this->member)->delete($this->url('labels.destroy', ['label' => $label->id]))->assertForbidden();

        $this->actingAs($this->admin)->patch($this->url('labels.update', ['label' => $label->id]), ['name' => 'Defect', 'icon' => 'flame'])->assertSessionHasNoErrors();
        $this->assertSame(['Defect', 'flame'], [$label->refresh()->name, $label->icon]);

        $this->actingAs($this->owner)->delete($this->url('labels.destroy', ['label' => $label->id]))->assertRedirect();
        $this->assertModelMissing($label);
    }

    public function test_deleting_a_label_takes_it_off_every_task_and_records_nothing()
    {
        $label = $this->label();
        $this->sync($this->member, [$label]);
        Activity::query()->delete();

        $this->actingAs($this->owner)->delete($this->url('labels.destroy', ['label' => $label->id]));

        $this->assertSame([], $this->task->labels()->pluck('labels.id')->all());
        $this->assertSame(0, Activity::query()->count());
    }

    public function test_a_task_takes_up_to_5_labels_from_its_own_team()
    {
        $labels = collect(['A', 'B', 'C', 'D', 'E', 'F'])->map(fn (string $name) => $this->label($name, 'tag'));

        $this->sync($this->member, $labels->take(5)->all())->assertSessionHasNoErrors();
        $this->assertSame(5, $this->task->labels()->count());

        $this->sync($this->member, $labels->all())->assertSessionHasErrors('labels');

        $foreign = $this->label('Elsewhere', 'tag', Team::factory()->create());
        $this->sync($this->member, [$labels[0], $foreign])->assertSessionHasErrors('labels.1');

        $this->assertSame(5, $this->task->labels()->count());
    }

    public function test_archived_projects_refuse_label_changes()
    {
        $label = $this->label();
        $this->project->update(['archived_at' => now()]);

        $this->sync($this->member, [$label])->assertForbidden();
        $this->actingAs($this->member)->post($this->url('labels.store'), ['name' => 'New', 'icon' => 'tag', 'task_id' => $this->task->id])->assertForbidden();
        $this->assertSame(1, Label::query()->count());
    }

    public function test_adding_and_removing_a_label_each_record_one_event_with_its_name_and_icon()
    {
        $bug = $this->label('Bug', 'bug');
        $docs = $this->label('Docs', 'book-open');

        $this->sync($this->member, [$bug, $docs]);
        $this->sync($this->member, [$docs]);
        $this->sync($this->member, [$docs]);

        $events = Activity::query()->orderBy('id')->get(['type', 'properties']);
        $this->assertSame([Activity::TASK_LABELED, Activity::TASK_LABELED, Activity::TASK_UNLABELED], $events->pluck('type')->all());
        $this->assertSame(['id' => $bug->id, 'name' => 'Bug', 'icon' => 'bug'], $events->last()->properties);
    }

    public function test_the_board_sends_the_teams_labels_and_each_tasks_label_ids()
    {
        $bug = $this->label('Bug', 'bug');
        $docs = $this->label('Docs', 'book-open');
        $this->label('Elsewhere', 'tag', Team::factory()->create());
        $this->sync($this->member, [$docs, $bug]);

        $this->actingAs($this->member)
            ->get($this->url('projects.show', ['project' => $this->project->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('labels', [
                    ['id' => $bug->id, 'name' => 'Bug', 'icon' => 'bug', 'taskCount' => 1],
                    ['id' => $docs->id, 'name' => 'Docs', 'icon' => 'book-open', 'taskCount' => 1],
                ])
                ->where('project.lists.0.tasks.0.labelIds', [$bug->id, $docs->id])
            );
    }

    public function test_the_team_settings_list_the_labels_and_who_can_manage_them()
    {
        $this->label('Bug', 'bug');

        $this->actingAs($this->member)->get(route('teams.edit', $this->team))
            ->assertInertia(fn (Assert $page) => $page->has('labels', 1)->where('labels.0.taskCount', 0)->where('canManageLabels', false));

        $this->actingAs($this->admin)->get(route('teams.edit', $this->team))
            ->assertInertia(fn (Assert $page) => $page->where('canManageLabels', true));
    }

    public function test_someone_outside_the_team_gets_a_404_from_every_label_route()
    {
        $label = $this->label();
        $outsider = User::factory()->create();

        $this->actingAs($outsider)->post($this->url('labels.store'), ['name' => 'X', 'icon' => 'tag'])->assertNotFound();
        $this->actingAs($outsider)->patch($this->url('labels.update', ['label' => $label->id]), ['name' => 'X'])->assertNotFound();
        $this->actingAs($outsider)->delete($this->url('labels.destroy', ['label' => $label->id]))->assertNotFound();
        $this->sync($outsider, [$label])->assertNotFound();
        $this->actingAs($outsider)->getJson($this->url('search', ['q' => 'bug']))->assertNotFound();

        // A label of another team is not found through this team's URL.
        $foreign = $this->label('Elsewhere', 'tag', Team::factory()->create());
        $this->actingAs($this->owner)->delete($this->url('labels.destroy', ['label' => $foreign->id]))->assertNotFound();
    }
}
