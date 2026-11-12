<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use App\Notifications\Channels\TeamDatabaseChannel;
use Illuminate\Notifications\Notification;

/**
 * A notification in the app (spec 0006). What it shows is copied when it
 * happens, so it still reads right after a rename and after the task or
 * the actor is gone. Phase 3 adds the mail channel here.
 */
abstract class TeamNotification extends Notification
{
    public readonly int $teamId;

    /** @var array<string, mixed> */
    protected array $snapshot;

    public function __construct(Task $task, User $actor)
    {
        $project = $task->project;
        $this->teamId = $project->team_id;
        $this->snapshot = [
            'actor' => ['id' => $actor->id, 'name' => $actor->name],
            'task' => ['id' => $task->id, 'title' => $task->title],
            'project' => ['id' => $project->id, 'name' => $project->name, 'color' => $project->color->value],
        ];
    }

    /**
     * @return array<int, class-string>
     */
    public function via(object $notifiable): array
    {
        return [TeamDatabaseChannel::class];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->snapshot;
    }
}
