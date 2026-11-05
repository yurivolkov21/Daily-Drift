# Changelog

Newest first. Dates are in the project's local time (UTC+7).

## Unreleased

### Added

- Project docs: roadmap, Phase 1 spec, tech stack, architecture decision records and this changelog.
- Phase 1 UI design, first pass (provisional, to be revised): screens with screenshots, color-coded projects and lists, components per screen, block sources and their licenses, and [ADR 0005](../decisions/0005-reui-kanban-for-drag-and-drop.md) for drag and drop.
- Projects: create, edit, archive, restore and delete projects inside a team. A new project starts with To do, In progress and Done. Owners and admins manage projects, only owners delete them, and members can view them. The sidebar lists the five most recently updated active projects.

### Changed

- People outside a team get 404 instead of 403 on its pages ([ADR 0006](../decisions/0006-not-found-for-non-members.md)).
- PHPUnit 13.
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
