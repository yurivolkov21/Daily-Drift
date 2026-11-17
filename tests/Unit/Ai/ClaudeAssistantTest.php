<?php

namespace Tests\Unit\Ai;

use App\Ai\AssistantException;
use App\Ai\ClaudeAssistant;
use App\Ai\Failure;
use App\Ai\Prompt;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Psr\Http\Message\RequestInterface;
use Tests\TestCase;

/**
 * Spec 0011: the Claude client, against a fake HTTP transport. No request
 * leaves the machine.
 */
class ClaudeAssistantTest extends TestCase
{
    /** @var list<array{request: RequestInterface}> */
    private array $sent = [];

    /**
     * @param  list<Response|\Throwable>  $responses
     */
    private function assistant(array $responses, string $model = 'claude-opus-5-5', ?string $key = 'test-key'): ClaudeAssistant
    {
        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($this->sent));

        return new ClaudeAssistant($key, $model, 'https://api.example.test', new Client(['handler' => $stack]), retries: 0);
    }

    private function prompt(): Prompt
    {
        return new Prompt(
            purpose: 'steps',
            system: 'Write steps.',
            user: '<task>Ship it</task>',
            schema: ['type' => 'object', 'properties' => ['steps' => ['type' => 'array', 'items' => ['type' => 'string']]], 'required' => ['steps'], 'additionalProperties' => false],
            effort: 'low',
            maxTokens: 8000,
        );
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function message(string $text, string $stopReason = 'end_turn', array $overrides = []): Response
    {
        return new Response(200, ['Content-Type' => 'application/json'], (string) json_encode([
            'id' => 'msg_test',
            'type' => 'message',
            'role' => 'assistant',
            'model' => 'claude-opus-5-5',
            'content' => [['type' => 'text', 'text' => $text]],
            'stop_reason' => $stopReason,
            'stop_sequence' => null,
            'usage' => ['input_tokens' => 120, 'output_tokens' => 40],
            ...$overrides,
        ]));
    }

    /**
     * @return array<string, mixed>
     */
    private function body(int $index = 0): array
    {
        return json_decode((string) $this->sent[$index]['request']->getBody(), true);
    }

    public function test_it_asks_for_json_in_the_schema_with_effort_and_fallbacks()
    {
        $reply = $this->assistant([$this->message('{"steps":["Write the notes"]}')])->json($this->prompt());

        $this->assertSame(['steps' => ['Write the notes']], $reply->data);
        $this->assertSame('claude-opus-5-5', $reply->model);

        $request = $this->sent[0]['request'];
        $this->assertSame('https://api.example.test/v1/messages', (string) $request->getUri()->withQuery(''));
        $this->assertSame('Bearer test-key', $request->getHeaderLine('Authorization'));
        $this->assertStringContainsString(ClaudeAssistant::FALLBACK_BETA, $request->getHeaderLine('anthropic-beta'));

        $body = $this->body();
        $this->assertSame('claude-opus-5-5', $body['model']);
        $this->assertSame(8000, $body['max_tokens']);
        $this->assertSame('Write steps.', $body['system']);
        $this->assertSame([['role' => 'user', 'content' => '<task>Ship it</task>']], $body['messages']);
        $this->assertSame('default', $body['fallbacks']);
        $this->assertSame('low', $body['output_config']['effort']);
        $this->assertSame('json_schema', $body['output_config']['format']['type']);
        $this->assertSame(['steps'], $body['output_config']['format']['schema']['required']);
        $this->assertArrayNotHasKey('thinking', $body);
    }

    public function test_a_model_without_fallbacks_is_asked_without_them()
    {
        $this->assistant([$this->message('{"steps":[]}')], model: 'claude-haiku-5-5')->json($this->prompt());

        $this->assertArrayNotHasKey('fallbacks', $this->body());
        $this->assertStringNotContainsString(ClaudeAssistant::FALLBACK_BETA, $this->sent[0]['request']->getHeaderLine('anthropic-beta'));
    }

    public function test_the_reply_names_the_model_that_answered()
    {
        $reply = $this->assistant([$this->message('{"steps":[]}', overrides: ['model' => 'claude-opus-4-8'])])->json($this->prompt());

        $this->assertSame('claude-opus-4-8', $reply->model);
    }

    public function test_without_a_key_it_is_off_and_sends_nothing()
    {
        $assistant = $this->assistant([], key: null);

        $this->assertFalse($assistant->enabled());
        $this->assertFailure(Failure::Off, fn () => $assistant->json($this->prompt()));
        $this->assertSame([], $this->sent);
    }

    public function test_a_refusal_is_reported_as_one()
    {
        $this->assertFailure(Failure::Refused, fn () => $this->assistant([$this->message('', 'refusal')])->json($this->prompt()));
    }

    public function test_a_reply_cut_short_or_not_json_cannot_be_used()
    {
        $this->assertFailure(Failure::Unusable, fn () => $this->assistant([$this->message('{"steps":["Wri', 'max_tokens')])->json($this->prompt()));
        $this->assertFailure(Failure::Unusable, fn () => $this->assistant([$this->message('Sure! Here are the steps.')])->json($this->prompt()));
    }

    public function test_a_busy_or_unreachable_service_is_busy()
    {
        $overloaded = new Response(529, ['Content-Type' => 'application/json'], '{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}');
        $limited = new Response(429, ['Content-Type' => 'application/json'], '{"type":"error","error":{"type":"rate_limit_error","message":"Slow down"}}');

        $this->assertFailure(Failure::Busy, fn () => $this->assistant([$overloaded])->json($this->prompt()));
        $this->assertFailure(Failure::Busy, fn () => $this->assistant([$limited])->json($this->prompt()));
        $this->assertFailure(Failure::Busy, fn () => $this->assistant([new ConnectException('Timed out', new Request('POST', 'https://api.example.test/v1/messages'))])->json($this->prompt()));
    }

    public function test_a_wrong_key_means_the_helpers_are_not_set_up()
    {
        $unauthorized = new Response(401, ['Content-Type' => 'application/json'], '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}');

        $this->assertFailure(Failure::Misconfigured, fn () => $this->assistant([$unauthorized])->json($this->prompt()));
    }

    private function assertFailure(Failure $failure, callable $call): void
    {
        try {
            $call();
        } catch (AssistantException $e) {
            $this->assertSame($failure, $e->failure);

            return;
        }

        $this->fail("Expected the {$failure->value} failure.");
    }
}
