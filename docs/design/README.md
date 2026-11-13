# Design

**Status:** Chosen and built · **Decided:** 2026-11-06 · **Decision:** [ADR 0007](../decisions/0007-floating-shell-with-motion.md) · **Behaviour:** [spec 0002](../spec/0002-interface-rebuild.md)

This page describes the interface the app is being rebuilt to. It replaces the first pass, which kept the starter kit's look and was accepted only as a starting point (see [Earlier version](#earlier-version)).

## How it was chosen

The owner asked for a modern SaaS dashboard with smooth motion. Each round showed at least three interactive wireframes built after studying blocks from the [sources](#sources) below. The owner picked one or asked for a merge, and only the chosen frames were kept.

| Round | Screens                                | Chosen                                                                                                 |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1     | Dashboard, scrollbars                  | A merge of two options ("indigo rail" and "floating canvas"); thin scrollbars shown on hover or scroll |
| 2     | Projects, board                        | Card grid plus a list view grouped by health; tinted columns with lists that fold                      |
| 3     | Sign in and sign up, settings          | A glass card over a moving board; tabs inside one card                                                 |
| 4     | My tasks, assignee field               | A grouped list; a searchable menu in the task sheet                                                    |
| 5     | Task activity, Activity card           | Comments first with the changes folded between them; a feed grouped by day                             |
| 6     | Notifications                          | A bell panel with _Updates_ and _Due soon_ tabs, one line per item; a page with a timeline and details |
| 7     | Labels, board filters, search          | Outline label badges with an icon (no color); one button per filter; a centered command box (Ctrl K)   |
| 8     | List and calendar views                | Two-line rows in tinted list sections; a month with a side panel; the view switch in the filter row    |
| 9     | Sign in with Google and GitHub         | Email form first, then Google and GitHub side by side; a Connected accounts block under the password   |
| 10    | Task details: checklist, files, repeat | Checked items fold; files as rows; _Repeat_ as its own row; completing moves the card to _Done_        |

The wireframes live in the owner's private design canvas. Screenshots of the built screens will be added here as each screen ships.

## Principles

- Cards float on a soft grey canvas: the sidebar, the header bar and every block of content is its own rounded card.
- Motion shows what changed (something arrived, moved, opened or finished) and never delays work. Everything has a reduced-motion path.
- Color carries meaning, not decoration: every project and list has a hue from one palette, and that hue tints its tile, column, pills and progress.
- Color is never the only signal: priorities, due states, health and lists always carry a text label.
- No arrow characters typed as text in buttons, links or hints (a left or right arrow, a return sign, a double chevron): use an icon (Lucide `ChevronLeft`, `ArrowRight`, `ChevronsLeft`) next to the words. A _Back_ button is an icon and the word.
- Every action works with the keyboard, including drag and drop.
- Phones get the same features; the folded sidebar and folded lists still need a phone layout (see [Open questions](#open-questions)).

## Tokens

### Color

| Token       | Value                                  | Used for                                             |
| ----------- | -------------------------------------- | ---------------------------------------------------- |
| Canvas      | `#EEF0F7`                              | Page background behind the cards                     |
| Surface     | `#FFFFFF`                              | Cards, header bar, menus, dialogs                    |
| Ink         | `#18172B`                              | Text                                                 |
| Muted ink   | `#6B6A80`                              | Secondary text                                       |
| Line        | `#E7E6F2`, `#F0EFF7`                   | Borders and dividers                                 |
| Night       | `#17153B`                              | Sidebar, toasts, the save bar                        |
| Night ink   | `#B9B6E6`                              | Sidebar text                                         |
| Accent      | `#6E5BF5`, hover `#5B48E8`             | Primary buttons, active navigation, focus, selection |
| Accent soft | `#F2F1FA`, `#EEEBFF`                   | Segmented controls, hovers, selected rows            |
| Hero        | `#221D57`                              | The dashboard greeting card                          |
| Fresh       | `#2DD4BF`                              | The week ring, checks on dark backgrounds            |
| Danger      | `#F43F5E`; text `#BE123C` on `#FFE4E8` | Overdue, delete                                      |
| Warning     | `#F59E0B`; text `#B45309` on `#FEF3C7` | Due today, unsaved changes                           |
| Success     | `#22C55E`; text `#047857` on `#E9F9EF` | Done, saved, verified                                |

Projects and lists keep the ten hue names stored in the database: `slate`, `red`, `orange`, `amber`, `green`, `teal`, `blue`, `indigo`, `violet`, `pink`. Each maps to a fixed set of classes for the dot, tile, column tint, pill, bar and ring.

Priorities keep their labels and colors: `none` (no pill), `low` sky, `medium` amber, `high` orange, `urgent` red. Due states: overdue in red with "Overdue", today in amber, later as a plain date, completed muted.

### Type, shape and depth

- **Headings:** Plus Jakarta Sans, 800 weight: page titles 28 px, card titles 17 px.
- **Text:** Inter, 400 to 700, mostly 13 to 15 px. Numbers use tabular figures.
- **Radius:** cards 22 px, header bar 18 px, buttons and inputs 12 px, pills fully round.
- **Spacing:** 14 px between cards and around the page.
- **Shadows** only appear when something lifts: a hovered card, a menu, a dialog, the task sheet.

### Motion

| Pattern       | Timing                                                 | Where                                                      |
| ------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| Rise in       | 0.7 s, `cubic-bezier(.16,.84,.24,1)`, 60–70 ms stagger | Cards and rows when a page loads or the view changes       |
| Fill and draw | 1 s for bars and rings, 1.6 s for chart lines          | Progress bars, rings, the throughput chart                 |
| Count up      | 1.1–1.3 s, ease-out                                    | Stat numbers                                               |
| Slide         | 0.35 s, `cubic-bezier(.2,.7,.2,1)`                     | Indicators under tabs and segmented controls               |
| Panels        | 0.45 s, `cubic-bezier(.2,.75,.2,1)`                    | Sidebar fold, task sheet, folding lists, collapsing groups |
| Pop           | 0.18 s for menus, 0.38 s for dialogs                   | Menus and dialogs                                          |
| Feedback      | 0.35–0.45 s                                            | Shake on an invalid field, bump on a count, toast          |

With reduced motion there are no entrance animations or count-ups, and transitions are instant.

### Scrollbars

A thin thumb (4 px, 6 px under the pointer) in the accent at 55 % opacity, or white at 45 % on dark surfaces. It shows while the area is hovered or scrolled and fades 0.9 s after scrolling stops. The gutter is stable so content does not shift, scrolling does not chain to the page, and Firefox gets `scrollbar-width: thin`.

## App shell

- **Sidebar:** a floating night-blue card, 256 px wide, that folds to a 76 px icon rail with its button or Ctrl/⌘ + B; the choice is remembered. It holds the logo, the team switcher, _Dashboard_, _Projects_ (with a count), _My tasks_ (Phase 2) and _Team_, then _Recent_: the five most recently updated active projects as colored letter tiles with their open task counts, and the user at the bottom. On the rail, labels fade out, items show tooltips and counts become dots.
- **Header bar:** a white card with breadcrumbs that start with the team, the first team members, and the page's main action. Search (⌘K) joins it in Phase 2.

## Screens for Phase 1

### Dashboard

- **Greeting card:** date, "Good afternoon, {first name}", a one-line summary, the links _Review overdue_ and _Plan my day_, and a ring with the share of this week's tasks done.
- **Due today:** a card with checkable rows.
- **Stat cards:** open tasks, due today, overdue and done in the last 7 days, each with a count-up, a 7-day sparkline and a line of context.
- **Throughput:** tasks completed per day as a line chart, 7 or 14 days, compared with the period before.
- **Projects:** a progress bar per active project and a link to all projects.
- **My focus:** tabs _Overdue_, _Today_ and _Next 7 days_ with counts; rows with a checkbox, project dot, list, priority and due date.
- **Activity:** a placeholder until comments and history arrive in Phase 2.

### Projects

- **Toolbar card:** title and summary, _Active_ and _Archived_ tabs, a name filter, a _Filters_ panel that slides open (health, color), a _Sort_ menu with an icon and a short description per option, and a _Grid_ or _List_ switch.
- **Grid:** each card has a striped cover in the project hue, a letter tile, a _Needs attention_ pill when it applies, a menu, a two-line description, three numbers (open, due in the next 7 days, overdue), a progress bar, people and the last update. A dashed _New project_ card closes the grid.
- **List:** rows with the tile, the name and the reason for its health, a bar split by list, a progress ring, chips and people. Rows are grouped into _Needs attention_ and _On track_; groups collapse, and a switch turns grouping off.
- **Archived:** the same card and row in grey with an _Archived_ pill; _Restore_ and _Delete_ are in the menu.
- **New project dialog:** the tile previews the chosen color and initial; name, optional description, color swatches and the starting lists.

### Project board

- **Header card:** tile, name, description, chips (open, overdue, due today), progress, people and the project menu.
- **Columns** are tinted with the list hue. The header has the dot, name, count, _Add task_, _Fold_ and the list menu.
- **Task cards:** title, two-line description, priority pill, due chip and an avatar (the creator in Phase 1, the assignee from Phase 2).
- **Drag and drop:** a dashed slot opens where the card will land, within a list or across lists. Alt + arrow keys move the focused card.
- **Folding:** any list folds to a narrow strip with its name and count. A folded list still accepts drops; its count bumps and a toast offers _Show_ and _Undo_.
- An inline field adds a task (Enter adds, Escape cancels); a dashed _Add list_ follows the last column.
- **Task sheet:** slides in from the right over a dimmed board, with status, priority, due date, assignee, description and _Mark complete_. Escape or a click on the backdrop closes it.

### Sign in and sign up

- A board drifts slowly behind a dark gradient; a glass card on the left holds the form. The board is decoration: hidden from screen readers, still under reduced motion, and replaced by a still background on small screens.
- _Sign in_ and _Create account_ tabs with a sliding indicator, _Forgot password?_, and a "Check your inbox" panel after sign up or a reset request with a resend button.
- Inline errors with a short shake, a password strength meter, a match check on the confirmation and a show-password button.
- Reset password, confirm password, two-factor challenge and verify email use the same layout.

### Settings

- One card with vertical tabs (Profile, Security, Appearance, Team) and a sliding indicator; the content rises in when the tab changes.
- **Profile:** initials avatar, name and email with a _Verified_ badge, and the time zone (_Match my device_ or a zone picked from a searchable list). A save bar slides up while something is unsaved. _Delete account_ opens inline and asks for the password.
- **Security:** change password with a strength meter; two-factor setup (QR code, 6-digit code, recovery codes blurred until shown); passkeys from the starter kit.
- **Appearance:** _Light_, _Dark_ and _Match my device_ with small previews; Motion: _Match device_, _Reduced_, _Full_.
- **Team:** name and address, members with a role menu (Admin, Member, Remove; the owner is fixed), invitations by email with a role, and pending invitations with _Cancel_.

## Screens for Phase 2

### My tasks

- A toolbar card with the title, today's date and how many tasks are due today, overdue and in the next 7 days, then project chips to filter by.
- One card with the groups _Overdue_, _Today_, _Next 7 days_, _Later_ and _No due date_; each folds, and empty ones are hidden. Rows have a round checkbox, the title (a link to the task on its board), the project and list, the priority and how late or when the task is due.
- Ticking a task fades and strikes it through, then moves it to _Done lately_ (folded, the last 7 days) with an _Undo_ toast.

### Assignee

- The task sheet's _Assignee_ row opens a menu with a search field: _Assign to me_ first (with how many open tasks of this project you already have), then the other members, then _Unassigned_. Picking someone saves at once.
- Cards show the assignee's initials avatar, which pops in when it changes. The creator moves to the sheet's _Created by_ row.

### Task activity

- Under the description, the task sheet lists the comments, oldest first. The changes made between two comments fold into one dashed pill ("2 changes · Minh · 10 Nov") that opens to show each change with an icon, who made it and when.
- The composer sits under the list: typing `@` offers the team's members, Ctrl + Enter sends. Your own comments show _Edit_ and _Delete_ on hover or focus; an edited comment is marked.
- Cards show a comment count.

### Activity card

- The dashboard's _Activity_ card lists the team's latest events under _Today_, _Yesterday_ and earlier dates: who, what, the task (a link), the project and the time. A comment shows its first line.
- A segmented filter keeps _All_, _Comments_ or _Completed_ and reloads only the card.

### Notifications

- The bell's panel has two tabs, _Updates_ and _Due soon_. Each item is one line: an avatar, a short sentence and a relative time, with a dot when unread. Clicking closes the panel and opens the task on its board; a mention scrolls to the comment and highlights it.
- _View all_ opens the notifications page: a list grouped by day with a timeline line on the left, and the selected notification on the right (the sentence, the task as it is now with _Open task_, the comment for a mention, and the task's recent activity). On a phone the two panes become two steps.

### Labels, filters and search

- Labels are outline badges with an icon and the name, in the text color; cards show up to 3, then "+n". The task sheet's _Labels_ row opens a menu with a search field and a checkbox per label; creating a label opens an icon picker with a search field, six groups and a grid of 79 icons.
- The board's header card has a filter bar: a text field and one button each for _Labels_, _Assignee_, _Due_ and _Priority_, each with a checklist; list headers read "3 of 8" while filters are on.
- Ctrl K (⌘K on a Mac) opens a centered search box: _Recent_ and _Go to_ before typing, then _Tasks_ and _Projects_ with the match highlighted.

### List and calendar views

- The header card's filter row starts with a segmented control, _Board_, _List_ and _Calendar_ with icons, then a divider and the filters.
- **List:** one section per list, tinted like its board column, with a fold button, the count and a _+_ button. One header bar above them sorts by _Task_, _Due date_ or _Priority_. Rows are white cards with two lines: the title, then the labels and the comment count; the due date (with a calendar icon), a priority pill with a colored dot and the avatar sit on the right. Each section ends with a dashed _Add task_ button.
- **Calendar:** a side panel that folds, with a mini month (a dot marks days with open tasks), a checkbox per list to show or hide it on the calendar, and _No due date_ tasks to drag onto a day. The month grid starts on Monday; chips are tinted with their list's color and carry a dot, the title and the avatar; a day shows three lines at most, the last one "+n more" when needed. Overdue dates are red, weekends and other months shaded.
- **Phones:** the list keeps its sections with two-line rows; the calendar becomes an agenda by day, scrolled to today, and a bottom sheet changes the due date with _Today_, _Tomorrow_, next Monday or _No date_.

## Screens for Phase 3

### Sign in with Google and GitHub

- The sign-in and sign-up cards keep the email form first. Under it, _or continue with_ leads to Google and GitHub side by side, each with its own mark, and the sign-in card adds _Sign in with a passkey_ as a small link. The sign-up card says that only the name and email are read. A try that failed shows one amber line above the form.
- _Settings → Security_ shows _Connected accounts_ under the password: one row per provider with its mark, a green _Connected_ badge, the email and when it was connected, and _Connect_ or _Disconnect_. When an account is the only way left to sign in, _Disconnect_ is dimmed and a line with a lock says why.
- An account without a password sees _Set a password_ (two fields, no current password) with a short note, and the two-factor, passkey and delete-account actions each say to set a password first.

### Task details: checklist, files and repeat

- The task sheet adds a _Repeat_ row under _Due date_. Its menu offers presets that follow the due date ("Every 2 weeks on Thursday", "Every month on the 19th") and _Custom…_ (every 1 to 30 days, weeks, months or years). A repeating task shows a repeat icon next to its due date on cards, rows and calendar chips.
- **Checklist** under the description:
    - _2 of 5_ and a thin bar, green when every item is checked, with a line saying the task stays open until it is completed;
    - rows with a drag handle and a menu that show on hover, a checkbox, and text edited in place;
    - _Hide checked_ folds the checked items into one line;
    - a dashed _Add an item_ field that takes one item per pasted line.
- **Attachments** as rows: a small thumbnail or a type icon, the name, then type, size, who and when. Download and the menu show on hover. An upload shows a progress bar in its row, and a refused file shows a red row that says why. A dashed line at the end accepts dropped files, and dropping anywhere on the sheet shows a full-sheet drop target.
- **Completing** moves the card to the top of the project's _Done_ list. A repeating task leaves its next occurrence at the bottom of the list it came from, and the sheet says so.

## Components by screen

| Screen        | shadcn/ui components                                                                                                                  | Other                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| App shell     | `sidebar` (floating, folds to icons), `breadcrumb`, `tooltip`, `dropdown-menu`                                                        |                                          |
| Dashboard     | `card`, `chart`, `tabs`, `checkbox`, `badge`, `avatar`                                                                                |                                          |
| Projects      | `dropdown-menu` (sort, card menu), `toggle-group`, `collapsible`, `switch`, `dialog`                                                  |                                          |
| Board         | `sheet`, `dropdown-menu`, `sonner` (toast with _Undo_), `avatar`, `tooltip`                                                           | ReUI `kanban`                            |
| Sign in       | `input`, `button`, `tabs`                                                                                                             |                                          |
| Settings      | `input`, `button`, `dropdown-menu` (role menu), `dialog` (remove member, delete team)                                                 | Local segmented tabs                     |
| My tasks      | `checkbox`, `sonner` (toast with _Undo_)                                                                                              |                                          |
| Assignee      | `popover`, `command`                                                                                                                  |                                          |
| Activity      | `textarea`, `button`                                                                                                                  | Local segmented tabs                     |
| Notifications | `popover`, `tabs`, `resizable`, `scroll-area`, `item`, `avatar`, `kbd`, `empty`                                                       | Pattern from the shadcn/ui Mail example  |
| Empty states  | `empty`                                                                                                                               | Adapted from ReUI `c-empty-12`           |
| Labels        | `badge` (outline, with an icon), `popover`, `command`, `checkbox`                                                                     | Lucide icons for labels                  |
| Board filters | `input`, `popover`, `command`, `checkbox`, `badge`                                                                                    |                                          |
| Search        | `command` (dialog), `kbd`                                                                                                             |                                          |
| Sign in       | `button`, `spinner`; Google and GitHub marks drawn in SVG                                                                             | Local _Set a password_ note              |
| List view     | `checkbox`, `tooltip` (assignee), label badges                                                                                        | Local segmented view switch              |
| Calendar      | `calendar` (mini month), `popover` ("+n more", _Add task_), `drawer` and `checkbox` (phone agenda)                                    | Native drag and drop on the days         |
| Task details  | `checkbox`, `progress`, `dropdown-menu` (item, file and _Repeat_ menus), `alert-dialog` (delete a file), `sonner` (toast with _Undo_) | Native drag and drop for items and files |

The small local components from the first pass (progress ring, segmented bar, hue bar) stay.

## Open questions

1. **Dark theme.** Settings offers it, but only the light theme is designed.
2. **Phones.** The folded sidebar, folded lists and the moving sign-in board need a phone layout.
3. **Motion tooling.** Plain CSS with `tw-animate-css` (already installed), or a library such as Motion for the sheet and list folding.

## Sources

Code is taken only from free items, in their Radix versions. Paid blocks were looked at for layout ideas only; none of their code is used.

| Source                                    | License of free items                                                  | Code used                                                                                                                                                                     | Ideas from paid previews                                                                                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shadcn/ui](https://ui.shadcn.com)        | MIT                                                                    | All components above, including `chart`; the Mail example from earlier releases (list and reading pane) as a pattern for the notifications page.                              | None                                                                                                                                                                                                                      |
| [ReUI](https://reui.io)                   | MIT                                                                    | `kanban` component, installed as is ([ADR 0005](../decisions/0005-reui-kanban-for-drag-and-drop.md)); `c-kanban-6` (save on drop with rollback) and `c-empty-12` as patterns. | None                                                                                                                                                                                                                      |
| [ShadcnUIKit](https://shadcnuikit.com)    | Free items: personal and commercial use; no redistribution as a UI kit | `stat-card1` (stat card with footer), `todo-app1` (task rows), both adapted.                                                                                                  | _Kanban Board 2_ (task card fields), _Stat Card 2_ (segmented pipeline bar); _Todo App 2_ (two-line task rows), _Kanban Board 6_ (list sections), _Event Calendar 2_ (side panel with a mini month and calendars to tick) |
| [shadcn/studio](https://shadcnstudio.com) | MIT with Commons Clause: no resale or redistribution unmodified        | `dashboard-dialog-22` (destructive confirmation), adapted.                                                                                                                    | _Widget 24_ (project card with stats and members), _Kanban App 04/05_ (tinted columns)                                                                                                                                    |
| [Shadcn Space](https://shadcnspace.com)   | Free license; do not present the components as your own                | `kanban-application-01`: status icons in column headers and the inline _Add task_ form, as patterns.                                                                          | `kanban-application-02` (color-coded columns)                                                                                                                                                                             |

Round 8 also looked at ReUI's _Event Calendar_ blocks (month chips with an avatar, a side panel with a mini month) for layout only. The calendar is a small month grid of our own with native drag and drop: ReUI's free `event-calendar` component is built for timed events (week and day views, resizing), more than a month of due dates needs.

## Installing from these registries

The shadcn CLI knows all of these registries, but this project's `new-york` style does not resolve correctly for two of them:

- **ReUI:** `@reui/<name>` with `new-york` returns the Base UI version. Install from `https://reui.io/r/styles/radix-vega/<name>.json` instead (`radix-vega` is the Radix version of the classic shadcn look). The CLI writes the file to `components/reui/` at the repository root; move it to `resources/js/components/reui/`.
- **shadcn/studio:** rejects `new-york`; use `https://shadcnstudio.com/r/new-york-v4/<name>.json`.
- **ShadcnUIKit** and **Shadcn Space** serve free items at `https://shadcnuikit.com/r/<name>.json` and `https://shadcnspace.com/r/<name>.json`; paid ones answer with an authentication error.

`components.json` points `@reui` at `radix-vega` and `@shadcn-studio` at `new-york-v4` under `registries`, so `pnpm dlx shadcn@latest add @reui/<name>` installs the Radix version. The CLI still writes ReUI files to `components/reui/` at the repository root; move them to `resources/js/components/reui/`, which lint and format skip like `components/ui`.

## Earlier version

The first pass (2026-11-05) kept the starter kit's inset sidebar and theme and redesigned only the pages. Its screenshots stay for reference: [dashboard](phase-1/dashboard.webp), [projects](phase-1/projects.webp), [new project](phase-1/project-new.webp), [board](phase-1/board.webp), [board in dark](phase-1/board-dark.webp), [task sheet](phase-1/task-sheet.webp) and [phones](phase-1/mobile.webp).
