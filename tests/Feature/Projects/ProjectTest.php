<?php

namespace Tests\Feature\Projects;

use App\Enums\Hue;
use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Create a team and a user with the given role in it.
     *
     * @return array{0: Team, 1: User}
     */
    private function memberOf(TeamRole $role): array
    {
        $team = Team::factory()->create();
        $user = User::factory()->create();

        $team->members()->attach($user, ['role' => $role->value]);

        return [$team, $user];
    }

    /**
     * @return array<string, string>
     */
    private function validAttributes(): array
    {
        return [
            'name' => 'Website relaunch',
            'description' => 'New landing page and docs.',
            'color' => Hue::Indigo->value,
        ];
    }

    public function test_guests_are_redirected_to_the_login_page()
    {
        $team = Team::factory()->create();

        $this->get(route('projects.index', ['current_team' => $team->slug]))
            ->assertRedirect(route('login'));
    }

    public function test_members_see_the_projects_of_their_team_only()
    {
        [$team, $user] = $this->memberOf(TeamRole::Member);
        $active = Project::factory()->for($team)->create(['name' => 'Active one']);
        $archived = Project::factory()->for($team)->archived()->create(['name' => 'Archived one']);
        Project::factory()->create(['name' => 'Another team']);

        $this->actingAs($user)
            ->get(route('projects.index', ['current_team' => $team->slug]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/index')
                ->has('projects', 2)
                ->where('canCreate', false)
                ->where('projects', fn ($projects) => collect($projects)->pluck('name')->sort()->values()->all() === ['Active one', 'Archived one'])
            );

        $this->assertNotNull($archived->fresh()->archived_at);
        $this->assertNull($active->fresh()->archived_at);
    }

    public function test_people_outside_the_team_get_not_found_on_every_project_route()
    {
        $project = Project::factory()->create();
        $team = $project->team;
        $outsider = User::factory()->create();
        $parameters = ['current_team' => $team->slug, 'project' => $project->id];

        $this->actingAs($outsider);

        $this->get(route('projects.index', ['current_team' => $team->slug]))->assertNotFound();
        $this->post(route('projects.store', ['current_team' => $team->slug]), $this->validAttributes())->assertNotFound();
        $this->get(route('projects.show', $parameters))->assertNotFound();
        $this->patch(route('projects.update', $parameters), $this->validAttributes())->assertNotFound();
        $this->delete(route('projects.destroy', $parameters))->assertNotFound();
        $this->post(route('projects.archive', $parameters))->assertNotFound();
        $this->delete(route('projects.restore', $parameters))->assertNotFound();

        $this->assertModelExists($project);
    }

    public function test_a_project_of_another_team_is_not_found_through_your_own_team()
    {
        [$team, $user] = $this->memberOf(TeamRole::Owner);
        $foreign = Project::factory()->create();

        $this->actingAs($user)
            ->get(route('projects.show', ['current_team' => $team->slug, 'project' => $foreign->id]))
            ->assertNotFound();

        $this->actingAs($user)
            ->delete(route('projects.destroy', ['current_team' => $team->slug, 'project' => $foreign->id]))
            ->assertNotFound();

        $this->assertModelExists($foreign);
    }

    public function test_owners_and_admins_can_create_projects_with_the_default_lists()
    {
        foreach ([TeamRole::Owner, TeamRole::Admin] as $role) {
            [$team, $user] = $this->memberOf($role);

            $response = $this->actingAs($user)
                ->post(route('projects.store', ['current_team' => $team->slug]), $this->validAttributes());

            $project = $team->projects()->sole();

            $response->assertRedirect(route('projects.show', ['current_team' => $team->slug, 'project' => $project->id]));
            $this->assertSame('Website relaunch', $project->name);
            $this->assertSame(Hue::Indigo, $project->color);
            $this->assertTrue($project->creator->is($user));
            $this->assertSame(
                [['To do', 'slate', 0], ['In progress', 'amber', 1], ['Done', 'green', 2]],
                $project->lists->map(fn (TaskList $list) => [$list->name, $list->color->value, $list->position])->all(),
            );
        }
    }

    public function test_members_cannot_create_projects()
    {
        [$team, $user] = $this->memberOf(TeamRole::Member);

        $this->actingAs($user)
            ->post(route('projects.store', ['current_team' => $team->slug]), $this->validAttributes())
            ->assertForbidden();

        $this->assertSame(0, $team->projects()->count());
    }

    public function test_project_attributes_are_validated()
    {
        [$team, $user] = $this->memberOf(TeamRole::Owner);

        $this->actingAs($user)
            ->post(route('projects.store', ['current_team' => $team->slug]), [
                'name' => str_repeat('a', 121),
                'description' => str_repeat('b', 2001),
                'color' => 'purple',
            ])
            ->assertSessionHasErrors(['name', 'description', 'color']);

        $this->actingAs($user)
            ->post(route('projects.store', ['current_team' => $team->slug]), ['name' => '', 'color' => ''])
            ->assertSessionHasErrors(['name', 'color']);

        $this->assertSame(0, $team->projects()->count());
    }

    public function test_members_can_view_a_project_with_its_lists_in_order()
    {
        [$team, $user] = $this->memberOf(TeamRole::Member);
        $project = Project::factory()->for($team)->create();
        TaskList::factory()->for($project)->create(['name' => 'Second', 'position' => 1]);
        TaskList::factory()->for($project)->create(['name' => 'First', 'position' => 0]);

        $this->actingAs($user)
            ->get(route('projects.show', ['current_team' => $team->slug, 'project' => $project->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/show')
                ->where('project.id', $project->id)
                ->where('project.lists.0.name', 'First')
                ->where('project.lists.1.name', 'Second')
                ->where('project.can.update', false)
                ->where('project.can.delete', false)
                ->where('project.can.manageLists', true)
            );

        $project->update(['archived_at' => now()]);

        $this->actingAs($user)
            ->get(route('projects.show', ['current_team' => $team->slug, 'project' => $project->id]))
            ->assertInertia(fn (Assert $page) => $page->where('project.can.manageLists', false));
    }

    public function test_owners_and_admins_can_update_projects()
    {
        foreach ([TeamRole::Owner, TeamRole::Admin] as $role) {
            [$team, $user] = $this->memberOf($role);
            $project = Project::factory()->for($team)->create();

            $this->actingAs($user)
                ->patch(route('projects.update', ['current_team' => $team->slug, 'project' => $project->id]), [
                    'name' => 'Renamed',
                    'description' => null,
                    'color' => Hue::Teal->value,
                ])
                ->assertRedirect()
                ->assertSessionHasNoErrors();

            $project->refresh();
            $this->assertSame('Renamed', $project->name);
            $this->assertNull($project->description);
            $this->assertSame(Hue::Teal, $project->color);
        }
    }

    public function test_members_cannot_update_projects()
    {
        [$team, $user] = $this->memberOf(TeamRole::Member);
        $project = Project::factory()->for($team)->create(['name' => 'Original']);

        $this->actingAs($user)
            ->patch(route('projects.update', ['current_team' => $team->slug, 'project' => $project->id]), $this->validAttributes())
            ->assertForbidden();

        $this->assertSame('Original', $project->fresh()->name);
    }

    public function test_archived_projects_cannot_be_updated()
    {
        [$team, $user] = $this->memberOf(TeamRole::Owner);
        $project = Project::factory()->for($team)->archived()->create(['name' => 'Original']);

        $this->actingAs($user)
            ->patch(route('projects.update', ['current_team' => $team->slug, 'project' => $project->id]), $this->validAttributes())
            ->assertForbidden();

        $this->assertSame('Original', $project->fresh()->name);
    }

    public function test_only_owners_can_delete_projects_and_their_lists_go_with_them()
    {
        foreach ([TeamRole::Admin, TeamRole::Member] as $role) {
            [$team, $user] = $this->memberOf($role);
            $project = Project::factory()->for($team)->create();

            $this->actingAs($user)
                ->delete(route('projects.destroy', ['current_team' => $team->slug, 'project' => $project->id]))
                ->assertForbidden();

            $this->assertModelExists($project);
        }

        [$team, $owner] = $this->memberOf(TeamRole::Owner);
        $project = Project::factory()->for($team)->create();
        $list = TaskList::factory()->for($project)->create();

        $this->actingAs($owner)
            ->delete(route('projects.destroy', ['current_team' => $team->slug, 'project' => $project->id]))
            ->assertRedirect(route('projects.index', ['current_team' => $team->slug]));

        $this->assertModelMissing($project);
        $this->assertModelMissing($list);
    }

    public function test_the_sidebar_lists_recent_active_projects_of_the_current_team()
    {
        [$team, $user] = $this->memberOf(TeamRole::Member);
        $user->switchTeam($team);

        foreach (range(1, 6) as $day) {
            Project::factory()->for($team)->create(['name' => "Project {$day}", 'updated_at' => now()->subDays($day)]);
        }
        $list = TaskList::factory()->for(Project::query()->where('name', 'Project 1')->firstOrFail())->create();
        Task::factory()->count(2)->for($list, 'list')->create();
        Task::factory()->for($list, 'list')->completed()->create();
        Project::factory()->for($team)->archived()->create(['name' => 'Archived', 'updated_at' => now()]);
        Project::factory()->create(['name' => 'Other team', 'updated_at' => now()]);

        $this->actingAs($user)
            ->get(route('projects.index', ['current_team' => $team->slug]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('recentProjects', 5)
                ->where('recentProjects.0.name', 'Project 1')
                ->where('recentProjects.0.open', 2)
                ->where('recentProjects.1.open', 0)
                ->where('recentProjects.4.name', 'Project 5')
            );
    }
}
