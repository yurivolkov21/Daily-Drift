<?php

namespace App\Http\Controllers;

use App\Models\TeamInvitation;
use App\Queries\TeamDashboard;
use App\Queries\TeamFeed;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $email = strtolower($request->user()->email);

        $pendingInvitations = TeamInvitation::query()
            ->with(['inviter', 'team'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereNull('accepted_at')
            ->where(fn ($query) => $query
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now()))
            ->latest()
            ->get()
            ->map(fn (TeamInvitation $invitation) => [
                'code' => $invitation->code,
                'inviterName' => $invitation->inviter->name,
                'team' => [
                    'name' => $invitation->team->name,
                    'slug' => $invitation->team->slug,
                ],
            ]);

        $team = $request->user()->currentTeam;
        $filter = in_array($request->query('activity'), TeamFeed::FILTERS, true) ? (string) $request->query('activity') : 'all';

        return Inertia::render('dashboard', [
            'pendingInvitations' => $pendingInvitations,
            'dashboard' => $team ? (new TeamDashboard($team, viewer: $request->user()))->toArray() : null,
            'activity' => $team ? (new TeamFeed($team, $filter))->toArray() : null,
        ]);
    }
}
