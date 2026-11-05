# ADR 0004: Install every shadcn/ui component for the new-york style

**Status:** Accepted · **Date:** 2026-11-05

## Context

The starter kit ships 27 shadcn/ui components (Radix, `new-york` style). The UI will be built from shadcn components and from free blocks based on them, so having the full library available avoids adding components one by one.

## Decision

- Install every component the shadcn registry publishes for `new-york`; 63 are now in `resources/js/components/ui`.
- Update the kit's `button`, `card`, `dialog`, `input`, `label` and `separator` to the current shadcn versions, because the new components use sizes and parts they add (for example `icon-sm` and `CardAction`).
- Skip `toast` (Base UI only; `sonner` covers it) and `code-block`, `questionnaire` and `trace` (not published for `new-york`).

## Consequences

- Blocks from other sources must be the Radix versions to match these components.
- The updated components look slightly different from the kit's originals; for example, the default button no longer has a shadow.
- Unused components are not bundled; Vite only includes what pages import.
