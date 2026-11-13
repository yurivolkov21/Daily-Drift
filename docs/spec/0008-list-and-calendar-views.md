# Spec 0008: List and calendar views

**Status:** Planned · **Phase:** 2 · **Roadmap:** [Phase 2](../plan/roadmap.md#phase-2-collaboration-in-progress) · **Design:** wireframes in round 8

## Goal

Show a project's tasks in the shape a question needs. The board answers "what stage is each task in?"; a **list** answers "what is there, and what is next?" at a glance, and a **calendar** answers "what is due when?". All three show the same tasks, open the same task sheet and keep the same filters ([spec 0007](0007-labels-filters-search.md#board-filters)).

## Switching views

- The project's header card gets a view switch: _Board_, _List_, _Calendar_.
- The view lives in the query string (`?view=list`, `?view=calendar`; no value is the board), so a link opens the same view with its filters.
- The last view of each project is remembered in this browser and used when the link names none.
- The filter bar, the _New task_ button and the task sheet (`?task=`) work the same in every view.
- Nothing changes on the server: every view reads the tasks the board page already sends, and saves through the routes that exist.

## List view

- One table, grouped by list in the board's order. Each group shows the list's name, color and how many tasks it has, folds like a board list, and ends with _Add task_.
- **Columns:** a checkbox that completes the task, the title, labels (up to 3, then "+n"), the assignee, the due date (overdue and today stand out, in the viewer's day), the priority and the comment count.
- **Order inside a group:** the board's order, unless a column header is clicked to sort by title, due date or priority; clicking again reverses it. The sort lives in the query string (`?view=list&sort=due`) and applies inside every group.
- Clicking a row opens the task sheet. Arrow keys move between rows, Enter opens the task and Space ticks it.
- Rows cannot be dragged; reordering stays on the board.

## Calendar view

- A month grid, weeks starting on **Monday**, with today marked in the viewer's day ([spec 0003](0003-user-time-zone.md)).
- Each task with a due date sits on its day as a chip: priority, title, and a check when done. A day shows up to 3 chips, then "+2 more", which opens the whole day.
- **Navigating:** previous and next month, and _Today_. The month lives in the query string (`?view=calendar&month=2026-11`).
- **No due date:** a panel beside the grid lists the open tasks without a date.
- **Rescheduling:** dragging a chip to another day changes its due date; dragging a task from the _No due date_ panel onto a day gives it one. Both save at once through `PATCH tasks/{task}` and record `task.due_changed` ([spec 0005](0005-activity-and-comments.md#events)). Keyboard: a focused chip moves a day with Alt and the arrow keys.
- Clicking a chip opens the task sheet; clicking an empty day in a project you can edit offers _Add task_ with that due date, into the first list.
- **Phones:** the grid becomes an agenda: days with tasks, one under another, from the start of the month.

## Permissions

The same as for tasks ([spec 0001](0001-projects-lists-tasks.md#permissions)): every member can switch views, complete, reschedule and add tasks; archived projects are read-only in every view.

## Routes

None new. `GET projects/{project}` takes `view`, `sort` and `month` in the query string, read by the browser only.

## Out of scope

- A week or day calendar, and tasks spread over several days (tasks have one due date).
- A list or calendar of every project at once (_My tasks_ covers your own work across projects).
- Dragging rows in the list, bulk edits, and choosing columns.
- Saving a view as the team's default.

## Decisions

1. **Views are remembered per project, in this browser:** the last view a project was left in, as the projects page remembers its own view (the owner kept the proposal, 13 November).
2. **The list is grouped by list,** in the board's order, so it reads like the board (as above).
3. **Done tasks stay on the calendar,** faded and with a check, so a month shows what was finished (as above).

## Open questions

1. **Layout:** the view switch, the list's table and the calendar. Decided by wireframe round 8.

## Acceptance criteria

- The view switch shows the same tasks in each view, and the query string reopens the same view, sort and month.
- Filters from spec 0007 narrow the list and the calendar as they do the board.
- In the list, the checkbox completes a task, sorting by title, due date or priority works inside every group, and a row opens the task sheet.
- In the calendar, a task appears on its due date in the viewer's day; dragging it to another day saves the new date and records one `task.due_changed` event; dragging an undated task onto a day dates it.
- Archived projects allow no completing, rescheduling or adding in any view.
- The server tests cover rescheduling through `PATCH tasks/{task}`; the views themselves have a browser check.
