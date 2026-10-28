<?php

namespace App\Http\Controllers;

use App\Events\NotificationsChanged;
use App\Http\Requests\UpdateNotificationRequest;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class NotificationController extends Controller
{
    /**
     * List the user's latest notifications, newest first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return NotificationResource::collection(
            $request->user()->notifications()->limit(50)->get(),
        );
    }

    /**
     * Mark one of the user's notifications as read or unread.
     */
    public function update(UpdateNotificationRequest $request, string $notification): Response
    {
        $notification = $request->user()->notifications()->findOrFail($notification);

        if ($request->boolean('read')) {
            $notification->markAsRead();
        } else {
            $notification->markAsUnread();
        }

        broadcast(new NotificationsChanged($request->user()))->toOthers();

        return response()->noContent();
    }

    /**
     * Mark every unread notification of the user as read.
     */
    public function readAll(Request $request): Response
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        broadcast(new NotificationsChanged($request->user()))->toOthers();

        return response()->noContent();
    }
}
