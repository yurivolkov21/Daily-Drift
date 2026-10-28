<?php

namespace App\Events;

use App\Models\Issue;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Tells the team's open pages that something changed, so they reload what
 * they show. It carries no data of its own: pages fetch it again through the
 * normal, authorized requests.
 *
 * It goes out as soon as the change is saved instead of waiting for the queue,
 * so other pages update at once. If Reverb cannot be reached, the failure is
 * reported and the change itself still succeeds.
 */
class WorkspaceChanged implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable, InteractsWithSockets;

    /**
     * Create a new event instance.
     *
     * @param  'issue'|'comment'|'subtask'|'project'|'label'  $subject
     * @param  'created'|'updated'|'deleted'  $action
     */
    public function __construct(
        public int $teamId,
        public string $subject,
        public string $action,
        public ?string $issueIdentifier = null,
    ) {}

    /**
     * Describe a change to an issue or to something that belongs to it.
     *
     * @param  'issue'|'comment'|'subtask'  $subject
     * @param  'created'|'updated'|'deleted'  $action
     */
    public static function forIssue(Issue $issue, string $subject, string $action): self
    {
        return new self($issue->project->team_id, $subject, $action, $issue->identifier);
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('team.'.$this->teamId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'workspace.changed';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array{subject: string, action: string, issue: string|null}
     */
    public function broadcastWith(): array
    {
        return [
            'subject' => $this->subject,
            'action' => $this->action,
            'issue' => $this->issueIdentifier,
        ];
    }
}
