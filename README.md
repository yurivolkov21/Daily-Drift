# Daily-Drift

A collaborative task manager: teams create projects, organise work into lists and tasks, and track progress together.

Daily-Drift is a personal remake of a team project I built in my second semester at VTC Academy, rebuilt from scratch with a current Laravel + React stack.

> **Status:** Phase 1 is done: projects, lists, tasks with drag and drop, progress and the dashboard, in a new design ([design notes](docs/design/README.md)), with "today" and "overdue" in each person's time zone. Phase 2 (collaboration) is done: tasks can be assigned, each person has a _My tasks_ page, tasks have comments and a history, a bell tells you when you are assigned or mentioned, tasks have labels, board filters and a Ctrl K search, and a project can be seen as a board, a list or a calendar. Phase 3 (advanced) has started: people can sign in with Google or GitHub.

## Stack

- **Backend:** Laravel 13, Laravel Fortify (registration, email verification, two-factor auth, passkeys, password confirmation), Laravel Socialite (sign in with Google and GitHub)
- **Teams:** teams, email invitations, roles and permissions (from the starter kit's `teams` variant)
- **Frontend:** Inertia 3, React 19, TypeScript, Tailwind CSS 4, Vite+
- **UI:** [shadcn/ui](https://ui.shadcn.com) (Radix, `new-york` style), with every component available for this style installed in `resources/js/components/ui`
- **Drag and drop:** [ReUI](https://reui.io) Kanban on `@dnd-kit`
- **Dates:** date-fns, and react-day-picker under the shadcn date picker
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

### 1. Install

```bash
git clone https://github.com/yurivolkov21/Daily-Drift.git
cd Daily-Drift
composer setup
```

`composer setup` installs the PHP and frontend dependencies, copies `.env.example` to `.env`, generates the app key, creates the SQLite database (`database/database.sqlite`) with its tables, and builds the frontend. Nothing else needs setting up to run the app locally.

### 2. Run

```bash
composer dev
```

This starts the Laravel server, the queue worker, Vite and, where the system supports it, the log viewer (Pail), all in one terminal. Open **http://localhost:8000**, the address in `APP_URL`. Stop everything with `Ctrl+C`.

### 3. Sign in

Register on the sign-up page, or create a demo account:

```bash
php artisan db:seed
```

The demo account is `test@example.com` with the password `password`, its email already verified. Every account starts with a personal team; create a first project with _New project_.

### Good to know

- **Emails go to the log.** With `MAIL_MAILER=log`, verification links, password resets and team invitations are written to `storage/logs/laravel.log` instead of being sent. Copy the link from there. To see them in an inbox, point the `MAIL_*` variables at a local mail catcher such as [Mailpit](https://mailpit.axllent.org).
- **The queue worker sends invitations.** Team invitation emails go through the queue (`QUEUE_CONNECTION=database`). `composer dev` runs the worker; if you start the server another way, also run `php artisan queue:listen`.
- **The scheduler is optional.** Once a day it deletes expired team invitations. `composer dev` does not start it; run `php artisan schedule:work` in another terminal if you want it.
- **Use the address in `APP_URL`.** Passkeys only work on that host, so open `localhost:8000`, not `127.0.0.1:8000`. If you change the port or host, change `APP_URL` too.
- **Google and GitHub sign-in is optional.** Without keys the buttons are hidden and everything else works. To turn it on, follow [setting up sign in with Google and GitHub](docs/guides/social-sign-in.md) and fill in the four `GOOGLE_*` and `GITHUB_*` variables in `.env`.

### Troubleshooting

| Problem                                                | Fix                                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Composer refuses to install because of the PHP version | Install PHP 8.4.27 or newer (see [Requirements](#requirements)).                              |
| `pnpm` is missing or the wrong version                 | Run `corepack enable pnpm`; it picks the version pinned in `package.json`.                    |
| The page says _Vite manifest not found_                | Keep `composer dev` running, or build once with `pnpm run build`.                             |
| A change to `.env` has no effect                       | Run `php artisan config:clear`, then restart `composer dev`.                                  |
| A team invitation email never shows up in the log      | Check that the queue worker is running (it is part of `composer dev`).                        |
| You want to start over with an empty database          | `php artisan migrate:fresh --seed`. It deletes all data, then creates the demo account again. |

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
