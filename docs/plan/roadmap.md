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

## Phase 1: Core Kanban (In progress)

Spec: [0001 Projects, lists and tasks](../spec/0001-projects-lists-tasks.md) · Design: [Phase 1 screens](../design/README.md#screens-for-phase-1)

- [x] UI design, first pass: screens, components and sources
- [ ] UI design, revision: reach the look the owner wants (the first pass is provisional)
- [ ] Projects: create, edit, archive and delete inside a team
- [ ] Lists: Kanban columns per project; create, rename, reorder, delete
- [ ] Tasks: title, description, due date, priority, complete; drag and drop within and across lists
- [ ] Progress: completion percentage per list and project
- [ ] Dashboard: overdue tasks, due today, active projects

## Phase 2: Collaboration (Planned)

- [ ] Assign tasks to team members and a "My tasks" page
- [ ] "Today" view: the tasks to focus on today
- [ ] Labels, filters and search
- [ ] Views: board, list and calendar
- [ ] Task comments and activity history
- [ ] Notifications in the app and by email (assigned, due soon)

## Phase 3: Advanced (Planned)

- [ ] Sign in with Google and GitHub
- [ ] AI helpers: split a task into subtasks, draft a project plan from a description, weekly progress summary
- [ ] Attachments, checklists inside a task, recurring tasks
- [ ] Production readiness: PostgreSQL, queue worker, cloud file storage, rate limiting, deployment

## Out of scope

- Live multi-user updates on the board (realtime): that is the focus of the separate `realtime-helpdesk` project.
