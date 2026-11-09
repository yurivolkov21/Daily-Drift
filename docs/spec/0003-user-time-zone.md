# Spec 0003: Time zone per person

**Status:** Done · **Phase:** 1 · **Roadmap:** [Phase 1](../plan/roadmap.md#phase-1-core-kanban-done) · **Decision:** [ADR 0008](../decisions/0008-time-zone-per-person.md)

## Goal

"Today", "overdue" and "due in the next 7 days" follow the local day of the person looking, instead of UTC. Before this, a task due on 9 November became overdue at 07:00 on 10 November for someone in UTC+7 ([spec 0001, known limitations](0001-projects-lists-tasks.md#known-limitations)).

## Rules

- **Which time zone:** the one the person picked under _Settings → Profile_, or else their device's. Without either, the app's time zone (UTC) applies.
- **Device time zone:** every page sets a `timezone` cookie from the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`), so the server knows it from the second request on. The cookie is not encrypted.
- **Picking one:** _Time zone_ under Profile offers _Match my device_ (the default, stored as no value) or any IANA time zone, from a searchable list with each zone's current offset. It is saved with the rest of the profile.
- **Valid names:** any IANA name, old aliases such as `Asia/Saigon` included, since some browsers still report them. Anything else is a validation error on Profile and is ignored in the cookie.
- **What follows the time zone:**
    - _Overdue_, _Today_ and _Next 7 days_ on cards, in the task sheet, in _My focus_ and in project stats (and so a project's health);
    - the dashboard's days: due today, the week ring (Monday to Sunday), the sparklines, throughput and "done in 7 days";
    - the greeting's hour and the "today" marked in the date picker.
- **What does not:** timestamps stay in UTC in the database. Due dates have no time; a task is due on its date in whoever's time zone is looking.
- Two people in different time zones can see the same task as _Today_ and _Overdue_ for a few hours. That is expected.

## Known limitations

- A page left open across midnight keeps the old "today" until it is reloaded or another page is opened.
- The very first page before signing in has no cookie yet and uses UTC; it shows no dates.
- Reminders sent without a page (Phase 2) will need a stored time zone for people who follow their device; the cookie value can be stored then.

## Acceptance criteria

- With a picked time zone, the shared `today` and the dashboard's `today` are that zone's date.
- Without one, the device's time zone from the cookie is used; an unknown name falls back to UTC; a picked zone wins over the device.
- Profile saves a zone, saves an old alias, clears it back to _Match my device_, and rejects an unknown name.
- A task due yesterday in the viewer's time zone is overdue for them and not for a viewer whose day has not ended.
- The dashboard counts a completion on the viewer's local day.
- Every rule above has a feature test (`tests/Feature/TimeZoneTest.php`).
