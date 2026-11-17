<?php

namespace Tests\Feature\Production;

use App\Http\Middleware\AddSecurityHeaders;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Spec 0012: safe headers on every response, and HTTPS behind a proxy.
 */
class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_pages_get_the_security_headers(): void
    {
        $response = $this->get(route('login'))->assertOk();

        foreach (AddSecurityHeaders::HEADERS as $name => $value) {
            $response->assertHeader($name, $value);
        }

        $response->assertHeaderMissing('Strict-Transport-Security');
    }

    public function test_error_pages_get_them_too(): void
    {
        $this->get('/no-such-page')
            ->assertNotFound()
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_a_response_keeps_the_headers_it_sets_itself(): void
    {
        Route::get('/framed', fn () => response('ok')->header('X-Frame-Options', 'SAMEORIGIN'));

        $this->get('/framed')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_production_over_https_sends_strict_transport_security(): void
    {
        $this->app['env'] = 'production';

        $this->get('https://localhost/login')->assertHeader('Strict-Transport-Security', AddSecurityHeaders::HSTS);
        $this->get('http://localhost/login')->assertHeaderMissing('Strict-Transport-Security');
    }

    public function test_the_trusted_proxy_gives_the_scheme(): void
    {
        $headers = ['X-Forwarded-Proto' => 'https', 'X-Forwarded-For' => '203.0.113.7'];

        $scheme = fn () => parse_url((string) $this->withHeaders($headers)->get(route('profile.edit'))->headers->get('Location'), PHP_URL_SCHEME);

        $this->assertSame('http', $scheme());

        config(['trustedproxy.proxies' => '*']);

        $this->assertSame('https', $scheme());
    }
}
