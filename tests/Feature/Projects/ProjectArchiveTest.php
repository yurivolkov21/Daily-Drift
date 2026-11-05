<?php

namespace Tests\Feature\Projects;

use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectArchiveTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Create a project and a user with the given role in its team.
     *
     * @return array{0: Project, 1: User, 2: array<string, int|string>}
     */
    private function projectFor(TeamRole $role, bool $archived = false): array
    {
        $team = Team::factory()->create();
        $user = User::factory()->create();
        $team->members()->attach($user, ['role' => $role->value]);

        $factory = Project::factory()->for($team);
        $project = ($archived ? $factory->archived() : $factory)->create();

        return [$project, $user, ['current_team' => $team->slug, 'project' => $project->id]];
    }

    public function test_owners_and_admins_can_archive_and_restore_projects()
    {
        foreach ([TeamRole::Owner, TeamRole::Admin] as $role) {
            [$project, $user, $parameters] = $this->projectFor($role);

            $this->actingAs($user)->post(route('projects.archive', $parameters))->assertRedirect();
            $this->assertNotNull($project->fresh()->archived_at);

            $this->actingAs($user)->delete(route('projects.restore', $parameters))->assertRedirect();
            $this->assertNull($project->fresh()->archived_at);
        }
    }

    public function test_members_cannot_archive_or_restore_projects()
    {
        [$project, $user, $parameters] = $this->projectFor(TeamRole::Member);

        $this->actingAs($user)->post(route('projects.archive', $parameters))->assertForbidden();
        $this->assertNull($project->fresh()->archived_at);

        [$archived, $user, $parameters] = $this->projectFor(TeamRole::Member, archived: true);

        $this->actingAs($user)->delete(route('projects.restore', $parameters))->assertForbidden();
        $this->assertNotNull($archived->fresh()->archived_at);
    }

    public function test_archiving_twice_or_restoring_an_active_project_is_refused()
    {
        [$archived, $user, $parameters] = $this->projectFor(TeamRole::Owner, archived: true);
        $this->actingAs($user)->post(route('projects.archive', $parameters))->assertForbidden();

        [$active, $user, $parameters] = $this->projectFor(TeamRole::Owner);
        $this->actingAs($user)->delete(route('projects.restore', $parameters))->assertForbidden();
        $this->assertNull($active->fresh()->archived_at);
    }
}
