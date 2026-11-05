# ADR 0005: Use the ReUI Kanban component for drag and drop

**Status:** Accepted · **Date:** 2026-11-05

## Context

The board needs lists and tasks that move by drag and drop: tasks within a list and across lists, lists among themselves. It has to work with a mouse, on touch screens and from the keyboard. Spec 0001 says the client sends only the target list and index after a drop, and the server rewrites positions.

shadcn/ui has no Kanban component. The free candidates from the [design sources](../design/README.md#sources) were:

- **ReUI `kanban`:** a shadcn-style component (MIT, Radix version available) on `@dnd-kit/core`. It sorts both items and columns, has mouse, touch and keyboard sensors, a drag overlay, and an `onValueCommit` callback that fires once per drop with the source and target list and index.
- **Shadcn Space `kanban-application-01`:** a complete demo board on the same library, but it does not reorder columns and mixes data, state and markup in one block.
- **Writing the board on `@dnd-kit` directly:** the same library with more code to own and test.

## Decision

- Install ReUI `kanban` (Radix version) into `resources/js/components/reui/kanban.tsx`. It adds `@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities`.
- Persist moves in `onValueCommit`: an item drop sends `PATCH tasks/{task}/move` with the target list and index, and a column drop sends `PATCH lists/{list}/move` with the target index. The board updates at once, and rolls back with a toast if the request fails (the pattern from ReUI `c-kanban-6`).

## Consequences

- The component is source code in the repository, not a package: updates come from re-installing it and reviewing the diff.
- `@dnd-kit/core` 6 is the stable line; the newer `@dnd-kit/react` is not used yet.
- Keyboard drag and drop comes from the library's keyboard sensor. Its screen reader announcements should be translated into clear task and list names when the board is built.
- Installing with `@reui/kanban` under the `new-york` style returns the Base UI version unless `components.json` points `@reui` at the `radix-vega` style (see the [design notes](../design/README.md#installing-from-these-registries)).
