# ADR 0003: Require PHP 8.4.27 or newer

**Status:** Accepted · **Date:** 2026-11-05

## Context

On 21 October 2026 PHP released 8.4.27 (with 8.5.12, 8.3.36 and 8.2.35) to fix PHP2Shell, two critical remote code execution flaws: CVE-2026-109618 and CVE-2026-109619. PHP 8.4.0 to 8.4.26 are affected, and the flaws are being exploited in the wild.

## Decision

- `composer.json` requires `"php": "^8.4.27"`, so Composer refuses to install on an older PHP and the generated platform check stops the app from booting on one.
- `config.platform.php` is pinned to `8.4.27`, so the lock file resolves the same on every machine.
- CI uses the latest PHP 8.4 release.

## Consequences

- Hosting must run PHP 8.4.27 or newer; check the provider's exact version before deploying, since some lag behind.
- Raising the minimum again for a future security release is a one-line change plus a lock refresh.
