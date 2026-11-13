# Spec 0008: List and calendar views

**Status:** Done · **Phase:** 2 · **Roadmap:** [Phase 2](../plan/roadmap.md#phase-2-collaboration-done) · **Design:** [wireframe round 8](../design/README.md#list-and-calendar-views)

## Goal

Show a project's tasks in the shape a question needs. The board answers "what stage is each task in?"; a **list** answers "what is there, and what is next?" at a glance, and a **calendar** answers "what is due when?". All three show the same tasks, open the same task sheet and keep the same filters ([spec 0007](0007-labels-filters-search.md#board-filters)).

## Switching views

- The filter row of the project's header card starts with a segmented control: _Board_, _List_, _Calendar_, each with an icon. A white thumb slides under the current view; the arrow keys move between views. A divider separates it from the filters.
- The view lives in the query string (`?view=list`, `?view=calendar`; no value is the board), so a link opens the same view with its filters.
- The last view of each project is remembered in this browser and used when the link names none.
- The filter bar, the _New task_ button and the task sheet (`?task=`) work the same in every view.
- Nothing changes on the server: every view reads the tasks the board page already sends, and saves through the routes that exist.

## List view

- **Groups:** one section per list, in the board's order, tinted with the list's color as its board column is. A section's header has a fold button, the list's color and name, how many tasks it holds ("3 of 8" while filters are on) and a _+_ button that adds a task to it. Each section ends with a dashed _Add task_ button; the form adds the task to that list and stays open for the next one.
- **Header row:** one bar above the sections: _Task_, _Due date_ and _Priority_, which sort, and the assignee.
- **Rows** are white cards with two lines:
    - a checkbox that completes the task; done tasks stay, faded and struck through;
    - the title, and under it the labels (up to 3, then "+n") and the comment count;
    - the due date with a calendar icon (overdue and today stand out, in the viewer's day; "No date" when there is none);
    - the priority as a pill with a colored dot;
    - the assignee's avatar, or a dashed circle when unassigned.
- **Order inside a section:** the board's order. Clicking _Task_, _Due date_ or _Priority_ sorts by it inside every section; a second click reverses it and a third goes back to the board's order. The sort lives in the query string (`?view=list&sort=due`, `sort=-due` when reversed); undated tasks stay last.
- Clicking a row opens the task sheet. Up and down arrows move between rows, Enter opens the task and Space ticks it.
- Rows cannot be dragged; reordering stays on the board.

## Calendar view

- **Side panel**, shown by default and folded with a button beside the month's name:
    - a mini month with a dot under each day that has open tasks; clicking a day goes to its month and marks the day in the grid;
    - _Lists_, a checkbox per list with how many of its tasks fall in the month; unticking hides that list from the calendar only (the board and the list view still show it);
    - _No due date_: the open tasks without a date, which can be dragged onto a day.
- **Toolbar:** the panel button, the month's name, a one-line hint about dragging, then previous month, _Today_ and next month. The month lives in the query string (`?view=calendar&month=2026-11`).
- **Grid:** a month, weeks starting on **Monday**. Today's date is filled in the viewer's day ([spec 0003](0003-user-time-zone.md)); a day with an open overdue task shows its date in red; weekends and days of other months are shaded.
- **Chips:** each task with a due date sits on its day, tinted with its list's color, with a dot, the title and the assignee's avatar. Done tasks stay, faded, struck through and with a check. A day shows up to three lines: three chips, or two chips and "+n more", which opens the whole day.
- **Rescheduling:** dragging a chip to another day changes its due date; dragging a task from _No due date_ onto a day gives it one. Both save at once through `PATCH tasks/{task}` and record `task.due_changed` ([spec 0005](0005-activity-and-comments.md#events)). Keyboard: a focused chip moves a day with Alt and Left or Right, a week with Alt and Up or Down.
- Clicking a chip opens the task sheet; clicking an empty part of a day, or its _+_ button, in a project you can edit offers _Add task_ with that due date, into the first list.
- The panel's state and the hidden lists are remembered in this browser, per project, like the view.

## Phones

- The view switch spans the width under the project's name.
- **List:** sections stay; each row shows the title and, under it, the due date and the priority, with the avatar on the right.
- **Calendar:** the grid becomes an agenda: the days of the month that have tasks, one under another, scrolled to today, with "Today" and "Overdue" marked, and _No due date_ at the end. Dragging is not offered: tapping a task opens a bottom sheet whose due date row has _Today_, _Tomorrow_, next Monday and _No date_, which save as a drag does.
- **Board:** unchanged.

## Permissions

The same as for tasks ([spec 0001](0001-projects-lists-tasks.md#permissions)): every member can switch views, complete, reschedule and add tasks; archived projects are read-only in every view.

## Routes

None new. `GET projects/{project}` takes `view`, `sort` and `month` in the query string, read by the browser only. `POST lists/{list}/tasks` takes an optional `due_on`, so a task added on a day of the calendar starts with that date (adding records `task.created` only).

## Out of scope

- A week or day calendar, and tasks spread over several days (tasks have one due date).
- A list or calendar of every project at once (_My tasks_ covers your own work across projects).
- Dragging rows in the list, editing a row's fields in place, bulk edits and choosing columns.
- Saving a view as the team's default.

## Decisions

1. **Views are remembered per project, in this browser:** the last view a project was left in, as the projects page remembers its own view (the owner kept the proposal, 13 November).
2. **The list is grouped by list,** in the board's order, so it reads like the board (as above).
3. **Done tasks stay on the calendar,** faded and with a check, so a month shows what was finished (as above).
4. **Layout** (the owner, wireframe round 8, 13 November): the view switch is a segmented control at the start of the filter row; the list has two-line rows in tinted sections; the calendar has a side panel with a mini month, the lists and _No due date_. Lists can be hidden from the calendar, and a third click on a column header restores the board's order.

## Acceptance criteria

- The view switch shows the same tasks in each view, and the query string reopens the same view, sort and month.
- Filters from spec 0007 narrow the list and the calendar as they do the board.
- In the list, the checkbox completes a task, sorting by title, due date or priority works inside every section (ascending, descending, then the board's order), and a row opens the task sheet.
- In the calendar, a task appears on its due date in the viewer's day; dragging it to another day saves the new date and records one `task.due_changed` event; dragging an undated task onto a day dates it; unticking a list hides its tasks from the calendar only.
- On a phone, the agenda lists the month's days with tasks, and the bottom sheet's date buttons change the due date.
- Archived projects allow no completing, rescheduling or adding in any view.
- The server tests cover rescheduling through `PATCH tasks/{task}`; the views themselves have a browser check.
