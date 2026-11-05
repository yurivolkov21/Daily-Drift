# Design

**Status:** Phase 1 designed. The screenshots come from a prototype built with the installed components and sample data, in the app's own theme.

## Principles

- Keep the starter kit's shell: inset sidebar that collapses to icons, team switcher, breadcrumbs, light and dark themes.
- Use shadcn/ui components first. Take a block from another source only when it saves real work, and adapt it to these components.
- Color is never the only signal: priorities and due states always carry a text label.
- Every action works with the keyboard, including drag and drop.
- Phones get the same features: boards scroll sideways one column at a time, and the task sheet fills the screen.

## App shell

- **Sidebar:** _Dashboard_ and _Projects_, then a _Projects_ group with the five most recently updated active projects, each with its color dot.
- **Header:** breadcrumbs, for example _Projects › Daily-Drift v1_.
- The Laravel logo from the kit is still in place; a Daily-Drift mark replaces it later in Phase 1.

## Screens for Phase 1

### Dashboard

![Dashboard](phase-1/dashboard.webp)

- Three stat cards: overdue open tasks, open tasks due today, active projects. On phones they sit in one row and drop the hint line.
- **Needs attention:** overdue and due-today tasks across the team, grouped under _Overdue_ and _Today_. The checkbox completes a task; the row opens the task sheet on its board.
- **Active projects:** progress per project (completed ÷ all tasks), linking to each board.

### Projects

![Projects](phase-1/projects.webp)

- Tabs for _Active_ and _Archived_, with counts.
- Project cards: color tile, name, two-line description, progress bar, task and list counts, last update. The card links to the board; the menu holds _Edit_, _Archive_ (or _Restore_) and _Delete_.
- _New project_ appears in the header and as a dashed card at the end of the grid.
- Members see no create, edit, archive or delete controls; admins see no _Delete_ (see the permissions in [spec 0001](../spec/0001-projects-lists-tasks.md#permissions)).

![New project dialog](phase-1/project-new.webp)

- Dialog with name, optional description and a color picker (ten swatches, one selected). The description says the project starts with three lists.
- _Edit_ reuses the same dialog.

### Project board

![Project board](phase-1/board.webp)

- Header: color dot, name, description, overall progress and a project menu.
- Columns are lists: name, task count, list progress, a menu (_Rename_, _Delete list_) and a drag handle that appears on hover or focus.
- Task cards: completion checkbox, title (struck through when complete), priority badge, due badge (_Overdue · 3 Nov_ in red, _Today_ in amber, a plain date otherwise) and an icon when the task has a description.
- _Add task_ at the bottom of each column opens an inline title field; _Add list_ sits after the last column.
- Dragging shows the card under the pointer and a gap where it will land. When it is dropped, the client sends the target list and index, and the server rewrites positions in one transaction (spec 0001). If the request fails, the board rolls back and shows a toast.
- Archived projects show a read-only banner with _Restore_, and dragging is disabled.

![Project board, dark theme](phase-1/board-dark.webp)

### Task detail

![Task detail sheet](phase-1/task-sheet.webp)

- A sheet from the right, opened by clicking a card. The URL gets `?task={id}`, so the dashboard can link straight to a task.
- Editable title, _Mark complete_, list (moving it here puts it at the end of that list), priority, due date (calendar popover), creator and creation date, plain-text description.
- Footer: _Delete_ (with confirmation), _Cancel_, _Save_.

### Phones

![Dashboard, board and task sheet on a phone](phase-1/mobile.webp)

- Board columns snap while scrolling sideways. A drag starts after a 250 ms touch hold, so scrolling still works.

## Tokens

| Token         | Values                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------ |
| Project color | `slate`, `red`, `orange`, `amber`, `green`, `teal`, `blue`, `indigo`, `violet`, `pink`     |
| Priority      | `none` (no badge), `low` sky, `medium` amber, `high` orange, `urgent` red; always labelled |
| Due state     | overdue: red badge with "Overdue"; today: amber "Today"; later: neutral date; done: muted  |

The color names are the values stored in `projects.color`; the UI maps them to Tailwind classes.

## Components by screen

| Screen       | shadcn/ui components                                                | Blocks and outside components                                                    |
| ------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| App shell    | `sidebar`, `breadcrumb`                                             | From the starter kit                                                             |
| Dashboard    | `card`, `item`, `checkbox`, `badge`, `progress`, `button`           | Stat cards adapted from shadcn/studio `statistics-component-01`                  |
| Projects     | `card`, `tabs`, `badge`, `progress`, `dropdown-menu`, `dialog`      | Delete confirmation from shadcn/studio `dashboard-dialog-22`                     |
| Board        | `button`, `badge`, `checkbox`, `progress`, `dropdown-menu`, `input` | ReUI `kanban`; patterns from ReUI `c-kanban-5`, `c-kanban-6`, Shadcn Space below |
| Task detail  | `sheet`, `select`, `popover`, `calendar`, `textarea`, `separator`   | None                                                                             |
| Empty states | `empty`                                                             | Adapted from ReUI `c-empty-12`                                                   |
| Feedback     | `sonner`                                                            | None                                                                             |

## Sources

Only free items, in their Radix versions.

| Source                                    | License                                                         | Used                                                                                                                                                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shadcn/ui](https://ui.shadcn.com)        | MIT                                                             | All components above.                                                                                                                                                                                                                                |
| [ReUI](https://reui.io)                   | MIT                                                             | `kanban` component, installed as is. Examples `c-kanban-6` (save on drop with rollback), `c-kanban-5` (progress in the column) and `c-empty-12` (tasks empty state) as patterns. See [ADR 0005](../decisions/0005-reui-kanban-for-drag-and-drop.md). |
| [shadcn/studio](https://shadcnstudio.com) | MIT with Commons Clause: no resale or redistribution unmodified | `statistics-component-01` (stat card), `dashboard-dialog-22` (destructive confirmation), both adapted.                                                                                                                                               |
| [Shadcn Space](https://shadcnspace.com)   | Free license; do not present the components as your own         | `kanban-application-01` as the pattern for the inline _Add task_ form.                                                                                                                                                                               |
| [ShadcnUIKit](https://shadcnuikit.com)    | Paid for the matching blocks                                    | Nothing. The kanban, task-card and stat-card blocks need an account key.                                                                                                                                                                             |

Also paid, so not used: ReUI blocks without the `c-` prefix (for example `kanban-board-*`, `card-21`, `sheet-*`), Shadcn Space `kanban-application-02`, `statistics-03` and `statistics-16`.

## Installing from these registries

The shadcn CLI knows all four registries, but this project's `new-york` style does not resolve correctly for two of them:

- **ReUI:** `@reui/<name>` with `new-york` returns the Base UI version. Install from `https://reui.io/r/styles/radix-vega/<name>.json` instead (`radix-vega` is the Radix version of the classic shadcn look). The CLI writes the file to `components/reui/` at the repository root; move it to `resources/js/components/reui/`.
- **shadcn/studio:** rejects `new-york`; use `https://shadcnstudio.com/r/new-york-v4/<name>.json`.

The first pull request that installs from these registries adds both URLs to `registries` in `components.json`, so `@reui/...` and `@shadcn-studio/...` resolve to the right versions.
