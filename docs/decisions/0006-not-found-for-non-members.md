# ADR 0006: Answer 404 to people outside a team

**Status:** Accepted · **Date:** 2026-11-05

## Context

Every team page lives under `/{team-slug}/...` or `/settings/teams/{team-slug}`. The starter kit's `EnsureTeamMembership` middleware answered **403** when the user did not belong to the team, which tells anyone who guesses a slug that the team exists. [Spec 0001](../spec/0001-projects-lists-tasks.md#permissions) asks for 404 on every project route so team names and ids stay hidden.

## Decision

- `EnsureTeamMembership` answers **404** when the user is not a member of the team, on every route that uses it (team pages, team settings, projects).
- **403** stays for members who lack a permission, for example a member trying to create a project or an admin trying to delete one.
- Project routes use scoped bindings (`{current_team}/projects/{project}`), so a project of another team is also a 404, even for a member of the team in the URL.

## Consequences

- The kit's tests for leaving or switching to a team the user does not belong to now expect 404.
- People outside a team cannot tell a missing team from a private one.
- Members still get a clear 403 when they are not allowed to do something they can see.
