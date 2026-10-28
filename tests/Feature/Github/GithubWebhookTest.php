<?php

use App\Enums\IssueLinkType;
use App\Enums\PullRequestState;
use App\Events\WorkspaceChanged;
use App\Models\GithubWebhook;
use App\Models\Issue;
use App\Models\IssueLink;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Support\Facades\Event;
use Illuminate\Testing\TestResponse;

/**
 * Post an event to the webhook as GitHub does: JSON, signed with the secret.
 *
 * @param  array<string, mixed>  $payload
 */
function deliverGithubEvent(GithubWebhook $webhook, string $event, array $payload, ?string $secret = null): TestResponse
{
    $body = json_encode($payload, JSON_THROW_ON_ERROR);

    return test()->call('POST', route('webhooks.github', $webhook), server: [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_X_GITHUB_EVENT' => $event,
        'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $body, $secret ?? $webhook->secret),
    ], content: $body);
}

/**
 * A "pull_request" event, shaped like GitHub's.
 *
 * @param  array<string, mixed>  $pullRequest
 * @return array<string, mixed>
 */
function pullRequestEvent(array $pullRequest = [], string $action = 'opened'): array
{
    return [
        'action' => $action,
        'number' => 42,
        'pull_request' => [
            'number' => 42,
            'title' => 'Fix the login redirect loop',
            'body' => null,
            'html_url' => 'https://github.com/yurivolkov21/Daily-Drift/pull/42',
            'state' => 'open',
            'draft' => false,
            'merged' => false,
            'head' => ['ref' => 'dd-12-fix-login-redirect'],
            'user' => ['login' => 'yurivolkov21'],
            ...$pullRequest,
        ],
        'repository' => ['full_name' => 'yurivolkov21/Daily-Drift'],
    ];
}

/**
 * Make a team with a webhook and an issue for each of the given identifiers.
 *
 * @return array{0: GithubWebhook, 1: Team}
 */
function teamWithIssues(string ...$identifiers): array
{
    $team = Team::factory()->create();
    $projects = [];

    foreach ($identifiers as $identifier) {
        [$key, $number] = explode('-', $identifier);
        $projects[$key] ??= Project::factory()->for($team)->create(['key' => $key]);

        Issue::factory()->for($projects[$key])->create(['number' => (int) $number]);
    }

    return [GithubWebhook::factory()->for($team)->create(), $team];
}

test('deliveries with a wrong signature get 403 and link nothing', function () {
    [$webhook] = teamWithIssues('DD-12');

    $response = deliverGithubEvent($webhook, 'pull_request', pullRequestEvent(), secret: 'not-the-secret');

    $response->assertForbidden();

    expect(IssueLink::query()->count())->toBe(0)
        ->and($webhook->fresh()->last_delivery_at)->toBeNull();
});

test('deliveries to a webhook that does not exist get 404', function () {
    $webhook = GithubWebhook::factory()->make(['id' => '01JBXXXXXXXXXXXXXXXXXXXXXX']);

    $response = deliverGithubEvent($webhook, 'ping', ['zen' => 'Keep it logically awesome.']);

    $response->assertNotFound();
});

test('the ping sent when the webhook is added is acknowledged', function () {
    [$webhook] = teamWithIssues();

    $this->freezeSecond();

    $response = deliverGithubEvent($webhook, 'ping', ['zen' => 'Keep it logically awesome.']);

    $response->assertNoContent();

    expect($webhook->fresh()->last_delivery_at?->toISOString())->toBe(now()->toISOString());
});

test('a pull request links to the issue its branch names', function () {
    [$webhook] = teamWithIssues('DD-12');

    deliverGithubEvent($webhook, 'pull_request', pullRequestEvent())->assertNoContent();

    $link = IssueLink::query()->sole();

    expect($link->issue->identifier)->toBe('DD-12')
        ->and($link->type)->toBe(IssueLinkType::PullRequest)
        ->and($link->repository)->toBe('yurivolkov21/Daily-Drift')
        ->and($link->external_id)->toBe('42')
        ->and($link->title)->toBe('Fix the login redirect loop')
        ->and($link->url)->toBe('https://github.com/yurivolkov21/Daily-Drift/pull/42')
        ->and($link->state)->toBe(PullRequestState::Open)
        ->and($link->author)->toBe('yurivolkov21');
});

test('a pull request links to every issue of the team its title and description name', function () {
    [$webhook] = teamWithIssues('DD-12', 'WEB-3');

    deliverGithubEvent($webhook, 'pull_request', pullRequestEvent([
        'title' => 'Share the session cookie (DD-12)',
        'body' => "Fixes web-3 too.\n\nNot OPS-1, which is no issue here.",
        'head' => ['ref' => 'session-cookie'],
    ]))->assertNoContent();

    expect(IssueLink::query()->with('issue.project')->get()->map(fn (IssueLink $link) => $link->issue->identifier)->sort()->values()->all())
        ->toBe(['DD-12', 'WEB-3']);
});

test('a pull request does not link to another team\'s issue with the same identifier', function () {
    [$webhook] = teamWithIssues();
    teamWithIssues('DD-12');

    deliverGithubEvent($webhook, 'pull_request', pullRequestEvent())->assertNoContent();

    expect(IssueLink::query()->count())->toBe(0);
});

test('later pull request events update the link\'s state instead of adding another', function (string $action, array $pullRequest, PullRequestState $state) {
    [$webhook] = teamWithIssues('DD-12');
    deliverGithubEvent($webhook, 'pull_request', pullRequestEvent());

    deliverGithubEvent($webhook, 'pull_request', pullRequestEvent($pullRequest, $action))->assertNoContent();

    expect(IssueLink::query()->sole()->state)->toBe($state);
})->with([
    'merged' => ['closed', ['state' => 'closed', 'merged' => true], PullRequestState::Merged],
    'closed without merging' => ['closed', ['state' => 'closed', 'merged' => false], PullRequestState::Closed],
    'back to draft' => ['converted_to_draft', ['draft' => true], PullRequestState::Draft],
]);

test('pushed commits link to the issues their messages name', function () {
    [$webhook] = teamWithIssues('DD-12');

    deliverGithubEvent($webhook, 'push', [
        'ref' => 'refs/heads/dd-12-fix-login-redirect',
        'repository' => ['full_name' => 'yurivolkov21/Daily-Drift'],
        'commits' => [
            [
                'id' => 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
                'message' => "Keep the session cookie on redirects\n\nDD-12: Safari dropped it.",
                'url' => 'https://github.com/yurivolkov21/Daily-Drift/commit/a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
                'author' => ['name' => 'Yuri', 'username' => 'yurivolkov21'],
            ],
            [
                'id' => 'ffffffffffffffffffffffffffffffffffffffff',
                'message' => 'Tidy the imports',
                'url' => 'https://github.com/yurivolkov21/Daily-Drift/commit/ffffffffffffffffffffffffffffffffffffffff',
                'author' => ['name' => 'Yuri', 'username' => 'yurivolkov21'],
            ],
        ],
    ])->assertNoContent();

    $link = IssueLink::query()->sole();

    expect($link->issue->identifier)->toBe('DD-12')
        ->and($link->type)->toBe(IssueLinkType::Commit)
        ->and($link->external_id)->toBe('a1b2c3d4e5f60718293a4b5c6d7e8f9012345678')
        ->and($link->title)->toBe('Keep the session cookie on redirects')
        ->and($link->state)->toBeNull()
        ->and($link->author)->toBe('yurivolkov21');
});

test('linking announces the change to the issue\'s team', function () {
    Event::fake([WorkspaceChanged::class]);
    [$webhook, $team] = teamWithIssues('DD-12');

    deliverGithubEvent($webhook, 'pull_request', pullRequestEvent());

    Event::assertDispatched(
        WorkspaceChanged::class,
        fn (WorkspaceChanged $event) => $event->teamId === $team->id
            && $event->subject === 'link'
            && $event->issueIdentifier === 'DD-12',
    );
});
