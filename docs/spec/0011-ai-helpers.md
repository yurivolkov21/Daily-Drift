# Spec 0011: AI helpers

**Status:** Done · **Phase:** 3 · **Roadmap:** [Phase 3](../plan/roadmap.md#phase-3-advanced-in-progress) · **Design:** no wireframe round. The owner asked on 16 November to build it straight away, so the helpers reuse what the app already has: the task sheet's checklist, a dialog like the project dialog, and toasts.

## Goal

Three helpers that draft text with Claude, so people type less. Each one is a button, and a person reads what Claude wrote before anything on the board changes:

- **Suggest steps**, in a task's checklist: 3 to 8 steps drafted from the task. The person picks which ones to add.
- **Draft tasks**, on a project page: up to 12 tasks drafted from a few sentences about the project. Each task has a short description, a priority and up to 5 steps. The person picks which tasks to add to the project's first list.
- **Weekly summary**, on a project page: what got done in the last 7 days, what is at risk and what comes next. It is written from the project's history and its open tasks. The latest summary is saved, so the rest of the team reads it without paying for it again.

## How the app calls Claude

- **On the server only**, with the official Anthropic SDK for PHP (`anthropic-ai/sdk`). The key comes from `ANTHROPIC_API_KEY` and never reaches the browser.
- **Off without a key.** Without a key the buttons are hidden, and the routes answer 503.
- **Model:** `claude-opus-5-5`, or the model named in `ANTHROPIC_MODEL`. The model thinks before it answers; the effort level is `low` for steps and the summary, and `medium` for drafting tasks.
- **A fixed shape.** Each request asks for JSON that follows a schema (structured outputs). The server still checks the reply:
    - it drops empty and repeated items;
    - it shortens text that is too long;
    - it keeps only the allowed number of items.
- **Refusals.** Requests use server-side fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). A request that a safety classifier declines is retried on another model. A reply that is still a refusal shows "Claude couldn't help with this one."
- **Waiting.** A reply can take up to 90 seconds, and the SDK retries once when the service is busy. The button says Claude is writing, and the rest of the page keeps working.
- **Prompts treat board text as data.** Task titles, descriptions and the brief go between tags. The instructions say that any instructions inside them are part of the data, not requests.

## Limits

| What                | Limit                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Requests per person | 10 a minute                                                                                   |
| Requests per team   | 100 a day                                                                                     |
| A project brief     | 2,000 characters                                                                              |
| Steps suggested     | 3 to 8, and never more than the checklist has room for (50 items)                             |
| Tasks drafted       | up to 12, each with a title up to 255 characters, a description up to 1,000 and up to 5 steps |
| Summary input       | the 300 latest events of the 7 days, and up to 20 overdue and 20 upcoming tasks               |
| Summary output      | a headline, and up to 5 points each for _Done_, _At risk_ and _Next_                          |

Only requests that call Claude count towards the limits; reading the saved summary does not.

## Privacy

Nothing is sent until someone clicks a button. Then a request carries:

- **Suggest steps:** the task's title, description, priority, due date and checklist, and the project's name.
- **Draft tasks:** the brief (prefilled from the project's description), the project's name, its lists and the titles of up to 30 open tasks.
- **Weekly summary:** the project's name and lists, the titles of tasks in the week's events and open tasks, the names of the people in the events, due dates and priorities. The text of comments and the contents of files are not sent, only the fact that someone commented or attached a file.

The README says this where it explains how to set the key.

## Data model

### `project_summaries`

One saved summary per project, replaced when someone writes a new one.

| Column       | Type                   | Notes                                               |
| ------------ | ---------------------- | --------------------------------------------------- |
| `id`         | id                     |                                                     |
| `project_id` | foreign key → projects | unique, cascade on delete                           |
| `user_id`    | foreign key → users    | who asked for it; null on delete                    |
| `starts_on`  | date                   | the first of the 7 days, in that person's time zone |
| `ends_on`    | date                   | the last of the 7 days (their today)                |
| `content`    | json                   | `{headline, done[], risks[], next[]}`               |
| `model`      | string                 | the model that wrote it                             |
| timestamps   |                        | `updated_at` is when it was written                 |

### `task.created`

A task added from a draft records `task.created` with `drafted: true`. Its history then says it came from an AI draft. There is no new column.

## Suggest steps

- **Where:** a _Suggest steps_ button with a sparkles icon in the checklist's header. It shows for people who can edit the task, while the checklist has room.
- **The panel:** the suggestions appear under the header in a tinted panel. Each has a checkbox, and all start checked.
    - _Add 5 steps_ adds the checked ones at the end of the checklist, in one request, as pasted lines are added.
    - _Try again_ asks again, and the close button discards the suggestions.
- **No repeats:** the prompt asks Claude to leave out steps the checklist already has, and the server drops any that match one, ignoring case.
- **Nothing new:** when no step is left, the panel says so.

## Draft tasks

- **Where:** a _Draft tasks_ button with a sparkles icon next to _New task_ in the page header. It shows for people who can add tasks to the project, which is not the case for an archived project.
- **The dialog:** a text box asks what the project is about, prefilled with the project's description. _Draft tasks_ asks Claude.
- **The draft:** each task has a checkbox (all start checked), its priority, a two-line description and its number of steps.
    - _Add 8 tasks_ adds the checked ones, in order, at the bottom of the first list that is not the Done list. Each keeps its description, priority and steps, which become checklist items.
    - _Edit the brief_ goes back to the text box.
- **After adding:** a toast says "Added 8 tasks to To do."
- **Checks:** the add request is validated like tasks typed by hand:
    - a title up to 255 characters and a description up to 10,000;
    - steps up to 300 characters each;
    - at most 12 tasks at a time.

## Weekly summary

- **Where:** a _Weekly summary_ button in the project's card, for every member of the team.
- **The dialog:** it shows the saved summary:
    - the 7 days it covers, who asked for it and when;
    - the headline, then _Done_, _At risk_ and _Next_.
- **Actions:**
    - _Copy_ copies the summary as plain text, for a chat or an email.
    - _Write a new summary_ asks Claude again and replaces the saved one.
- **First time:** with no summary yet, the dialog says what the summary covers and offers _Write the summary_.
- **Archived projects** show their saved summary, but nobody can write a new one.
- **A quiet week:** when nothing happened in the 7 days and no open task is overdue or due soon, the dialog says so, and no request is made.

## Errors

| Case                                             | Status | Message                                                         |
| ------------------------------------------------ | ------ | --------------------------------------------------------------- |
| No key                                           | 503    | AI helpers are off. Add `ANTHROPIC_API_KEY` to turn them on.    |
| Too many requests from one person                | 429    | Too many AI requests. Try again in a minute.                    |
| The team's requests for the day are used up      | 429    | Your team has used today's 100 AI requests. Try again tomorrow. |
| Claude is busy, unreachable or too slow          | 503    | Claude is busy right now. Try again in a moment.                |
| A wrong key, no credit or no access to the model | 503    | AI helpers aren't set up correctly. The details go to the log.  |
| A refusal, after the fallback                    | 422    | Claude couldn't help with this one.                             |
| A reply cut short or in the wrong shape          | 502    | Claude's reply couldn't be used. Try again.                     |

Every request that reaches Claude is logged with its purpose, model, tokens and stop reason, for an idea of the cost.

## Permissions

- **Suggest steps:** whoever can edit the task.
- **Draft and add tasks:** whoever can add tasks to the project's lists.
- **Weekly summary:** every member of the team reads it, and any member writes a new one while the project is not archived.

## Routes

| Method | Path                                      | Name               | Returns                      |
| ------ | ----------------------------------------- | ------------------ | ---------------------------- |
| POST   | `/{team}/tasks/{task}/ai/steps`           | `ai.steps`         | `{steps: string[]}`          |
| POST   | `/{team}/projects/{project}/ai/tasks`     | `ai.tasks.draft`   | `{tasks: Draft[]}`           |
| POST   | `/{team}/projects/{project}/ai/tasks/add` | `ai.tasks.store`   | back to the page             |
| GET    | `/{team}/projects/{project}/ai/summary`   | `ai.summary.show`  | `{summary: Summary \| null}` |
| POST   | `/{team}/projects/{project}/ai/summary`   | `ai.summary.store` | `{summary: Summary}`         |

The three routes that call Claude use the `ai` rate limiter.

## Tests

- A fake assistant stands in for Claude in feature tests, so the suite needs no key and costs nothing. It records the prompts, so tests can check what would be sent.
- The Claude client itself is tested against a fake HTTP transport. Those tests check the request it builds (model, effort, schema, fallbacks) and how it reads replies, refusals and errors.

## Out of scope

- Showing the reply while Claude writes it (streaming).
- A team setting that turns the helpers off, and a usage report.
- Running requests on a queue. The queue worker arrives with _Production readiness_.
- Other AI providers.

## Decisions

1. **No wireframe round:** build straight away (the owner, 16 November).
2. **Claude through the official SDK:** `claude-opus-5-5` by default, with a different model allowed through `ANTHROPIC_MODEL` (the owner chose Claude, 16 November).
3. **Drafts first:** nothing Claude writes changes the board until a person clicks _Add_ (proposed).
4. **One saved summary per project:** a new one replaces it (proposed).
5. **Limits:** 10 requests a minute per person and 100 a day per team (proposed).

## Acceptance criteria

- [x] Without a key, no AI button shows and the routes answer 503.
- [x] _Suggest steps_ adds only the checked suggestions, at the end of the checklist, and never goes over 50 items.
- [x] _Draft tasks_ adds the checked tasks to the first list that is not the Done list, with their descriptions, priorities and steps, and their history says they came from an AI draft.
- [x] _Weekly summary_ is saved per project, shown to every member, and replaced by _Write a new summary_.
- [x] A quiet week makes no request.
- [x] Refusals, timeouts, a wrong key and a reply in the wrong shape each show their message, and nothing changes on the board.
- [x] The limits answer 429 with their message.
- [x] Tests run without a key and make no network request.
