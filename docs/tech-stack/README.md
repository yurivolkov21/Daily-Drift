# Tech stack

## Runtime and tooling

| Tool     | Version              | Notes                                                                                                                                      |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PHP      | 8.4.27 or newer      | Required by `composer.json` (`^8.4.27`); older 8.4 releases are hit by PHP2Shell. See [ADR 0003](../decisions/0003-php-8-4-27-minimum.md). |
| Composer | 2.x                  | Platform pinned to PHP 8.4.27 so the lock file resolves the same everywhere.                                                               |
| Node.js  | 24 LTS (24.22.1+)    | `.nvmrc` and `engines` in `package.json`.                                                                                                  |
| pnpm     | 12.16.1              | Pinned in `packageManager`; `corepack enable pnpm` selects it. See [ADR 0002](../decisions/0002-pnpm-and-node-24.md).                      |
| Database | SQLite (development) | PostgreSQL planned for production (Phase 3).                                                                                               |

## Backend

- **Laravel 13** with **Inertia 3** (server-side routing, React pages).
- **Laravel Fortify** for authentication: registration, email verification, password reset and confirmation, two-factor auth, passkeys.
- **Teams** from the starter kit's teams variant: teams, invitations, roles and permissions.
- **Wayfinder** generates typed route helpers for the frontend.
- Quality: **PHPUnit**, **PHPStan**, **Pint**.

## Frontend

- **React 19**, **TypeScript**, **Tailwind CSS 4**, **Vite+**.
- **shadcn/ui** (Radix, `new-york` style), with every component published for this style in `resources/js/components/ui`. See [ADR 0004](../decisions/0004-shadcn-components.md).
- Quality: `pnpm run check` (lint and format) and `pnpm run types:check` (TypeScript).

## CI

GitHub Actions (`.github/workflows/tests.yml`) runs on every pull request: install, build, lint and format, TypeScript, Pint, PHPStan and the test suite. The `ci` check is required by the `main` ruleset.
