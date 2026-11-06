# Changelog

Newest first. Dates are in the project's local time (UTC+7).

## Unreleased

### Added

- Project docs: roadmap, Phase 1 spec, tech stack, architecture decision records and this changelog.
- Phase 1 UI design, first pass (provisional, to be revised): screens with screenshots, color-coded projects and lists, components per screen, block sources and their licenses, and [ADR 0005](../decisions/0005-reui-kanban-for-drag-and-drop.md) for drag and drop.
- Projects: create, edit, archive, restore and delete projects inside a team. A new project starts with To do, In progress and Done. Owners and admins manage projects, only owners delete them, and members can view them. The sidebar lists the five most recently updated active projects.
- Lists: add, rename, recolor, reorder (drag and drop or keyboard) and delete the lists of a project. Every team member can manage lists; archived projects are read-only. A new list goes to the end in the first unused color. Board columns use the ReUI Kanban component ([ADR 0005](../decisions/0005-reui-kanban-for-drag-and-drop.md)).
- Tasks: add tasks at the bottom of a list, edit the title, description, priority and due date in a side sheet, complete them, move them within and between lists by drag and drop or keyboard, and delete them. An open task has its own link (`?task={id}`).
- Chosen design for every Phase 1 screen, picked from interactive wireframes in three rounds: a floating sidebar that folds to icons, motion with a reduced-motion path, and new dashboard, projects, board, sign-in and settings screens ([ADR 0007](../decisions/0007-floating-shell-with-motion.md), [spec 0002](../spec/0002-interface-rebuild.md)).
- Progress: each list shows a completion ring, the board shows task counts and overall progress, and project cards show open, due-this-week and overdue tasks.

### Changed

- Docs brought up to date: README status, roadmap, the status and known limitations of spec 0001, and a workflow section in the docs index.
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
