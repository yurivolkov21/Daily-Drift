# ADR 0008: A time zone per person, following the device by default

**Status:** Accepted · **Date:** 2026-11-09

## Context

Dates such as "today" and "overdue" used the app's time zone (UTC). The roadmap left open whether the fix should be a time zone per person or per team. Teams can span time zones, and the numbers on a board are read by one person at a time.

## Decision

- Each person has a time zone ([spec 0003](../spec/0003-user-time-zone.md)). There is no team time zone.
- The default is _Match my device_: the browser sends its time zone in a `timezone` cookie on every page, the same way the theme and the Motion setting are kept. A person can instead pick a fixed zone under Profile; it is stored in `users.timezone` (null means the device).
- Timestamps stay in UTC in the database and `config('app.timezone')` stays UTC. Only the viewer's "today", the edges of a day and the start of a week are computed in their time zone (`App\Support\LocalTime`). Changing the app's time zone per request was ruled out: Laravel writes timestamps without an offset, so they would be stored in mixed zones.

## Consequences

- Nobody has to set anything for dates to be right, and travellers follow their device unless they pin a zone.
- Two teammates in different zones can see the same task as _Today_ and _Overdue_ for a few hours.
- Work done without a request (reminders in Phase 2) has no cookie, so it will need a stored zone for people who follow their device.
