<?php

namespace App\Notifications;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class IssueAssigned extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Issue $issue, public User $actor) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the notification's database type.
     */
    public function databaseType(object $notifiable): string
    {
        return 'issue-assigned';
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array{team: array{slug: string, name: string}, issue: array{identifier: string, title: string}, actor: array{id: int, name: string}}
     */
    public function toArray(object $notifiable): array
    {
        $team = $this->issue->project->team;

        return [
            'team' => ['slug' => $team->slug, 'name' => $team->name],
            'issue' => ['identifier' => $this->issue->identifier, 'title' => $this->issue->title],
            'actor' => ['id' => $this->actor->id, 'name' => $this->actor->name],
        ];
    }
}
