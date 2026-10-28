<?php

namespace App\Http\Controllers;

use App\Concerns\PresentsIssueDetails;
use App\Http\Resources\NotificationResource;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InboxController extends Controller
{
    use PresentsIssueDetails;

    /**
     * Show the person's notifications, with the issue of the selected one beside them.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $selectedId = $request->string('notification')->toString();

        return Inertia::render('inbox', [
            'notifications' => fn () => NotificationResource::collection($user->notifications()->limit(50)->get())->resolve(),
            'selectedId' => $selectedId === '' ? null : $selectedId,
            'preview' => fn () => $selectedId === '' ? null : $this->preview($user, $selectedId),
        ]);
    }

    /**
     * Get the issue a notification is about, as its page shows it. Only issues
     * of the current team open here; the others open on their own team's page.
     *
     * @return array<string, mixed>|null
     */
    protected function preview(User $user, string $notificationId): ?array
    {
        $notification = $user->notifications()->find($notificationId);
        $team = $user->currentTeam;

        if ($notification === null || $team === null || data_get($notification->data, 'team.slug') !== $team->slug) {
            return null;
        }

        $issue = $team->issues()
            ->identifiedBy((string) data_get($notification->data, 'issue.identifier'))
            ->first();

        return $issue === null ? null : $this->issueDetails($issue);
    }
}
