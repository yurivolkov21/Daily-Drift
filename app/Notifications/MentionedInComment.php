<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class MentionedInComment extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Comment $comment, public User $actor) {}

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
        return 'comment-mention';
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array{team: array{slug: string, name: string}, issue: array{identifier: string, title: string}, actor: array{id: int, name: string}, comment: array{id: string, excerpt: string}}
     */
    public function toArray(object $notifiable): array
    {
        $issue = $this->comment->issue;
        $team = $issue->project->team;

        return [
            'team' => ['slug' => $team->slug, 'name' => $team->name],
            'issue' => ['identifier' => $issue->identifier, 'title' => $issue->title],
            'actor' => ['id' => $this->actor->id, 'name' => $this->actor->name],
            'comment' => [
                'id' => $this->comment->id,
                'excerpt' => Str::limit(Str::squish($this->comment->plainBody()), 140),
            ],
        ];
    }
}
