# Changelog

Newest first. Dates are in the project's local time (UTC+7).

## Unreleased

### Added

- Notifications in the app ([spec 0006](../spec/0006-notifications.md)). You are notified when someone else assigns you a task or mentions you in a comment (an edit notifies only people it newly mentions). A bell in the header bar counts the current team's unread ones; its panel has _Updates_ (the latest 10, one line each) and _Due soon_ (your open tasks due today or tomorrow) tabs, and clicking opens the task, scrolled to the comment for a mention. _View all_ opens a notifications page: a timeline list by day with _All_, _Unread_, _Mentions_ and _Assigned_ filters that loads more as you scroll, and the picked notification on the right with the task as it is now, the whole comment and the task's recent changes. On a phone the two panes become two steps.
- [Spec 0006](../spec/0006-notifications.md) for notifications in the app: _Assigned_ and _Mentioned_ stored with Laravel's database notifications, _Due soon_ worked out when the panel opens, a bell with the current team's unread count. Planned. Wireframe round 6 chose a panel with _Updates_ and _Due soon_ tabs and one line per item; _View all_ leads to a notifications page with a timeline list and a detail pane.
- Activity history and comments ([spec 0005](../spec/0005-activity-and-comments.md)). Every change to a task is recorded (created, renamed, moved, assigned, priority, due date, completed, deleted). The task sheet shows comments with the changes folded between them; comments take `@` mentions, and you can edit or delete your own (owners and admins can delete any). Cards count comments, and the dashboard's _Activity_ card lists the team's latest events by day with an All / Comments / Completed filter.
- [Spec 0005](../spec/0005-activity-and-comments.md) for activity history and task comments: one event log, comments with mentions, the task sheet's history and the dashboard's _Activity_ card. Planned; the layout was chosen in wireframe round 5.
- Assignees and _My tasks_ ([spec 0004](../spec/0004-assignees-and-my-tasks.md)), the first Phase 2 feature. A task has one assignee or none, picked from a searchable menu in the task sheet; cards show the assignee. _My tasks_ lists your open tasks in Overdue, Today, Next 7 days, Later and No due date groups (in your own day), with project chips, checkboxes with _Undo_ and a _Done lately_ group; the sidebar counts them. _My focus_ on the dashboard now shows your tasks and unassigned ones, and the projects page can show only projects with a task assigned to you. Leaving or being removed from a team unassigns your tasks there.
- Phase 2 plan: the items in build order for a portfolio project (assignees and _My tasks_, activity and comments, notifications in the app, labels and search, list and calendar views), email moved to Phase 3 with the queue worker, and [spec 0004](../spec/0004-assignees-and-my-tasks.md) for assignees and _My tasks_.
- Project docs: roadmap, Phase 1 spec, tech stack, architecture decision records and this changelog.
- Phase 1 UI design, first pass (provisional, to be revised): screens with screenshots, color-coded projects and lists, components per screen, block sources and their licenses, and [ADR 0005](../decisions/0005-reui-kanban-for-drag-and-drop.md) for drag and drop.
- Projects: create, edit, archive, restore and delete projects inside a team. A new project starts with To do, In progress and Done. Owners and admins manage projects, only owners delete them, and members can view them. The sidebar lists the five most recently updated active projects.
- Lists: add, rename, recolor, reorder (drag and drop or keyboard) and delete the lists of a project. Every team member can manage lists; archived projects are read-only. A new list goes to the end in the first unused color. Board columns use the ReUI Kanban component ([ADR 0005](../decisions/0005-reui-kanban-for-drag-and-drop.md)).
- Tasks: add tasks at the bottom of a list, edit the title, description, priority and due date in a side sheet, complete them, move them within and between lists by drag and drop or keyboard, and delete them. An open task has its own link (`?task={id}`).
- Chosen design for every Phase 1 screen, picked from interactive wireframes in three rounds: a floating sidebar that folds to icons, motion with a reduced-motion path, and new dashboard, projects, board, sign-in and settings screens ([ADR 0007](../decisions/0007-floating-shell-with-motion.md), [spec 0002](../spec/0002-interface-rebuild.md)).
- New look, part 1 ([spec 0002](../spec/0002-interface-rebuild.md)): the design tokens, a floating sidebar that folds to icons (its button or Ctrl/⌘ + B, remembered across visits), a header bar, thin scrollbars that show while scrolling, and a Motion setting under Appearance (match the device, reduced or full). The _Recent_ list in the sidebar shows each project's open tasks.
- New look, part 2: the projects page. Grid or List view (the last one is remembered), a Filters panel (health and color), a Sort menu (recently updated, name, progress, overdue), and _Needs attention_ / _On track_ groups that fold. Tab, view, sort and filters live in the URL. Archived projects keep the same card in grey. The header shows the team's people and the page's main action, and the sidebar counts active projects.
- New look, part 3: the board. A header card with the project's numbers and progress, _New task_ in the header bar, tinted columns that fold to a narrow strip (remembered per project) and still take dropped cards with a _Show_ / _Undo_ toast, a dashed slot where a dragged card will land, Alt + arrow keys to move a card, and the task sheet as a floating card.
- Dashboard (the last Phase 1 feature), in the new look: a greeting with the share of this week's tasks done, _Due today_ with checkboxes, four stat cards with count-ups and 7-day sparklines (open, due today, overdue, done in 7 days), a throughput chart over 7 or 14 days compared with the period before, project progress, _My focus_ in Overdue / Today / Next 7 days tabs, and an Activity placeholder for Phase 2. Only the current team's active projects count.
- New look, part 4: sign in and sign up. A glass card over a slowly drifting board (decorative, still with reduced motion, hidden on small screens), _Sign in_ / _Create account_ tabs, errors that shake once next to their field, a password strength meter and a match check on sign up, and a "Check your inbox" page whose resend button waits 30 seconds. The other account pages (reset, confirm, two-factor) use the same layout.
- Time zone per person ([spec 0003](../spec/0003-user-time-zone.md), [ADR 0008](../decisions/0008-time-zone-per-person.md)): "today", "overdue", "next 7 days", project health and the dashboard's days follow the viewer's local day. It matches the device by default; Profile can pin any time zone from a searchable list.
- New look, part 5: settings. One card with vertical tabs (Profile, Security, Appearance, Team) and a sliding highlight. Profile shows a save bar while something is unsaved and deletes the account in place after the password. Security puts the three password fields in a row with a strength meter, and sets up two-factor in place with the recovery codes blurred until shown. Appearance picks the theme from small previews. Team has a role menu per member and invites by email with a role.
- Progress: each list shows a completion ring, the board shows task counts and overall progress, and project cards show open, due-this-week and overdue tasks.

### Changed

- Links and hints use icons instead of arrow characters: _All_ on the dashboard's Projects card and _All teams_ in the team settings end with an arrow icon, the board's fold hint shows the fold icon, and the notifications page's key hints and its project-to-list separator are icons.
- Docs brought up to date: README status, roadmap, the status and known limitations of spec 0001, and a workflow section in the docs index.
- People outside a team get 404 instead of 403 on its pages ([ADR 0006](../decisions/0006-not-found-for-non-members.md)).
- PHPUnit 13.
- Fonts: Inter and Plus Jakarta Sans replace Instrument Sans and are served by the app instead of Bunny Fonts.
- TypeScript 7, the native compiler. `tsconfig.json` now lists `node` under `types`, because TypeScript 6 and later no longer load every installed `@types` package by default.
- lucide-react 1.69. Every icon the app uses keeps its name.
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
