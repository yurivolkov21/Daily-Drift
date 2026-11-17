<?php

namespace App\Ai;

use Anthropic\Beta\Messages\BetaJSONOutputFormat;
use Anthropic\Beta\Messages\BetaMessage;
use Anthropic\Beta\Messages\BetaOutputConfig;
use Anthropic\Beta\Messages\BetaTextBlock;
use Anthropic\Client;
use Anthropic\Core\Exceptions\AnthropicException;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\InternalServerException;
use Anthropic\Core\Exceptions\RateLimitException;
use Anthropic\Core\Exceptions\RequestTimeoutException;
use GuzzleHttp\Client as HttpClient;
use Illuminate\Support\Facades\Log;
use Psr\Http\Client\ClientInterface;
use Throwable;

/**
 * Claude, through the official SDK (spec 0011). Each request asks for JSON
 * that follows a schema. A request that a safety classifier declines is
 * retried on another model by the API itself (server-side fallbacks).
 */
class ClaudeAssistant implements Assistant
{
    /** The beta that lets the API retry a declined request on another model. */
    public const string FALLBACK_BETA = 'server-side-fallback-2026-07-01';

    /** Models that take `fallbacks: "default"`. */
    private const array FALLBACK_MODELS = ['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-2', 'claude-fable-5-1'];

    /** Seconds to wait for one reply. */
    public const int TIMEOUT = 90;

    private ?Client $client = null;

    /**
     * @param  ClientInterface|null  $transport  The HTTP client; tests pass a fake one.
     */
    public function __construct(
        private readonly ?string $key,
        private readonly string $model,
        private readonly ?string $baseUrl = null,
        private readonly ?ClientInterface $transport = null,
        private readonly int $retries = 1,
    ) {
        //
    }

    public function enabled(): bool
    {
        return $this->key !== null && $this->key !== '';
    }

    public function json(Prompt $prompt): Reply
    {
        if (! $this->enabled()) {
            throw new AssistantException(Failure::Off);
        }

        $fallback = in_array($this->model, self::FALLBACK_MODELS, true);

        try {
            $message = $this->client()->beta->messages->create(
                maxTokens: $prompt->maxTokens,
                messages: [['role' => 'user', 'content' => $prompt->user]],
                model: $this->model,
                fallbacks: $fallback ? 'default' : null,
                outputConfig: BetaOutputConfig::with(
                    effort: $prompt->effort,
                    format: BetaJSONOutputFormat::with(schema: $prompt->schema),
                ),
                system: $prompt->system,
                betas: $fallback ? [self::FALLBACK_BETA] : null,
            );
        } catch (RateLimitException|RequestTimeoutException|InternalServerException|APIConnectionException $e) {
            // Busy, overloaded, out of reach or too slow, after the SDK's retry.
            $this->failed($prompt, $e, 'warning');

            throw new AssistantException(Failure::Busy, $e);
        } catch (APIStatusException $e) {
            // A wrong key, no credit, an unknown model or a request the API rejects.
            $this->failed($prompt, $e, 'error');

            throw new AssistantException(Failure::Misconfigured, $e);
        } catch (AnthropicException $e) {
            $this->failed($prompt, $e, 'error');

            throw new AssistantException(Failure::Unusable, $e);
        }

        Log::info('AI request', [
            'purpose' => $prompt->purpose,
            'model' => $message->model,
            'stop_reason' => $message->stopReason,
            'input_tokens' => $message->usage->inputTokens,
            'output_tokens' => $message->usage->outputTokens,
        ]);

        return match ($message->stopReason) {
            'end_turn' => new Reply($this->decode($message), $message->model),
            'refusal' => throw new AssistantException(Failure::Refused),
            // Cut short (max_tokens) or anything else: the JSON may be incomplete.
            default => throw new AssistantException(Failure::Unusable),
        };
    }

    private function client(): Client
    {
        return $this->client ??= new Client(
            apiKey: $this->key,
            baseUrl: $this->baseUrl !== null && $this->baseUrl !== '' ? $this->baseUrl : null,
            requestOptions: [
                'maxRetries' => $this->retries,
                // The SDK leaves the timeout to the HTTP client.
                'transporter' => $this->transport ?? new HttpClient(['timeout' => self::TIMEOUT, 'connect_timeout' => 10]),
            ],
        );
    }

    /**
     * The JSON of the reply's text.
     *
     * @return array<string, mixed>
     */
    private function decode(BetaMessage $message): array
    {
        foreach ($message->content as $block) {
            if ($block instanceof BetaTextBlock) {
                $data = json_decode($block->text, true);

                if (is_array($data)) {
                    /** @var array<string, mixed> $data */
                    return $data;
                }

                break;
            }
        }

        throw new AssistantException(Failure::Unusable);
    }

    private function failed(Prompt $prompt, Throwable $e, string $level): void
    {
        Log::log($level, 'AI request failed', [
            'purpose' => $prompt->purpose,
            'model' => $this->model,
            'error' => $e::class,
            'message' => $e->getMessage(),
        ]);
    }
}
