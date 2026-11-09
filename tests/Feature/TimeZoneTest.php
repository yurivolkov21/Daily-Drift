<?php

namespace Tests\Feature;

use App\Enums\TeamRole;
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
 * Spec 0003: "today", "overdue" and the dashboard's days follow the viewer's
 * time zone, which is the one they picked or else their device's.
 */
class TimeZoneTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;

    private TaskList $list;

    protected function setUp(): void
    {
        parent::setUp();

        // 20:00 UTC on Monday 9 November is 03:00 on Tuesday 10 November in
        // Ho Chi Minh City (UTC+7) and 12:00 on Monday in Los Angeles.
        $this->travelTo('2026-11-09 20:00:00');

        $this->team = Team::factory()->create();
        $project = Project::factory()->for($this->team)->create();
        $this->list = TaskList::factory()->for($project)->create();
    }

    private function member(?string $zone = null): User
    {
        $user = User::factory()->create(['timezone' => $zone]);
        $this->team->members()->attach($user, ['role' => TeamRole::Member->value]);
        $user->switchTeam($this->team);

        return $user;
    }

    private function dashboard(User $user, ?string $deviceZone = null): TestResponse
    {
        if ($deviceZone !== null) {
            $this->withUnencryptedCookie('timezone', $deviceZone);
        }

        return $this->actingAs($user)->get(route('dashboard', ['current_team' => $this->team->slug]));
    }

    public function test_the_picked_time_zone_sets_today()
    {
        $this->dashboard($this->member('Asia/Ho_Chi_Minh'))->assertInertia(fn (Assert $page) => $page
            ->where('timeZone', 'Asia/Ho_Chi_Minh')
            ->where('today', '2026-11-10')
            ->where('dashboard.today', '2026-11-10')
        );
    }

    public function test_without_a_picked_zone_the_device_zone_is_used()
    {
        $this->dashboard($this->member(), 'America/Los_Angeles')->assertInertia(fn (Assert $page) => $page
            ->where('timeZone', 'America/Los_Angeles')
            ->where('today', '2026-11-09')
        );
    }

    public function test_an_old_device_zone_name_is_read_as_its_iana_name()
    {
        $this->dashboard($this->member(), 'Asia/Saigon')->assertInertia(fn (Assert $page) => $page
            ->where('timeZone', 'Asia/Ho_Chi_Minh')
            ->where('today', '2026-11-10')
        );
    }

    public function test_the_profile_offers_iana_names_and_the_device_zone()
    {
        $this->withUnencryptedCookie('timezone', 'Asia/Saigon')
            ->actingAs($this->member())
            ->get(route('profile.edit'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('deviceTimeZone', 'Asia/Ho_Chi_Minh')
                ->where('timeZones', fn ($zones) => collect($zones)->contains('Asia/Ho_Chi_Minh')
                    && ! collect($zones)->contains('Asia/Saigon'))
            );
    }

    public function test_the_picked_zone_wins_over_the_device_zone()
    {
        $this->dashboard($this->member('Asia/Ho_Chi_Minh'), 'America/Los_Angeles')->assertInertia(fn (Assert $page) => $page
            ->where('timeZone', 'Asia/Ho_Chi_Minh')
        );
    }

    public function test_an_unknown_device_zone_falls_back_to_utc()
    {
        $this->dashboard($this->member(), 'Mars/Olympus_Mons')->assertInertia(fn (Assert $page) => $page
            ->where('timeZone', 'UTC')
            ->where('today', '2026-11-09')
        );
    }

    public function test_the_profile_saves_and_clears_the_time_zone()
    {
        $user = $this->member();
        $profile = ['name' => $user->name, 'email' => $user->email];

        $this->actingAs($user)
            ->patch(route('profile.update'), [...$profile, 'timezone' => 'Asia/Ho_Chi_Minh'])
            ->assertSessionHasNoErrors();
        $this->assertSame('Asia/Ho_Chi_Minh', $user->refresh()->timezone);

        // Old names that browsers still report are stored under their IANA name.
        $this->actingAs($user)
            ->patch(route('profile.update'), [...$profile, 'timezone' => 'Asia/Calcutta'])
            ->assertSessionHasNoErrors();
        $this->assertSame('Asia/Kolkata', $user->refresh()->timezone);

        $this->actingAs($user)
            ->patch(route('profile.update'), [...$profile, 'timezone' => null])
            ->assertSessionHasNoErrors();
        $this->assertNull($user->refresh()->timezone);
    }

    public function test_the_profile_rejects_an_unknown_time_zone()
    {
        $user = $this->member('Asia/Ho_Chi_Minh');

        $this->actingAs($user)
            ->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'timezone' => 'Mars/Olympus_Mons'])
            ->assertSessionHasErrors('timezone');
        $this->assertSame('Asia/Ho_Chi_Minh', $user->refresh()->timezone);
    }

    public function test_a_task_turns_overdue_at_midnight_in_the_viewers_zone()
    {
        Task::factory()->for($this->list, 'list')->create(['due_on' => '2026-11-09']);

        $visit = fn (User $user) => $this->actingAs($user)
            ->get(route('projects.index', ['current_team' => $this->team->slug]));

        $visit($this->member('Asia/Ho_Chi_Minh'))->assertInertia(fn (Assert $page) => $page
            ->where('projects.0.stats.overdue', 1)
            ->where('projects.0.stats.health', 'attention')
        );

        $visit($this->member('UTC'))->assertInertia(fn (Assert $page) => $page
            ->where('projects.0.stats.overdue', 0)
            ->where('projects.0.stats.dueSoon', 1)
        );
    }

    public function test_the_dashboard_counts_days_in_the_viewers_zone()
    {
        // 01:00 on 10 November in Ho Chi Minh City, still 9 November in UTC.
        Task::factory()->for($this->list, 'list')->create([
            'due_on' => null,
            'created_at' => '2026-11-01 09:00:00',
            'completed_at' => '2026-11-09 18:00:00',
        ]);
        Task::factory()->for($this->list, 'list')->create([
            'due_on' => '2026-11-10',
            'created_at' => '2026-11-01 09:00:00',
        ]);

        $this->dashboard($this->member('Asia/Ho_Chi_Minh'))->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.throughput.days.13.date', '2026-11-10')
            ->where('dashboard.throughput.days.13.count', 1)
            ->where('dashboard.stats.dueToday.value', 1)
        );

        $this->dashboard($this->member('UTC'))->assertInertia(fn (Assert $page) => $page
            ->where('dashboard.throughput.days.13.date', '2026-11-09')
            ->where('dashboard.throughput.days.13.count', 1)
            ->where('dashboard.stats.dueToday.value', 0)
        );
    }
}
