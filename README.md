# Daily-Drift

A collaborative task manager: teams create projects, organise work into lists and tasks, and track progress together.

Daily-Drift is a personal remake of a team project I built in my second semester at VTC Academy, rebuilt from scratch with a current Laravel + React stack.

> **Status:** Phase 1 in progress. Projects, lists, tasks with drag and drop, and progress work. The interface is being rebuilt to a new design ([design notes](docs/design/README.md)), and the dashboard comes next.

## Stack

- **Backend:** Laravel 13, Laravel Fortify (registration, email verification, two-factor auth, passkeys, password confirmation)
- **Teams:** teams, email invitations, roles and permissions (from the starter kit's `teams` variant)
- **Frontend:** Inertia 3, React 19, TypeScript, Tailwind CSS 4, Vite+
- **UI:** [shadcn/ui](https://ui.shadcn.com) (Radix, `new-york` style), with every component available for this style installed in `resources/js/components/ui`
- **Drag and drop:** [ReUI](https://reui.io) Kanban on `@dnd-kit`
- **Tooling:** PHPUnit, PHPStan, Pint, Wayfinder (typed routes for the frontend)

## Docs

Roadmap, feature specs, tech stack, decisions and changelog live in [`docs/`](docs/README.md).

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

Fonts (Inter and Plus Jakarta Sans) are installed as npm packages and served by the app, so building needs no access to a font service.

## Credits

- Built on the [Laravel React Starter Kit](https://github.com/laravel/react-starter-kit) (teams variant), MIT licensed.
- UI components from [shadcn/ui](https://ui.shadcn.com) and the Kanban component from [ReUI](https://reui.io), both MIT licensed.
- [Inter](https://rsms.me/inter/) and [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) through [Fontsource](https://fontsource.org), under the SIL Open Font License 1.1. Other design sources and their licenses are listed in the [design notes](docs/design/README.md#sources).
