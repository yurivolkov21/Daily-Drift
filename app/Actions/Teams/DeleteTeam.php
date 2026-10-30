<?php

namespace App\Actions\Teams;

use App\Models\PersonalAccessToken;
use App\Models\Team;
use App\Models\ToolEvent;
use Illuminate\Support\Facades\DB;

class DeleteTeam
{
    /**
     * Delete the team and everything in it: its projects with their issues,
     * comments, history, sub-tasks and links, its labels, the work coding
     * tools reported, its API tokens, GitHub webhook, invitations and
     * memberships.
     *
     * Only the trashed team row is kept, so its slug is never given to a new
     * team and old links into it lead nowhere.
     */
    public function handle(Team $team): void
    {
        DB::transaction(function () use ($team) {
            $team->projects()->delete();
            $team->labels()->delete();
            ToolEvent::query()->whereBelongsTo($team)->delete();
            $team->invitations()->delete();
            $team->memberships()->delete();
            PersonalAccessToken::query()->whereBelongsTo($team)->delete();
            $team->githubWebhook()->delete();
            $team->delete();
        });
    }
}
