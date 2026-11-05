# Daily-Drift

A collaborative task manager: teams create projects, organise work into lists and tasks, and track progress together.

Daily-Drift is a personal remake of a team project I built in my second semester at VTC Academy, rebuilt from scratch with a current Laravel + React stack.

> **Status:** early setup. Authentication, teams and the UI component library are in place; the task features come next.

## Stack

- **Backend:** Laravel 13, Laravel Fortify (registration, email verification, two-factor auth, passkeys, password confirmation)
- **Teams:** teams, email invitations, roles and permissions (from the starter kit's `teams` variant)
- **Frontend:** Inertia 3, React 19, TypeScript, Tailwind CSS 4, Vite+
- **UI:** [shadcn/ui](https://ui.shadcn.com) (Radix, `new-york` style), with every component available for this style installed in `resources/js/components/ui`
- **Tooling:** PHPUnit, PHPStan, Pint, Wayfinder (typed routes for the frontend)

## Requirements

| Tool     | Version                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PHP      | **8.4.27 or newer**. 8.4.0–8.4.26 are affected by PHP2Shell (CVE-2026-109618, CVE-2026-109619); `composer.json` requires `^8.4.27`, so older versions are refused. |
| Composer | 2.x                                                                                                                                                                |
| Node.js  | 24 LTS (24.22.1 or newer), see `.nvmrc`                                                                                                                            |
| pnpm     | 12, pinned in `package.json` (`corepack enable pnpm` picks the right version)                                                                                      |

## Getting started

```bash
composer setup
```

This installs PHP and frontend dependencies, creates `.env`, generates the app key, runs the migrations (SQLite by default) and builds the frontend.

Then start the dev servers (Laravel, queue, logs and Vite):

```bash
composer dev
```

## Checks

```bash
composer test          # Pint, PHPStan and the test suite
pnpm run check         # frontend lint and formatting
pnpm run types:check   # TypeScript
```

The production build downloads the Instrument Sans font from `fonts.bunny.net`, so it needs network access to that host.

## Credits

- Built on the [Laravel React Starter Kit](https://github.com/laravel/react-starter-kit) (teams variant), MIT licensed.
- UI components from [shadcn/ui](https://ui.shadcn.com), MIT licensed.
