# Spec 0005: Activity history and comments

**Status:** Done · **Phase:** 2 · **Roadmap:** [Phase 2](../plan/roadmap.md#phase-2-collaboration-in-progress) · **Design:** [round 5](../design/README.md#how-it-was-chosen)

## Goal

Let a team talk about a task where the task is, and see what happened to it. One event log records what people do; the task sheet, the dashboard's _Activity_ card and (in the next spec) notifications all read from it.

## Data model

### `activities`

One row per thing that happened. Rows are never edited.

| Column       | Type                   | Notes                                                      |
| ------------ | ---------------------- | ---------------------------------------------------------- |
| `id`         | id                     |                                                            |
| `team_id`    | foreign key → teams    | cascade on delete; lets the dashboard read one team's feed |
| `project_id` | foreign key → projects | cascade on delete                                          |
| `task_id`    | foreign key → tasks    | optional, null on delete (see _Deleting a task_)           |
| `user_id`    | foreign key → users    | who did it; null on delete                                 |
| `type`       | string(40)             | one of the types below                                     |
| `properties` | json                   | what changed, as small values (ids and names, never text)  |
| `created_at` | timestamp              | indexed with `team_id` and with `task_id`                  |

### `comments`

| Column     | Type                | Notes                                             |
| ---------- | ------------------- | ------------------------------------------------- |
| `id`       | id                  |                                                   |
| `task_id`  | foreign key → tasks | cascade on delete                                 |
| `user_id`  | foreign key → users | the author; null on delete                        |
| `body`     | text                | required, plain text, up to 5,000 characters      |
| `mentions` | json                | ids of the team members mentioned, possibly empty |
| timestamps |                     | a comment is "edited" when `updated_at` is later  |

## Events

| Type                    | Recorded when                           | Properties                            |
| ----------------------- | --------------------------------------- | ------------------------------------- |
| `task.created`          | a task is added                         | task title, list name                 |
| `task.renamed`          | the title changes                       | old and new title                     |
| `task.described`        | the description changes                 | none (the text is not copied)         |
| `task.moved`            | the task goes to another list           | old and new list names                |
| `task.assigned`         | the assignee changes to someone         | the assignee's id and name            |
| `task.unassigned`       | the assignee is removed                 | the previous assignee's id and name   |
| `task.priority_changed` | the priority changes                    | old and new priority                  |
| `task.due_changed`      | the due date is set, changed or removed | old and new date (either can be null) |
| `task.completed`        | the task is marked complete             | none                                  |
| `task.reopened`         | the task is marked open again           | none                                  |
| `task.deleted`          | the task is deleted                     | task title                            |
| `comment.added`         | a comment is posted                     | the comment's id                      |

- Names are copied into `properties`, so the history still reads right after a list is renamed or a person leaves.
- Reordering inside the same list records nothing. A save that changes nothing records nothing. One save that changes several fields records one event per field.
- Unassigning because someone left the team ([spec 0004](0004-assignees-and-my-tasks.md#behaviour)) records `task.unassigned` with no actor.
- Editing or deleting a comment records nothing.
- **Deleting a task** deletes its comments. Its events stay with `task_id` empty, so the team feed can still say "deleted _Title_"; they no longer show in any task sheet.

## Comments

- Any team member can comment on a task of an active project. Archived projects are read-only: comments show, and nobody can add, edit or delete one.
- The author can edit and delete their own comment. Owners and admins can delete anyone's. An edited comment shows "edited".
- **Mentions:** typing `@` in the composer offers the team's members; picking one inserts `@Name` and records the id in `mentions`. Only current members of the task's team can be mentioned. Mentions matter for notifications in the next spec; in this one they are only highlighted.
- Plain text for now: line breaks are kept, links are not made clickable.

## Where it shows

- **Task sheet:** comments come first, oldest first, with a composer at the bottom. The changes between two comments fold into one pill ("2 changes · Giang · 6 Nov") that opens to show them. They are loaded when the sheet opens, not with the board.
- **Board card:** a comment count when the task has comments.
- **Dashboard, _Activity_:** the placeholder from [spec 0002](0002-interface-rebuild.md#dashboard) becomes the team's latest 10 events in its active projects, newest first and grouped by day (_Today_, _Yesterday_, then the date), each with who, what, the task (a link while it exists), the project and when. A comment shows its first line. A filter keeps _All_, _Comments_ or _Completed_. Times are relative; days follow the viewer's time zone ([spec 0003](0003-user-time-zone.md)).

## Permissions

| Action                                               | Owner | Admin | Member |
| ---------------------------------------------------- | :---: | :---: | :----: |
| See a task's history and comments, and the team feed |  ✅   |  ✅   |   ✅   |
| Add a comment                                        |  ✅   |  ✅   |   ✅   |
| Edit or delete one's own                             |  ✅   |  ✅   |   ✅   |
| Delete someone else's comment                        |  ✅   |  ✅   |   ❌   |

## Routes

Under `/{current_team}`:

- `GET tasks/{task}/activity`: the task's comments and events.
- `POST tasks/{task}/comments`, `PATCH comments/{comment}`, `DELETE comments/{comment}`.

## Out of scope

- Notifications for mentions and assignments (the next spec).
- Rich text, attachments and reactions.
- Events for projects and lists (created, renamed, archived). The log can take them later without a schema change.
- Undoing a change from the history.

## Decisions

1. **How comments and changes share the task sheet:** comments first with the changes folded between them; the dashboard card is grouped by day (the owner, wireframe round 5, 10 November).
2. **Mentions:** in this spec, so comments written before notifications ship already carry their mentions.
3. **History before this feature:** tasks created earlier have no events; the sheet says "History starts on _date_" instead of inventing them.

## Acceptance criteria

- Each event type above is recorded once when its change happens, with its properties, and not when nothing changed or a task only moved inside its list.
- A save that changes two fields records two events.
- A team member can add a comment; someone outside the team gets a 404; nobody can comment in an archived project.
- Only the author can edit a comment; the author, owners and admins can delete it; an edited comment is marked.
- Mentioning someone outside the team is a validation error.
- The task's activity lists its comments and events oldest first, and only that task's.
- The dashboard feed lists only the current team's active projects, newest first, at most 10.
- Deleting a task removes its comments and keeps a `task.deleted` event in the team feed.
- Every rule above has a feature test.
