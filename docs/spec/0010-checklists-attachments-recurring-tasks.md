# Spec 0010: Checklists, attachments and recurring tasks

**Status:** Planned · **Phase:** 3 · **Roadmap:** [Phase 3](../plan/roadmap.md#phase-3-advanced-in-progress) · **Design:** round 10 (to come)

## Goal

Give a task what a real piece of work needs:

- a **checklist** of small steps;
- **files**, such as a screenshot, a brief or a spreadsheet;
- a **repeat rule** for work that comes back every week or month.

The checklist also prepares the AI helpers: _split a task into subtasks_ writes its steps into it.

## Data model

### `checklist_items`

| Column         | Type                | Notes                                    |
| -------------- | ------------------- | ---------------------------------------- |
| `id`           | id                  |                                          |
| `task_id`      | foreign key → tasks | cascade on delete                        |
| `body`         | string(300)         | required, plain text                     |
| `position`     | unsigned integer    | order inside the task, from 0            |
| `completed_at` | timestamp           | null while open                          |
| `completed_by` | foreign key → users | who checked it; null on delete           |
| timestamps     |                     | a change counts as an update of the task |

- One checklist per task, at most 50 items.

### `attachments`

| Column      | Type                | Notes                                                      |
| ----------- | ------------------- | ---------------------------------------------------------- |
| `id`        | id                  |                                                            |
| `task_id`   | foreign key → tasks | cascade on delete                                          |
| `user_id`   | foreign key → users | who uploaded it; null on delete                            |
| `name`      | string(255)         | the file name as uploaded, shown and used when downloading |
| `path`      | string              | where the file is stored, under a random name              |
| `mime_type` | string(100)         | read from the file's content, not from its name            |
| `size`      | unsigned integer    | bytes                                                      |
| timestamps  |                     |                                                            |

- At most 20 files per task, each up to 10 MB.

### `tasks`

| Column             | Type                | Notes                                                                                                            |
| ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `repeat_unit`      | string(10)          | `day`, `weekday`, `week`, `month` or `year`; null when the task does not repeat                                  |
| `repeat_every`     | unsigned tinyint    | 1 to 30; always 1 for `weekday`; null when the task does not repeat                                              |
| `repeat_anchor`    | date                | the due date when the rule or the due date was last set by hand; keeps "the 31st" for monthly and yearly repeats |
| `repeated_from_id` | foreign key → tasks | the occurrence this task was created from; null on delete; unique                                                |

## Checklists

- The task sheet has a _Checklist_ block under the description:
    - progress such as "2 of 5" with a thin bar;
    - one row per item: a checkbox and the text, edited in place;
    - an _Add an item_ field. Enter adds the item and keeps the field open for the next one; pasting several lines adds one item per line.
- Items are reordered by dragging, or with Alt and an arrow key, as cards are on the board.
- An item is deleted from its row's menu, with _Undo_ in a toast.
- _Hide checked items_ folds the done items into one line. The choice is remembered in the browser.
- Checking every item does not complete the task. Checklists and completion stay separate, as lists and completion do ([spec 0001](0001-projects-lists-tasks.md#behaviour)).
- Board cards and list rows show "2/5" with a checklist icon when the task has items.

## Attachments

- The task sheet has an _Attachments_ block under the checklist, with an _Attach files_ button. Files can also be dropped anywhere on the sheet. Each file uploads on its own, with a progress bar.
- **Accepted files:**
    - images (PNG, JPEG, GIF, WebP);
    - PDF;
    - text (TXT, CSV, Markdown);
    - Office documents (Word, Excel, PowerPoint);
    - ZIP.
- **Refused files:** anything else, including SVG and HTML, because they can run scripts when opened. A refused file says why on its own row ("Larger than 10 MB", "This type of file can't be attached"). The other files still upload.
- Each file shows:
    - a thumbnail (images) or an icon for its type;
    - its name and size;
    - who added it, and when.
- Clicking an image opens it in a new tab. Other files download under their original name.
- A file is deleted from its menu, after a confirmation (deleting a file cannot be undone).
- Board cards and list rows show a paperclip with the count when the task has files.

### Storage and safety

- Files go to the app's default disk (`local`, under `storage/app/private`), never into `public/`. They are only served through a route that checks the person belongs to the task's team.
- **Production:** files move to cloud storage in the production readiness item. That is a configuration change (`FILESYSTEM_DISK`), not a code change.
- **Stored names:** each file is stored under a random name in a folder per team, project and task. The name a person gave it is kept only in the table.
- **Response headers:**
    - images are sent inline, every other file as a download;
    - every response has `X-Content-Type-Options: nosniff`;
    - every response has a `Content-Security-Policy` that blocks scripts.
- **Deleting:** a file leaves the disk with its task, whether the task, its list, its project or its team is deleted.
- **Rate limit:** 30 uploads a minute per person.
- **Local setup:** PHP refuses uploads above `upload_max_filesize` and `post_max_size`, which are 2 MB and 8 MB by default. The README says how to raise them to 10 MB for local development.

## Recurring tasks

- The task sheet gets a _Repeat_ row next to _Due date_ ([Decisions](#decisions) 4). Its menu offers:
    - _Does not repeat_;
    - _Every day_;
    - _Every weekday_ (Monday to Friday);
    - _Every week on Thursday_;
    - _Every 2 weeks on Thursday_;
    - _Every month on the 13th_;
    - _Every year on 13 November_;
    - _Custom…_: every 1 to 30 days, weeks, months or years.

    The weekday and day in the menu follow the due date.

- A repeat needs a due date. Choosing one on a task without a due date sets the due date to today (the person's day, [spec 0003](0003-user-time-zone.md)). Removing the due date stops the repeat, and the sheet says so.
- Cards, list rows and calendar chips show a repeat icon next to the due date.

### Completing a recurring task

**The next occurrence is created** ([Decisions](#decisions) 1):

- It is a new task in the same list, at the bottom, like any new task.
- It copies the title, description, priority, assignee, labels, checklist (all items open) and the repeat rule.
- Comments, files and history are not copied.
- The completed task keeps its history and stops repeating.

**The next due date** ([Decisions](#decisions) 2):

- It is the first date on the schedule after the old due date.
- If that date is already in the past, it moves on to the first scheduled date that is today or later. A weekly task done three weeks late lands on the coming week, not on three overdue copies.
- "Today" is the day of the person who completes the task.
- Monthly and yearly repeats keep their day: a task on the 31st falls on the last day of shorter months and comes back to the 31st.

**History:** the new task records `task.created`, by the person who completed the old one, with `repeated_from` in its properties.

**Notifications:** if the new task keeps the same assignee, nobody is notified. It is not a new assignment ([spec 0006](0006-notifications.md)).

**Reopening the completed task** (the checkbox again, or _Undo_ on _My tasks_):

- If nobody has changed the next occurrence yet (no edit, comment, file, checklist change or move), it is deleted and the reopened task repeats again.
- Otherwise both stay, and the reopened task no longer repeats.
- `repeated_from_id` is unique, so a task never gets two next occurrences.

**Deleting** a recurring task deletes only that occurrence. Later ones do not exist until it is completed.

**The calendar** shows only the next occurrence. Later ones appear as each one is completed.

## Events

New types for the history ([spec 0005](0005-activity-and-comments.md#events)):

| Type                  | Recorded when                              | Properties                            |
| --------------------- | ------------------------------------------ | ------------------------------------- |
| `checklist.checked`   | a checklist item is checked                | the item's id and text                |
| `checklist.unchecked` | a checked item is unchecked                | the item's id and text                |
| `attachment.added`    | a file is attached                         | the file's id and name                |
| `attachment.removed`  | a file is deleted                          | the file's name                       |
| `task.repeat_changed` | the repeat rule is set, changed or removed | old and new rule (either can be null) |

- Adding, editing, reordering and deleting checklist items records nothing, like reordering tasks inside a list ([Decisions](#decisions) 3).
- The dashboard's _Activity_ card shows the new events under _All_.

## Permissions

| Action                                               | Owner | Admin | Member |
| ---------------------------------------------------- | :---: | :---: | :----: |
| See checklists and files, download files             |  ✅   |  ✅   |   ✅   |
| Add, edit, check, reorder and delete checklist items |  ✅   |  ✅   |   ✅   |
| Attach files                                         |  ✅   |  ✅   |   ✅   |
| Delete a file one attached                           |  ✅   |  ✅   |   ✅   |
| Delete a file someone else attached                  |  ✅   |  ✅   |   ❌   |
| Set, change or remove a repeat rule                  |  ✅   |  ✅   |   ✅   |

- In an archived project everything is read-only. Checklists and files still show, and files can still be downloaded.
- People outside the team get a 404 for every route below ([ADR 0006](../decisions/0006-not-found-for-non-members.md)), downloads included.

## Routes

Under `/{current_team}`:

| Method   | Path                          | Name                      | What it does                                                     |
| -------- | ----------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `POST`   | `tasks/{task}/checklist`      | `checklist-items.store`   | Adds one item, or one per line.                                  |
| `PATCH`  | `checklist-items/{item}`      | `checklist-items.update`  | Changes the text, or checks and unchecks.                        |
| `PATCH`  | `checklist-items/{item}/move` | `checklist-items.move`    | Moves the item to a new position.                                |
| `DELETE` | `checklist-items/{item}`      | `checklist-items.destroy` | Deletes the item.                                                |
| `POST`   | `tasks/{task}/attachments`    | `attachments.store`       | Uploads one file; throttled to 30 a minute per person.           |
| `GET`    | `attachments/{attachment}`    | `attachments.show`        | Sends the file: inline for images, as a download otherwise.      |
| `DELETE` | `attachments/{attachment}`    | `attachments.destroy`     | Deletes the file from the table and the disk.                    |
| `PATCH`  | `tasks/{task}`                | `tasks.update`            | Exists; takes `repeat` (`unit` and `every`, or null).            |
| `PATCH`  | `tasks/{task}/complete`       | `tasks.complete`          | Exists; creates the next occurrence, or removes it on reopening. |

## Out of scope

- Several named checklists on a task, an assignee or a due date on an item, turning an item into a task.
- Previews other than images (no PDF viewer), a cover image on cards, versions of a file, editing images.
- Files on comments, and pasting images into the description.
- Repeat rules such as "the last Friday of the month", an end date or a number of times, and showing future occurrences on the calendar.
- Searching checklist items or file names with Ctrl K.
- Scanning files for viruses.
- Cloud storage (the production readiness item).

## Decisions

Decisions 1 to 3: the owner kept the proposals (13 November). The layout comes from wireframe round 10.

1. **What completing a recurring task does:** it creates the next occurrence as a new task and leaves the completed one done. The other way would move the same task's due date forward, as many to-do apps do. Proposed because the board counts done tasks (progress, the dashboard's throughput and _Done lately_): moving the date would hide every completion, and the history of each occurrence would run together.
2. **Where the next due date starts:** from the old due date, skipping dates already past. Counting from the completion date would let a weekly review drift to whatever day it was done.
3. **Which checklist changes the history keeps:** checking and unchecking only. A long list edited item by item would otherwise bury the task's real changes.
4. **Layout** (wireframe round 10, to be chosen):
    - the checklist as a plain list or with checked items folded;
    - files as a thumbnail grid or as rows;
    - _Repeat_ as its own row or inside the due date picker.

## Acceptance criteria

- **Checklist items:**
    - A team member can add, edit, check, uncheck, reorder and delete them.
    - Pasting three lines adds three items.
    - The 51st item is refused.
    - Nothing changes in an archived project.
    - Someone outside the team gets a 404.
- **Checklist history:** checking and unchecking record `checklist.checked` and `checklist.unchecked`; other item changes record nothing.
- **Accepted uploads:** an allowed file under 10 MB is stored under a random name outside `public/`, with its original name, type and size in the table, and records `attachment.added`.
- **Refused uploads:** the request fails validation, nothing is stored and nothing is recorded, when:
    - the file is over 10 MB;
    - it is an SVG or HTML file;
    - its content does not match an allowed type;
    - it would be the task's 21st file.
- **Downloads:** a team member can download a file; someone outside the team gets a 404. Images are sent inline, other files as downloads, all with `nosniff`.
- **Deleting a file:** the uploader, owners and admins can delete it; another member cannot. Deleting removes the file from the disk and records `attachment.removed`.
- **Files leave the disk** when their task, list, project or team is deleted.
- **Setting a repeat:**
    - On a task without a due date, it sets the due date to today.
    - Removing the due date removes the repeat.
    - Each change records `task.repeat_changed`.
- **Completing a recurring task:**
    - It creates exactly one next occurrence in the same list, with the copied fields, open checklist items and the next date from the rules above. Covered: day, weekday, week, month on the 31st, year on 29 February, and a task completed late.
    - Nobody is notified for an unchanged assignee.
- **Reopening:**
    - If the next occurrence is untouched, it is deleted and the reopened task repeats again.
    - If someone has changed it, it stays and the reopened task stops repeating.
- **Cards and list rows** carry the checklist count, the file count and whether the task repeats.
- Every rule above has a feature test; the tests fix the clock and fake the disk.
