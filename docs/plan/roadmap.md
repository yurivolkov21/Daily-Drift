# Roadmap

Daily-Drift is a Trello-style task manager for teams: **Team → Project → List → Task**, with lists shown as Kanban columns and tasks moved by drag and drop.

Each item ships as one pull request with tests. Specs live in [`../spec`](../spec).

## Phase 0: Foundation (Done)

From the Laravel React starter kit (teams variant), see [ADR 0001](../decisions/0001-starter-kit-teams-variant.md).

- [x] Registration, email verification, password reset and confirmation
- [x] Two-factor authentication and passkeys
- [x] Teams, email invitations, roles (owner, admin, member)
- [x] Toolchain pinned (PHP 8.4.27+, Node 24, pnpm 12), CI and Dependabot
- [x] Full shadcn/ui component library installed

## Phase 1: Core Kanban (Done)

Specs: [0001 Projects, lists and tasks](../spec/0001-projects-lists-tasks.md), [0002 Interface rebuild](../spec/0002-interface-rebuild.md), [0003 Time zone per person](../spec/0003-user-time-zone.md) · Design: [Phase 1 screens](../design/README.md#screens-for-phase-1)

- [x] UI design, first pass: screens, components and sources
- [x] UI design, revision: chosen in three wireframe rounds ([ADR 0007](../decisions/0007-floating-shell-with-motion.md))
- [x] Projects: create, edit, archive and delete inside a team
- [x] Lists: Kanban columns per project; create, rename, recolor, reorder, delete
- [x] Tasks: title, description, due date, priority, complete; drag and drop within and across lists
- [x] Progress: completion percentage per list and project
- [x] Interface rebuild to the chosen design: tokens and shell, projects, board, sign in and settings ([spec 0002](../spec/0002-interface-rebuild.md))
- [x] Time zone per person, so "today" and "overdue" follow local time ([spec 0003](../spec/0003-user-time-zone.md))
- [x] Dashboard: overdue tasks, due today, active projects, built in the new design

## Phase 2: Collaboration (In progress)

Daily-Drift is mainly a portfolio project, so Phase 2 favours features that show well in a demo and leaves email for Phase 3, where the queue worker arrives. The items are in build order: each one uses the one before it. New screens get a wireframe round before any code, as in Phase 1.

- [x] Assignees and a _My tasks_ page, which also covers the "Today" view: it opens on what needs attention today ([spec 0004](../spec/0004-assignees-and-my-tasks.md))
- [ ] Activity history and task comments: one event log feeds the task sheet, the dashboard's _Activity_ card and notifications
- [ ] Notifications in the app: assigned to you, mentioned in a comment, due soon. They refresh when a page loads (no realtime); "due soon" is worked out at that moment, so no scheduler is needed
- [ ] Labels, filters and search (⌘K)
- [ ] Views: list and calendar, next to the board

## Phase 3: Advanced (Planned)

- [ ] Sign in with Google and GitHub
- [ ] AI helpers: split a task into subtasks, draft a project plan from a description, weekly progress summary
- [ ] Attachments, checklists inside a task, recurring tasks
- [ ] Production readiness: PostgreSQL, queue worker, cloud file storage, rate limiting, deployment
- [ ] Email notifications (assigned, due soon), on the queue worker and a scheduler. People who follow their device's time zone need it stored first ([ADR 0008](../decisions/0008-time-zone-per-person.md))

## Out of scope

- Live multi-user updates on the board (realtime): that is the focus of the separate `realtime-helpdesk` project.
