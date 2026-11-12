# Spec 0007: Labels, filters and search

**Status:** Planned · **Phase:** 2 · **Roadmap:** [Phase 2](../plan/roadmap.md#phase-2-collaboration-in-progress) · **Design:** wireframes in round 7

## Goal

Help a team find work once there is a lot of it. Labels say what kind of work a task is, filters narrow a board to what matters right now, and a search box (⌘K) jumps to any task or project in the team.

## Data model

### `labels`

| Column     | Type                | Notes                                           |
| ---------- | ------------------- | ----------------------------------------------- |
| `id`       | id                  |                                                 |
| `team_id`  | foreign key → teams | cascade on delete                               |
| `name`     | string(24)          | required; unique in the team, ignoring case     |
| `color`    | string              | one of the ten hues used for projects and lists |
| timestamps |                     |                                                 |

### `label_task`

| Column       | Type                 | Notes             |
| ------------ | -------------------- | ----------------- |
| `label_id`   | foreign key → labels | cascade on delete |
| `task_id`    | foreign key → tasks  | cascade on delete |
| `created_at` | timestamp            |                   |

The pair is the primary key. Labels belong to the **team**, so one set serves every project, the board filters and search.

## Labels

- **Applying:** the task sheet gets a _Labels_ row under _Assignee_. It opens a menu with a search field and a checkbox per label, so several can be ticked; each tick saves at once. A task has **up to 5 labels**, which keeps cards readable.
- **Creating:** when the search field matches no label, the menu offers _Create "Bug"_. The new label takes the first hue no label of the team uses yet, then cycles.
- **Board card:** up to 3 label chips (a colored dot and the name) under the title, then "+2".
- **Managing:** the team's settings page gets a _Labels_ section: each label with its color, how many tasks use it, and _Rename_, _Recolor_ and _Delete_. Deleting asks first and takes the label off every task.
- A new team has no labels. The demo seeder adds a few (_Bug_, _Feature_, _Design_, _Docs_).
- Archived projects stay read-only: their labels show but cannot be changed.
- **History:** adding and removing a label record `task.labeled` and `task.unlabeled` in the event log ([spec 0005](0005-activity-and-comments.md#events)), with a copy of the label's name and color. Renaming, recoloring or deleting a label records nothing on the tasks.

## Board filters

- A filter bar above the board, in the project's header card:
    - **Text:** cards whose title contains the words typed.
    - **Labels:** any of the chosen labels.
    - **Assignee:** _Me_, a member or _Unassigned_.
    - **Due:** _Overdue_, _Today_, _Next 7 days_ or _No due date_, in the viewer's day ([spec 0003](0003-user-time-zone.md)).
    - **Priority:** any of the chosen priorities.
- Choices inside one filter widen the result (any of them); different filters narrow it (all of them).
- Filters live in the query string (`?q=export&labels=3,7&assignee=me&due=overdue&priority=high,urgent`), so a link opens the same view. Unknown values are ignored.
- The board already holds every task, so filtering happens in the browser: no request, no reload.
- While filters are on, each list header shows "3 of 8", a list with no match says so, and the bar has _Clear filters_.
- Cards can still be dragged. A dropped card lands right after the visible card above it, so hidden cards keep their order.

## Search (⌘K)

- **Opening:** ⌘K on a Mac or Ctrl+K elsewhere, from any team page, or the _Search_ button in the header bar. Esc closes it.
- **Before typing:** _Recent_ (the last 5 tasks and projects opened in this browser for this team) and _Go to_ (Dashboard, My tasks, Projects, Notifications, Team settings).
- **Typing:** from 2 characters, after a short pause, the current team is searched:
    - **Tasks** (up to 8): the title, the description and the names of the task's labels.
    - **Projects** (up to 5): the name and the description.
- **Order:** a title that starts with the words, then one that contains them, then a label match, then the description. Open tasks come before completed ones, active projects before archived ones, then the most recently updated.
- **Each task result:** the title with the match highlighted, the project and list, its labels, the assignee's avatar, and a _Done_ or _Archived_ tag when it applies. Enter opens the task on its board (`projects/{project}?task={task}`); a project result opens its board.
- ↑ and ↓ move, Enter opens. Matching ignores case. Accents count (a search for "tim" does not find "tìm") until accent folding comes with PostgreSQL in Phase 3.

## Permissions

| Action                            | Owner | Admin | Member |
| --------------------------------- | :---: | :---: | :----: |
| Apply and remove labels on tasks  |  ✅   |  ✅   |   ✅   |
| Create a label                    |  ✅   |  ✅   |   ✅   |
| Rename, recolor or delete a label |  ✅   |  ✅   |   ❌   |
| Filter a board, search the team   |  ✅   |  ✅   |   ✅   |

## Routes

Under `/{current_team}`:

- `POST labels`, `PATCH labels/{label}`, `DELETE labels/{label}`.
- `PUT tasks/{task}/labels`: the task's whole set of label ids.
- `GET search?q=`: tasks and projects, as JSON.
- `GET projects/{project}` also sends the team's labels, and each task's label ids.

## Out of scope

- Labels per project, or labels shared between teams.
- Label filters on _My tasks_ and the dashboard.
- Saved filters, and filters kept between visits without the link.
- Searching comments, and search syntax such as `label:bug` or `is:done`.
- Accent-insensitive search (with PostgreSQL in Phase 3).

## Decisions

1. **Labels per team:** the same _Bug_ works on every board, in filters and in search (the owner kept the proposal, 12 November).
2. **Who manages labels:** everyone creates and applies them, as with assignees; owners and admins rename, recolor and delete, since that changes every project (as above).
3. **Up to 5 labels per task** (as above).

## Open questions

1. **Layout:** the label menu and the card chips, the filter bar, and the ⌘K box. Decided by wireframe round 7.

## Acceptance criteria

- A member can create a label; a second label with the same name in any case fails validation; a member cannot rename, recolor or delete one, an owner or admin can.
- Deleting a label takes it off every task of the team.
- A task takes up to 5 labels, only from its own team; a sixth or another team's label fails validation; archived projects refuse changes.
- Adding and removing a label each record one event with the label's name and color.
- The board page sends the team's labels and each task's label ids.
- Search finds tasks by title, description and label name, and projects by name, in the current team only, in the order above; one character returns nothing.
- Someone outside the team gets a 404 from every route above.
- Every rule above has a feature test; filtering on the board has a browser check.
