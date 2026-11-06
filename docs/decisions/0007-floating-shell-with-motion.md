# ADR 0007: Replace the starter kit look with a floating shell and motion

**Status:** Accepted · **Date:** 2026-11-06 · **Replaces:** the first-pass principle "keep the starter kit's shell" in the [design notes](../design/README.md#earlier-version)

## Context

The first design pass kept the starter kit's shell and theme and only redesigned the pages. The owner accepted it as a starting point but found it plain and too close to the defaults. They asked for a modern SaaS dashboard with smooth motion, chosen from interactive wireframes: at least three options per round, built after studying blocks from shadcn/ui, ReUI, ShadcnUIKit, shadcn/studio and Shadcn Space.

Three rounds settled the shell and every Phase 1 screen (see [How it was chosen](../design/README.md#how-it-was-chosen)).

## Decision

- **Shell:** a floating dark sidebar that folds to an icon rail, and a white header bar, both as cards on a soft grey canvas. The sidebar is built on the installed shadcn `sidebar` (`variant="floating"`, `collapsible="icon"`), so folding, the Ctrl/⌘ + B shortcut and the `sidebar_state` cookie come from the component.
- **Look:** an indigo accent on white cards, a night-blue sidebar, large rounded corners, Plus Jakarta Sans for headings and Inter for text. The values are in the [design tokens](../design/README.md#tokens).
- **Motion:** short, purposeful transitions that show what changed (cards rising in, bars filling, panels sliding, counts bumping). They follow the operating system's reduced-motion setting and a Motion setting in Appearance.
- **Scrollbars:** thin, shown only while hovering or scrolling.
- **Theme:** the light theme is designed first. Dark is derived from the same tokens before it ships.

## Consequences

- Every Phase 1 page is rebuilt to the new design; data, routes and permissions from [spec 0001](../spec/0001-projects-lists-tasks.md) stay. The work and the new behaviour are in [spec 0002](../spec/0002-interface-rebuild.md).
- The starter kit's Instrument Sans font is replaced, which changes the font download in the production build.
- The first-pass screenshots in `docs/design/phase-1/` are kept for history only.
- Motion adds work to every screen: each animation needs a reduced-motion path and must not delay input.
