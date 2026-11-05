# ADR 0002: Use pnpm 12 and Node 24

**Status:** Accepted · **Date:** 2026-11-05

## Context

The starter kit installs frontend packages with npm and its CI runs Node 22. The project is cloned and run on several machines, where pnpm's shared store saves disk space and installs faster.

## Decision

- Use **pnpm 12.16.1**, pinned in `packageManager`, with `pnpm-lock.yaml` as the only lock file.
- Use **Node 24 LTS** (24.22.1 or newer, which includes the October 2026 security release), set in `.nvmrc` and `engines`.
- Composer scripts and CI call pnpm; CI enables it with `corepack enable pnpm`.

## Consequences

- Contributors run `corepack enable pnpm` (or install pnpm 12) before `composer setup`.
- npm commands should not be used, so a `package-lock.json` never appears next to `pnpm-lock.yaml`.
