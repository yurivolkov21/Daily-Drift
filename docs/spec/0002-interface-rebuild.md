# Spec 0002: Interface rebuild

**Status:** In progress (shell, Motion setting, projects page and board done) · **Phase:** 1 · **Roadmap:** [Phase 1](../plan/roadmap.md#phase-1-core-kanban-in-progress) · **Design:** [chosen design](../design/README.md) · **Decision:** [ADR 0007](../decisions/0007-floating-shell-with-motion.md)

## Goal

Rebuild the shell and the Phase 1 screens to the chosen design, and add the behaviour the new screens need. The data model, routes and permissions of [spec 0001](0001-projects-lists-tasks.md) stay as they are.

## Shell

- The sidebar folds to an icon rail with its button or Ctrl/⌘ + B. The state lives in the `sidebar_state` cookie, so it survives reloads and is known on the server before the first paint.
- _Recent_ keeps listing the five most recently updated active projects of the current team.
- **Motion setting:** `system` (default), `reduced` or `full`. It is stored like the theme (a cookie read on the server) and set as `data-motion` on `<html>`. With `reduced`, or `system` while the operating system asks for reduced motion, there are no entrance animations or count-ups and transitions are instant.

## Projects page

- **View:** `grid` (default) or `list`.
- **Sort:** `updated` (most recently updated first), `name` (A to Z), `progress` (least done first), `overdue` (most overdue tasks first, then most recently updated).
- **Filters:** health and color (any of the ten hues). "Assigned to me" waits for assignees in Phase 2.
- Tab, view, sort and filters are kept in the query string (`?status=archived&view=list&sort=name&health=attention&color=indigo,teal`), so a link reopens the same page. Unknown values fall back to the defaults. The last view is also kept in the `projects_view` cookie and used when the link has none.
- **Health** of an active project:
    - **Needs attention** when it has at least one open task past its due date, or when it has open tasks created more than 7 days ago and none was completed in the last 7 days. (Counting only tasks older than a week keeps a project that was just set up from being flagged.)
    - **On track** otherwise, including empty projects.
    - The list view shows the reason, for example "2 tasks overdue, oldest since 2 Nov".
- **List view** groups projects by health; each group collapses, and a switch turns grouping off.
- **Archived tab:** the same card and row in grey with an _Archived_ pill. _Restore_ and _Delete_ are in the card menu, with the permissions of spec 0001.

## Board

- **Folding:** any list folds to a narrow strip that shows its name and task count. Each person's folded lists are remembered per project in the browser.
- A folded list still accepts drops: the task goes to the end, the count bumps, and a toast offers _Show_ (unfolds the list) and _Undo_ (puts the task back in its old list and position).
- **Drop position:** while dragging, a slot opens where the task will land, within a list or across lists. The client sends the target list and index as in spec 0001.
- **Keyboard:** the kanban keyboard sensor stays. Alt + ↑/↓ also moves the focused task within its list, and Alt + ←/→ moves it to the next unfolded list.

## Dashboard

The numbers of spec 0001 stay. The chosen design adds:

- **This week:** of the tasks due this week (Monday to Sunday), the share that is completed. Shown as a ring in the greeting card.
- **Sparklines:** each stat card shows its value for each of the last 7 days, computed from `created_at`, `due_on` and `completed_at`. Deleted tasks are not counted.
- **Throughput:** tasks completed per day, with a 7-day or 14-day range.
- The _Activity_ card waits for comments and history in Phase 2.

## Sign in and sign up

Fortify's behaviour does not change. The new screens add:

- inline errors next to each field, with the first invalid field focused;
- a password strength meter on sign up and a match check on the confirmation;
- "Check your inbox" after sign up and after a reset request, with a resend button that waits 30 seconds between sends (Fortify still throttles the endpoint on the server).

Reset password, confirm password, two-factor challenge and verify email use the same layout.

## Settings

- One card with vertical tabs: Profile, Security, Appearance and Team. Each tab keeps its own URL from the starter kit.
- **Profile:** a save bar appears while a field differs from the saved value, with _Discard_ and _Save_. Deleting the account asks for the password, as today.
- **Security:** password change with a strength meter; two-factor setup with a QR code, a 6-digit code and recovery codes hidden until shown; passkeys as today.
- **Appearance:** theme (light, dark, match the device) and the Motion setting.
- **Team:** name, members with a role menu (Admin, Member, Remove; the owner's role is fixed), invitations by email with a role, and pending invitations that can be cancelled.

## Known limitations carried over

See [spec 0001](0001-projects-lists-tasks.md#known-limitations).

## Open questions

1. **Complete or move to Done.** In the board wireframe, _Mark complete_ also moved the card to _Done_. Spec 0001 keeps completion separate from the list. Until the owner decides, the spec 0001 rule stands.
2. **Which lists start folded.** The wireframe folds _Done_ by default, but lists have no "done" type; a rule is needed (for example, lists where every task is completed). Until then every list starts unfolded.

## Acceptance criteria

- The sidebar state survives a reload; Ctrl/⌘ + B toggles it.
- Projects view, sort and filters survive a reload through the query string.
- Health: a project with an overdue open task, or with week-old open tasks and no completion in 7 days, is _Needs attention_; any other project is _On track_.
- Sorting by `overdue` orders projects by their number of overdue open tasks.
- Dropping a task on a folded list stores it at the end of that list; _Undo_ restores the old list and index.
- This week's share and the sparkline values match the current team's tasks only.
- With reduced motion, pages render without entrance animations.
- Every screen works with the keyboard alone.
- Every rule above has a feature or browser test.
