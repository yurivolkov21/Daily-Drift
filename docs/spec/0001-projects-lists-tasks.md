# Spec 0001: Projects, lists and tasks

**Status:** Done · **Phase:** 1 · **Roadmap:** [Phase 1](../plan/roadmap.md#phase-1-core-kanban-done) · **Design:** [Phase 1 screens](../design/README.md#screens-for-phase-1)

## Goal

Give every team a Trello-style board: projects hold lists (Kanban columns), lists hold tasks (cards), and tasks can be dragged within a list or to another list.

## Data model

All records belong to a team through their project, so team membership controls access.

### `projects`

| Column        | Type                | Notes                                    |
| ------------- | ------------------- | ---------------------------------------- |
| `id`          | id                  |                                          |
| `team_id`     | foreign key → teams | cascade on delete                        |
| `created_by`  | foreign key → users | null on delete                           |
| `name`        | string(120)         | required                                 |
| `description` | text                | optional                                 |
| `color`       | string(20)          | one of a fixed palette, used on the card |
| `archived_at` | timestamp           | null = active                            |
| timestamps    |                     |                                          |

### `task_lists`

Named `task_lists` because `list` is a reserved word in PHP.

| Column       | Type                   | Notes                       |
| ------------ | ---------------------- | --------------------------- |
| `id`         | id                     |                             |
| `project_id` | foreign key → projects | cascade on delete           |
| `name`       | string(80)             | required                    |
| `color`      | string(20)             | same palette as projects    |
| `position`   | unsigned integer       | 0-based order of the column |
| timestamps   |                        |                             |

### `tasks`

| Column         | Type                     | Notes                                                          |
| -------------- | ------------------------ | -------------------------------------------------------------- |
| `id`           | id                       |                                                                |
| `project_id`   | foreign key → projects   | cascade on delete; kept with the list for fast project queries |
| `task_list_id` | foreign key → task_lists | cascade on delete                                              |
| `created_by`   | foreign key → users      | null on delete                                                 |
| `title`        | string(255)              | required                                                       |
| `description`  | text                     | optional, plain text for now                                   |
| `priority`     | enum                     | `none` (default), `low`, `medium`, `high`, `urgent`            |
| `due_on`       | date                     | optional                                                       |
| `completed_at` | timestamp                | null = open                                                    |
| `position`     | unsigned integer         | 0-based order inside its list                                  |
| timestamps     |                          |                                                                |

## Behaviour

- **New project:** starts with three lists: _To do_ (slate), _In progress_ (amber), _Done_ (green). A list added later takes the next unused color; the list menu can change it.
- **Ordering:** positions are dense and 0-based. When a list or task moves, the server receives the target list and target index, then rewrites the positions of the affected list(s) inside one database transaction. The client never sends positions for other items.
- **Moving tasks:** a task can move to any list in the same project, never to another project.
- **Completing:** completion is a checkbox (`completed_at`) and does not depend on the list. Moving a card to _Done_ does not complete it automatically in this phase. [Spec 0010](0010-checklists-attachments-recurring-tasks.md#completing-moves-a-task-to-done) changes this: completing moves the card to the project's _Done_ list, and moving it there completes it.
- **Archiving:** archived projects are read-only and hidden from the main list; they can be restored.
- **Deleting a list** deletes its tasks; the UI asks for confirmation and shows the task count.
- **Progress:** list and project progress = completed tasks ÷ all tasks, shown as a percentage. Empty means 0%.
- **Dashboard:** for the current team:
    - counts of open tasks, tasks due today, overdue tasks, and tasks completed in the last 7 days compared with the 7 days before;
    - open tasks with a due date, grouped as overdue, today and the next 7 days;
    - tasks completed per day over the last 14 days (from `completed_at`);
    - active projects with their progress and the number of tasks in each list.
    - The chosen design adds this week's share of tasks done, 7-day sparklines and a 7 or 14 day range; see [spec 0002](0002-interface-rebuild.md#dashboard).

## Permissions

Based on the starter kit's team roles (`owner`, `admin`, `member`).

| Action                                        | Owner | Admin | Member |
| --------------------------------------------- | :---: | :---: | :----: |
| View projects, lists and tasks of the team    |  ✅   |  ✅   |   ✅   |
| Create, edit, archive and restore projects    |  ✅   |  ✅   |   ❌   |
| Delete projects                               |  ✅   |  ❌   |   ❌   |
| Create, rename, reorder and delete lists      |  ✅   |  ✅   |   ✅   |
| Create, edit, move, complete and delete tasks |  ✅   |  ✅   |   ✅   |

Users who are not members of the team get a 404 for every project route, so team names and ids are not revealed.

## Routes

Under the starter kit's team prefix `/{current_team}`:

- `GET projects`, `POST projects`, `GET projects/{project}`, `PATCH projects/{project}`, `DELETE projects/{project}`
- `POST projects/{project}/archive`, `DELETE projects/{project}/archive`
- `POST projects/{project}/lists`, `PATCH lists/{list}` (name and color), `PATCH lists/{list}/move`, `DELETE lists/{list}`
- `POST lists/{list}/tasks`, `PATCH tasks/{task}`, `PATCH tasks/{task}/move`, `PATCH tasks/{task}/complete`, `DELETE tasks/{task}`

## Acceptance criteria

- A member sees only projects of teams they belong to; other teams' projects return 404.
- Creating a project creates the three default lists with their default colors.
- Dragging a task to position _n_ of another list stores the new list and leaves both lists with dense positions 0…k.
- Members cannot create, edit, archive or delete projects; admins cannot delete projects.
- Progress percentages match the share of completed tasks.
- Dashboard counts and the completed-per-day series match the tasks of the current team only.
- Every rule above has a feature test.

## Known limitations

- **Time zone.** ~~"Today", "overdue" and "due in the next 7 days" use the app's time zone, which is UTC.~~ Resolved by [spec 0003](0003-user-time-zone.md): they follow each person's time zone.
- **Keyboard moves.** Moving a card with the keyboard jumps to the nearest drop target in the arrow's direction, which is not always the next position in the list.

## Out of scope for this spec

Assignees, labels, comments, notifications and other views come in Phase 2.
