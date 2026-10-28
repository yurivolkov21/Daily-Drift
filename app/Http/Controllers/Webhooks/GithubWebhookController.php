<?php

namespace App\Http\Controllers\Webhooks;

use App\Actions\Github\LinkCommits;
use App\Actions\Github\LinkPullRequest;
use App\Http\Controllers\Controller;
use App\Models\GithubWebhook;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Fluent;

class GithubWebhookController extends Controller
{
    /**
     * Receive a delivery from GitHub and link what it names to the team's
     * issues. Only "push" and "pull_request" events link anything; others,
     * such as the "ping" sent when the webhook is added, are acknowledged.
     * The answer never carries anything for the sender to run.
     */
    public function __invoke(Request $request, GithubWebhook $webhook, LinkCommits $linkCommits, LinkPullRequest $linkPullRequest): Response
    {
        abort_unless(
            $webhook->hasValidSignature($request->getContent(), $request->header('X-Hub-Signature-256')),
            403,
            __('The signature does not match the webhook secret.'),
        );

        $webhook->forceFill(['last_delivery_at' => now()])->save();

        $payload = new Fluent($request->json()->all());

        match ($request->header('X-GitHub-Event')) {
            'push' => $linkCommits->handle($webhook->team, $payload),
            'pull_request' => $linkPullRequest->handle($webhook->team, $payload),
            default => null,
        };

        return response()->noContent();
    }
}
