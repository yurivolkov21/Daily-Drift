# Changelog

Newest first. Dates are in the project's local time (UTC+7).

## Unreleased

### Added

- Project docs: roadmap, Phase 1 spec, tech stack, architecture decision records and this changelog.

## 2026-11-05: Project setup

### Added

- Laravel React starter kit, teams variant, with every auth feature: registration, email verification, two-factor auth, passkeys and password confirmation.
- Every shadcn/ui component published for the `new-york` style.
- Dependabot for GitHub Actions, Composer and npm packages.

### Changed

- PHP 8.4.27 is the minimum version; Composer refuses older releases.
- pnpm 12 and Node 24 replace npm and Node 22; CI uses them too.
- `button`, `card`, `dialog`, `input`, `label` and `separator` updated to the current shadcn versions.
