# Spec 0006: Notifications in the app

**Status:** Done · **Phase:** 2 · **Roadmap:** [Phase 2](../plan/roadmap.md#phase-2-collaboration-done) · **Design:** [round 6](../design/README.md#how-it-was-chosen)

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

Laravel's database notifications, so Phase 3 can add the mail channel to the same notification classes (`App\Notifications\TaskAssigned` and `MentionedInComment`). They are sent through a small channel that also writes `team_id`, at once and not queued, since Phase 2 has no queue worker.

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

`data` holds what the panel and the list on the notifications page need without another query, copied at the time it happened: the actor's id and name, the task's id and title, the project's id, name and color, and for a mention the comment's id and its first line (up to 120 characters). Copies keep a notification readable after a rename, and after the task or the actor is gone.

## Where it shows

### Bell and panel

- **Bell in the header bar**, next to the team's people, with a badge for the unread count of the current team (_9+_ above nine). The count is a shared prop, so it is fresh on every page load; there is no realtime and no polling.
- **Panel** (opens from the bell): two tabs, _Updates_ and _Due soon_, each with its count. The panel only says what happened; the details are on the page it leads to.
    - _Updates_: the latest 10 of the current team, newest first, one line each: the actor's avatar, a short sentence ("Minh An assigned you _Event log table_", "Thuy Linh mentioned you in _Case study draft_"), a relative time and a dot when unread. No project, no comment text.
    - _Due soon_: one line per task: the title and "due today" or "due tomorrow".
    - Footer: _View all_ under _Updates_, always shown, even with fewer than 10; _Open My tasks_ under _Due soon_.
- **Opening one** marks it as read, closes the panel and opens the task on its board (`projects/{project}?task={task}`). For a mention the sheet scrolls to the comment and highlights it. A notification whose task is gone says "deleted"; clicking it only marks it as read.
- **Mark all as read** clears the current team's unread updates.
- The panel's content is loaded when it opens, not with every page.

### Notifications page

`/{current_team}/notifications`, opened from _View all_. It is the place to look back and to see more than the panel says. The layout follows a mail app: a list on the left and the selected notification on the right.

- **Header:** the title, _Mark all as read_ and a filter: _All_, _Unread_, _Mentions_, _Assigned_ (`?filter=`).
- **List (about 40 % of the width), as a timeline:** grouped by day in the viewer's time zone (_Today_, _Yesterday_, then the date), with a line down the side and an icon for the kind. Each item has two lines: who, what and a relative time; the task's title and project. A mention adds the comment's first line. Unread items have a dot. It loads 30 at a time and more on scroll.
- **Detail (the rest):**
    - the full sentence and the exact time;
    - the task as it is now: project and list, assignee, due date, priority and whether it is done, with _Open task_;
    - for a mention, the whole comment with your name highlighted, and _Reply in task_ (the task sheet, scrolled to the comment);
    - _Recent on this task_: its last 5 events and comments, read from the task's activity ([spec 0005](0005-activity-and-comments.md#routes)).
    - A deleted task shows only the sentence and "This task was deleted". A task in an archived project shows a read-only note and no _Reply in task_.
    - With nothing selected the pane asks you to pick one.
- **Selecting** one marks it as read and puts it in the URL (`?n={id}`), so reloading, a shared link and the Back button keep it. ↑ and ↓ move through the list; Enter opens the task. Under _Unread_, one you open stays in the list until the filter changes or the page reloads, so it does not vanish while you read it.
- The divider between the panes can be dragged.
- **Narrow screens** (under 768 px): one column. Selecting opens the detail full width with a _Back_ button.

## Teams

- A notification belongs to the team where it happened. The bell and the panel show the current team only; switching teams switches the list.
- After leaving a team, its notifications no longer show; they are not deleted.

## Permissions

People only ever see and mark their own notifications. Marking someone else's notification is a 404.

## Routes

Under `/{current_team}`:

- `GET notifications`: the notifications page (`?filter=`, `?n=`). The selected one's detail loads as a partial reload; the list uses Inertia's infinite scroll with a cursor.
- `GET notifications/recent`: _Due soon_ and the latest 10 updates for the panel, as JSON.
- `PATCH notifications/{notification}/read`
- `POST notifications/read-all`

## Out of scope

- Email and push notifications (Phase 3).
- Realtime updates and polling.
- Settings to mute a kind or a project.
- Notifications for comments on your tasks, completed tasks you created, or invitations (invitations already show on the dashboard).
- Deleting old notifications; without a scheduler they are kept.
- Marking a notification as unread, archiving or deleting one.
- Remembering where the divider on the notifications page was dragged.

## Decisions

1. **The panel:** two tabs, _Updates_ and _Due soon_, with one line per item; clicking leads to the related page instead of showing details in the panel (the owner, wireframe round 6, 12 November).
2. **How much the panel holds:** the latest 10 updates, with _View all_ always shown, leading to a notifications page laid out like a mail app, with a timeline list and a detail pane (the owner, 12 November; the page's wireframes for desktop and phone were approved the same day). The page's layout follows the Mail example from earlier shadcn/ui releases, rebuilt with this project's components.
3. **Tomorrow in _Due soon_:** today and tomorrow, so a task due first thing in the morning is seen the day before (proposed in this spec; the owner kept it when the build started, 12 November).
4. **A mention in a task assigned to you:** one _Mentioned_ notification, no extra one for the assignee (as above).

## Acceptance criteria

- Assigning a task to someone else stores one _Assigned_ notification for them in the task's team; assigning yourself or unassigning stores none.
- A comment that mentions two teammates and yourself stores one _Mentioned_ notification for each teammate; editing it to add a third notifies only the third.
- _Due soon_ lists your open tasks due today or tomorrow in your time zone, in the current team's active projects, and nothing else.
- The unread count, the panel and the notifications page cover the current team only.
- The panel returns at most 10 updates, newest first.
- The notifications page lists the current team's notifications newest first, 30 at a time; _Unread_, _Mentions_ and _Assigned_ keep only those.
- Selecting a notification on the page marks it as read; `?n=` with someone else's notification is a 404.
- Marking one as read sets `read_at`; marking someone else's is a 404; _Mark all as read_ clears only the current team's.
- A notification about a deleted task still shows its title, with no link to open it.
- Every rule above has a feature test.
