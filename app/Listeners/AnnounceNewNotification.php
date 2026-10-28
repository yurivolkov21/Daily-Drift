<?php

namespace App\Listeners;

use App\Events\NotificationsChanged;
use App\Models\User;
use Illuminate\Notifications\Events\NotificationSent;

class AnnounceNewNotification
{
    /**
     * Tell the recipient's open pages that a notification arrived.
     */
    public function handle(NotificationSent $event): void
    {
        if ($event->channel !== 'database' || ! $event->notifiable instanceof User) {
            return;
        }

        broadcast(new NotificationsChanged($event->notifiable));
    }
}
