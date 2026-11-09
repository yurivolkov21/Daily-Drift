<?php

namespace Tests\Feature\Tasks;

use App\Enums\TeamRole;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Spec 0004: one assignee per task, from the task's team.
 */
class AssigneeTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private User $owner;

    private User $member;

    private Project $project;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create();
        $this->owner = User::factory()->create(['name' => 'Olivia Owner']);
        $this->member = User::factory()->create(['name' => 'Minh An']);
        $this->team->members()->attach($this->owner, ['role' => TeamRole::Owner->value]);
        $this->team->members()->attach($this->member, ['role' => TeamRole::Member->value]);

        $this->project = Project::factory()->for($this->team)->create();
        $list = TaskList::factory()->for($this->project)->create();
        $this->task = Task::factory()->for($list, 'list')->create();
    }

    private function assign(User $actor, ?int $assigneeId, ?Task $task = null)
    {
        return $this->actingAs($actor)->patch(
            route('tasks.update', ['current_team' => $this->team->slug, 'task' => ($task ?? $this->task)->id]),
            ['assignee_id' => $assigneeId],
        );
    }

    public function test_any_member_can_assign_a_task_to_a_team_member_and_unassign_it()
    {
        $this->assign($this->member, $this->owner->id)->assertSessionHasNoErrors();
        $this->assertSame($this->owner->id, $this->task->refresh()->assignee_id);

        $this->assign($this->member, null)->assertSessionHasNoErrors();
        $this->assertNull($this->task->refresh()->assignee_id);
    }

    public function test_someone_outside_the_team_cannot_be_assigned()
    {
        $outsider = User::factory()->create();

        $this->assign($this->owner, $outsider->id)->assertSessionHasErrors('assignee_id');
        $this->assertNull($this->task->refresh()->assignee_id);
    }

    public function test_tasks_of_archived_projects_cannot_be_assigned()
    {
        $this->project->update(['archived_at' => now()]);

        $this->assign($this->owner, $this->member->id)->assertForbidden();
        $this->assertNull($this->task->refresh()->assignee_id);
    }

    public function test_the_board_shows_the_assignee_and_who_can_be_assigned()
    {
        $this->task->update(['assignee_id' => $this->member->id]);

        $this->actingAs($this->owner)
            ->get(route('projects.show', ['current_team' => $this->team->slug, 'project' => $this->project->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('project.lists.0.tasks.0.assigneeId', $this->member->id)
                ->where('project.lists.0.tasks.0.assigneeName', 'Minh An')
                ->where('members', [
                    ['id' => $this->member->id, 'name' => 'Minh An'],
                    ['id' => $this->owner->id, 'name' => 'Olivia Owner'],
                ])
            );
    }

    public function test_leaving_a_team_unassigns_that_persons_tasks_there_only()
    {
        $otherTeam = Team::factory()->create();
        $otherTeam->members()->attach($this->member, ['role' => TeamRole::Member->value]);
        $elsewhere = Task::factory()
            ->for(TaskList::factory()->for(Project::factory()->for($otherTeam)), 'list')
            ->create(['assignee_id' => $this->member->id]);
        $this->task->update(['assignee_id' => $this->member->id]);

        $this->actingAs($this->member)->delete(route('teams.leave', $this->team));

        $this->assertNull($this->task->refresh()->assignee_id);
        $this->assertSame($this->member->id, $elsewhere->refresh()->assignee_id);
    }

    public function test_removing_a_member_unassigns_their_tasks()
    {
        $this->task->update(['assignee_id' => $this->member->id]);

        $this->actingAs($this->owner)->delete(route('teams.members.destroy', [$this->team, $this->member]));

        $this->assertNull($this->task->refresh()->assignee_id);
    }
}
