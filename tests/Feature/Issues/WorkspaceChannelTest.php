<?php

use App\Enums\IssueStatus;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Broadcasting\Broadcasters\NullBroadcaster;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Exceptions;

/**
 * Authorize channels the way Reverb does. The null broadcaster that the tests
 * use otherwise lets every request through.
 */
function authorizeChannelsWithReverb(): void
{
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app',
    ]);

    require base_path('routes/channels.php');
}

test('team members may listen to their team\'s channel', function () {
    authorizeChannelsWithReverb();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-team.'.$user->currentTeam->id,
        ])
        ->assertOk()
        ->assertJsonStructure(['auth']);
});

test('people outside a team may not listen to its channel', function () {
    authorizeChannelsWithReverb();
    $otherTeam = User::factory()->create()->currentTeam;

    $this->actingAs(User::factory()->create())
        ->post('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-team.'.$otherTeam->id,
        ])
        ->assertForbidden();
});

test('guests may not listen to a team\'s channel', function () {
    authorizeChannelsWithReverb();
    $team = User::factory()->create()->currentTeam;

    $this->post('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-team.'.$team->id,
    ])->assertForbidden();
});

test('a change is saved even when Reverb cannot be reached', function () {
    Exceptions::fake();
    Broadcast::extend('unreachable', fn () => new class extends NullBroadcaster
    {
        public function broadcast(array $channels, $event, array $payload = [])
        {
            throw new BroadcastException('Reverb cannot be reached.');
        }
    });
    config([
        'broadcasting.connections.unreachable' => ['driver' => 'unreachable'],
        'broadcasting.default' => 'unreachable',
    ]);

    $user = User::factory()->create();
    $issue = Issue::factory()->for(Project::factory()->for($user->currentTeam)->create(['key' => 'DD']))->create();

    $this->actingAs($user)
        ->patch(route('issues.update', [$user->currentTeam, 'DD-1']), [
            'status' => IssueStatus::Done->value,
        ])
        ->assertRedirect();

    expect($issue->fresh()->status)->toBe(IssueStatus::Done);
    Exceptions::assertReported(BroadcastException::class);
});
