# Changelog

Newest first. Dates are in the project's local time (UTC+7).

## Unreleased

### Added

- Project docs: roadmap, Phase 1 spec, tech stack, architecture decision records and this changelog.

### Changed

- Updated recharts to 3.10.1, `@rolldown/plugin-babel` to 0.3, `@types/node` to 24.x (matching Node 24) and the optional Rollup binaries to 4.67.2.
- Dependabot now groups only minor and patch updates; each major update comes as its own pull request.
- Dependabot no longer proposes `@types/node` majors beyond Node 24, or `@laravel/passkeys` versions ahead of the server package Fortify requires.

## 2026-11-05: Project setup

### Added

- Laravel React starter kit, teams variant, with every auth feature: registration, email verification, two-factor auth, passkeys and password confirmation.
- Every shadcn/ui component published for the `new-york` style.
- Dependabot for GitHub Actions, Composer and npm packages.

### Changed

- PHP 8.4.27 is the minimum version; Composer refuses older releases.
- pnpm 12 and Node 24 replace npm and Node 22; CI uses them too.
- `button`, `card`, `dialog`, `input`, `label` and `separator` updated to the current shadcn versions.
