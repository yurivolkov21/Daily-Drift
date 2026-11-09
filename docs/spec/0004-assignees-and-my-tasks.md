# Spec 0004: Assignees and My tasks

**Status:** Planned · **Phase:** 2 · **Roadmap:** [Phase 2](../plan/roadmap.md#phase-2-collaboration-planned) · **Design:** wireframes to come (round 4)

## Goal

Let a team say who does what, and give each person one page with their own work. The page also covers the roadmap's "Today" view: it opens on what needs attention today.

## Data model

### `tasks` (new column)

| Column        | Type                | Notes                                                 |
| ------------- | ------------------- | ----------------------------------------------------- |
| `assignee_id` | foreign key → users | optional, null on delete; indexed with `completed_at` |

A task has **one assignee or none**. One owner per task keeps _My tasks_, filters and notifications unambiguous. Several assignees per task would need a separate table and is out of scope.

## Behaviour

- **Assigning:** the task sheet gets an _Assignee_ field listing the team's members with their initials avatar, with _Assign to me_ first and _Unassigned_ last. Every team member can assign or unassign any task, as with editing tasks ([spec 0001](0001-projects-lists-tasks.md#permissions)). Archived projects stay read-only.
- **Who can be assigned:** only members of the project's team. Anyone else is a validation error.
- **Leaving a team:** when someone leaves or is removed from a team, their tasks in that team's projects become unassigned. Deleting an account unassigns through the foreign key.
- **New tasks** start unassigned.
- **Task card:** shows the assignee's avatar. An unassigned task shows no avatar. The creator's avatar from Phase 1 moves into the task sheet as "Created by …".

## My tasks

- **Route and navigation:** `GET /{current_team}/my-tasks`, the _My tasks_ item already planned in the sidebar, with the number of the viewer's open tasks.
- **Content:** open tasks assigned to the viewer in the current team's active projects, in groups: _Overdue_, _Today_, _Next 7 days_, _Later_ and _No due date_. Days are the viewer's own ([spec 0003](0003-user-time-zone.md)). Empty groups are hidden; with nothing assigned, the page explains how tasks get there.
- **Order inside a group:** due date, then priority (urgent first), then the task's position.
- **Each row:** a checkbox that completes the task, the title, the project and list, the priority and the due label. Clicking the row opens the task on its board (`projects/{project}?task={task}`).
- **Done lately:** tasks assigned to the viewer and completed in the last 7 days, in a group folded by default.
- **Filter:** by project, as chips; kept in the query string (`?project=12`).

## Changes to existing screens

- **Dashboard, _My focus_:** shows open tasks assigned to the viewer **and** unassigned tasks. In Phase 1 it showed every task of the team. Keeping unassigned tasks means a solo user, who never assigns anything, still sees a full _My focus_. The stat cards and _Due today_ stay team-wide.
- **Projects page:** the _Assigned to me_ filter that [spec 0002](0002-interface-rebuild.md#projects-page) left for Phase 2 keeps projects with at least one open task assigned to the viewer.

## Permissions

| Action                    | Owner | Admin | Member |
| ------------------------- | :---: | :---: | :----: |
| Assign and unassign tasks |  ✅   |  ✅   |   ✅   |
| See _My tasks_            |  ✅   |  ✅   |   ✅   |

## Routes

- `PATCH tasks/{task}` also takes `assignee_id` (a member's id, or null).
- `GET my-tasks` under `/{current_team}`.

## Out of scope

- Several assignees per task.
- Notifications on assignment (the notifications spec).
- An _Assigned to me_ filter on the board (the labels and filters spec).

## Open questions

1. **Unassigned tasks in _My focus_.** Proposed: yes, as above. The alternative is assigned tasks only, which leaves _My focus_ empty for people who never assign.
2. **Unassigned tasks on _My tasks_.** Proposed: no; the page is only what is yours.

## Acceptance criteria

- A task can be assigned to a member of its team and unassigned again; assigning someone outside the team fails validation.
- When a member leaves or is removed from a team, their tasks in that team become unassigned.
- _My tasks_ lists only open tasks assigned to the viewer in the current team's active projects, grouped by the viewer's day and ordered as above.
- The project filter on _My tasks_ survives a reload through the query string.
- _My focus_ lists tasks assigned to the viewer and unassigned tasks, and no task assigned to someone else.
- The projects page's _Assigned to me_ filter keeps only projects with an open task assigned to the viewer.
- Every rule above has a feature test.
