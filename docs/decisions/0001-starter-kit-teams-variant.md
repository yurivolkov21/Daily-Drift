# ADR 0001: Start from the Laravel React starter kit, teams variant

**Status:** Accepted · **Date:** 2026-11-05

## Context

Daily-Drift is a collaborative task manager. It needs accounts, secure sign-in, and a way for several people to share the same projects. The official Laravel React starter kit comes in a standard variant and a teams variant; both use Laravel + Inertia + React + shadcn/ui.

## Decision

Use the **teams variant** and keep every auth feature its installer offers: registration, email verification, two-factor auth, passkeys and password confirmation. Laravel and React live in one application through Inertia instead of a separate API and single-page app.

## Consequences

- Teams, invitations, roles and permissions exist from day one; projects can belong to a team.
- One codebase handles routing, auth and authorization; there is no CORS or token handling between frontend and backend.
- A mobile app later would need a separate API layer.
