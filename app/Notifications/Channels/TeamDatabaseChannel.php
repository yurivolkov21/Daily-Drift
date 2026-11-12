<?php

namespace App\Notifications\Channels;

use App\Notifications\TeamNotification;
use Illuminate\Notifications\Channels\DatabaseChannel;
use Illuminate\Notifications\Notification;

/**
 * The database channel, plus the team the notification belongs to, so the
 * bell and the notifications page can show one team at a time (spec 0006).
 */
class TeamDatabaseChannel extends DatabaseChannel
{
    /**
     * @param  mixed  $notifiable
     * @return array<string, mixed>
     */
    protected function buildPayload($notifiable, Notification $notification): array
    {
        if (! $notification instanceof TeamNotification) {
            throw new \LogicException('Only team notifications go through this channel.');
        }

        return [...parent::buildPayload($notifiable, $notification), 'team_id' => $notification->teamId];
    }
}
