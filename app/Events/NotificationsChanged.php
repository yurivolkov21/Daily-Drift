<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Tells a person's open pages that their notifications changed: one arrived,
 * or they read some in another tab. It carries the new unread count, so the
 * bell updates without asking the server.
 *
 * Like WorkspaceChanged, it goes out as soon as the change is saved, and a
 * Reverb outage is reported without failing the request.
 */
class NotificationsChanged implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable, InteractsWithSockets;

    /**
     * Create a new event instance.
     */
    public function __construct(public User $user) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->user->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'notifications.changed';
    }

    /**
     * Get the data to broadcast, counted when it goes out.
     *
     * @return array{unreadCount: int}
     */
    public function broadcastWith(): array
    {
        return [
            'unreadCount' => $this->user->unreadNotifications()->count(),
        ];
    }
}
