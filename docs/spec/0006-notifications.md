# Spec 0006: Notifications in the app

**Status:** Planned · **Phase:** 2 · **Roadmap:** [Phase 2](../plan/roadmap.md#phase-2-collaboration-in-progress) · **Design:** wireframes in round 6

## Goal

Tell people when something needs them: a task was assigned to them, someone mentioned them in a comment, or one of their tasks is due soon. Everything shows in the app; email waits for Phase 3, where the queue worker arrives.

## Kinds

| Kind          | When                                                                  | Stored |
| ------------- | --------------------------------------------------------------------- | :----: |
| **Assigned**  | someone else assigns a task to you                                    |   ✅   |
| **Mentioned** | someone else mentions you in a comment                                |   ✅   |
| **Due soon**  | an open task assigned to you is due today or tomorrow in your own day |   ❌   |

- Assigning a task to yourself, or mentioning yourself, sends nothing. Unassigning sends nothing.
- Editing a comment notifies only the people it newly mentions; people already notified are not notified again.
- **Due soon** is worked out when the panel opens, from your open tasks ([spec 0003](0003-user-time-zone.md) for "today"). It is not stored, cannot be marked as read, and disappears when the task is completed, moved to a later date or unassigned. Overdue tasks are not repeated here; _My tasks_ and the dashboard already show them.

## Data model

Laravel's database notifications (`php artisan make:notifications-table`), so Phase 3 can add the mail channel to the same notification classes.

### `notifications`

| Column            | Type      | Notes                                                     |
| ----------------- | --------- | --------------------------------------------------------- |
| `id`              | uuid      |                                                           |
| `type`            | string    | the notification class                                    |
| `notifiable_type` | string    | always a user                                             |
| `notifiable_id`   | integer   | the recipient                                             |
| `team_id`         | integer   | new column, indexed with the recipient; cascade on delete |
| `data`            | json      | see below                                                 |
| `read_at`         | timestamp | null = unread                                             |
| timestamps        |           |                                                           |

`data` holds what the panel needs without another query, copied at the time it happened: the actor's id and name, the task's id and title, the project's id, name and color, and for a mention the comment's id and its first line (up to 120 characters). Copies keep a notification readable after a rename, and after the task or the actor is gone.

## Where it shows

- **Bell in the header bar**, next to the team's people, with a badge for the unread count of the current team. The count is a shared prop, so it is fresh on every page load; there is no realtime and no polling.
- **Panel** (opens from the bell): _Due soon_ first, then _Updates_ newest first (the latest 30 of the current team), each with the actor's avatar, a sentence ("Minh An assigned you _Event log table_", "Thuy Linh mentioned you in _Event log table_" with the comment's first line), the project and a relative time. Unread updates have a dot. How the two parts share the panel is the choice of wireframe round 6.
- **Opening one** marks it as read and opens the task on its board (`projects/{project}?task={task}`), scrolled to the comment for a mention. A notification whose task is gone shows the title without a link.
- **Mark all as read** clears the current team's unread updates.
- The panel's content is loaded when it opens, not with every page.

## Teams

- A notification belongs to the team where it happened. The bell and the panel show the current team only; switching teams switches the list.
- After leaving a team, its notifications no longer show; they are not deleted.

## Permissions

People only ever see and mark their own notifications. Marking someone else's notification is a 404.

## Routes

Under `/{current_team}`:

- `GET notifications`: _Due soon_ and the latest updates, as JSON.
- `PATCH notifications/{notification}/read`
- `POST notifications/read-all`

## Out of scope

- Email and push notifications (Phase 3).
- Realtime updates and polling.
- Settings to mute a kind or a project.
- Notifications for comments on your tasks, completed tasks you created, or invitations (invitations already show on the dashboard).
- Deleting old notifications; without a scheduler they are kept.

## Open questions

1. **How _Due soon_ and _Updates_ share the panel.** Decided by wireframe round 6.
2. **Tomorrow in _Due soon_.** Proposed: today and tomorrow, so a task due first thing in the morning is seen the day before.
3. **A mention in a task assigned to you.** Proposed: one _Mentioned_ notification, no extra one for the assignee.

## Acceptance criteria

- Assigning a task to someone else stores one _Assigned_ notification for them in the task's team; assigning yourself or unassigning stores none.
- A comment that mentions two teammates and yourself stores one _Mentioned_ notification for each teammate; editing it to add a third notifies only the third.
- _Due soon_ lists your open tasks due today or tomorrow in your time zone, in the current team's active projects, and nothing else.
- The unread count and the panel cover the current team only.
- Marking one as read sets `read_at`; marking someone else's is a 404; _Mark all as read_ clears only the current team's.
- A notification about a deleted task still shows its title.
- Every rule above has a feature test.
