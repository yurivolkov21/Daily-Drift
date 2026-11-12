<?php

namespace App\Http\Controllers\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Queries\NotificationFeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The bell's panel and the notifications page (spec 0006). People only ever
 * see and mark their own notifications, in the current team.
 */
class NotificationController extends Controller
{
    /**
     * The notifications page: a list newest first, 30 at a time, and the one
     * picked with `?n=`, which is marked as read.
     */
    public function index(Request $request, Team $current_team): Response
    {
        $feed = new NotificationFeed($current_team, $request->user());
        $filter = in_array($request->query('filter'), NotificationFeed::FILTERS, true) ? (string) $request->query('filter') : 'all';
        $selected = null;

        if ($request->filled('n')) {
            $selected = $feed->find((string) $request->query('n'));
            abort_if($selected === null, 404);
            $selected->markAsRead();
        }

        return Inertia::render('notifications', [
            'filter' => $filter,
            'notifications' => Inertia::scroll(fn () => $feed->page($filter)),
            'selected' => fn () => $selected ? $feed->detail($selected) : null,
            'counts' => fn () => $feed->counts(),
        ]);
    }

    /**
     * What the bell's panel shows: the latest updates and what is due soon.
     */
    public function recent(Request $request, Team $current_team): JsonResponse
    {
        return response()->json((new NotificationFeed($current_team, $request->user()))->panel());
    }

    /**
     * Mark one as read.
     */
    public function read(Request $request, Team $current_team, string $notification): JsonResponse
    {
        $feed = new NotificationFeed($current_team, $request->user());
        $found = $feed->find($notification);

        abort_if($found === null, 404);

        $found->markAsRead();

        return response()->json(['unread' => $feed->unreadCount()]);
    }

    /**
     * Mark every unread notification of the current team as read.
     */
    public function readAll(Request $request, Team $current_team): JsonResponse
    {
        $feed = new NotificationFeed($current_team, $request->user());

        $feed->query('unread')->update(['read_at' => now()]);

        return response()->json(['unread' => 0]);
    }
}
