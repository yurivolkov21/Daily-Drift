# Spec 0012: Production readiness

**Status:** Planned · **Phase:** 3 · **Roadmap:** [Phase 3](../plan/roadmap.md#phase-3-advanced-in-progress) · **Design:** no new screens

## Goal

Run Daily-Drift on the internet, on Render in Singapore (the owner's choice, 17 November), with:

- PostgreSQL;
- a queue worker and the scheduler;
- files kept outside the server;
- safe defaults for a public site;
- one documented way to deploy.

Local development stays as it is: SQLite, files on the disk, `composer dev`.

## What runs where

| Piece                  | Where                                       | Notes                                                                                         |
| ---------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The app                | One Render web service, from a Docker image | nginx and PHP-FPM, with the queue worker and the scheduler in the same container (decision 2) |
| Database               | Render Postgres, same region                | Decision 3                                                                                    |
| Files                  | A private S3-compatible bucket              | Attachments only; decision 4                                                                  |
| Cache, sessions, queue | The database                                | No Redis at this size                                                                         |
| Email                  | Decision 5                                  | Verification, password resets and team invitations                                            |

## PostgreSQL

- **Production** runs on PostgreSQL, in the version Render offers by default.
- **CI runs the tests twice:** on SQLite, as now, and on PostgreSQL in a service container. A query that works on only one of them fails the pull request.
- **Already handled:**
    - search uses `whereLike`, which is `ilike` on PostgreSQL, so it stays case-insensitive;
    - the Done list's partial unique index is created on both databases.

## Queue and scheduler

- **Queue:** the database queue, with a worker supervised in the container (`queue:work`, 3 tries; it restarts after an hour or on deploy). Today it sends team invitations; the next roadmap item adds email notifications.
- **Scheduler:** `schedule:work` in the same container. Today it deletes expired invitations once a day. Scheduled tasks run on one server only (`onOneServer`), so a second instance later would not run them twice.
- **Failed jobs** stay in `failed_jobs` and are listed with `php artisan queue:failed`.

## Files

- **Disk:** attachments are written to the default disk. Production sets it to `s3`, with any S3-compatible bucket; local development keeps `local`. This adds `league/flysystem-aws-s3-v3`.
- **Downloads** still go through `attachments.show`, so the bucket stays private and the safety headers from spec 0010 stay on every download.
- **The demo seeder** writes its files through the same disk.

## Safety on a public site

- **HTTPS:** the app trusts Render's proxy for the scheme and the visitor's address, makes HTTPS links, sends cookies only over HTTPS, and sends `Strict-Transport-Security`.
- **Headers on every page:**
    - `X-Content-Type-Options: nosniff`;
    - `Referrer-Policy: strict-origin-when-cross-origin`;
    - `X-Frame-Options: DENY`;
    - a `Permissions-Policy` that turns off the camera, microphone and location.
- **Configuration:** `APP_DEBUG=false`, logs to the standard error stream (Render keeps them), and the config, routes, views and events cached at start.
- **Not in this spec:** a full Content-Security-Policy. Inertia and Vite need nonces for one, which is a change of its own.

## Rate limits

Already in place:

- sign-in: 5 a minute per email and address;
- two-factor codes and passkeys: Fortify's limits;
- Google and GitHub callbacks: 10 a minute;
- uploads: 30 a minute per person;
- AI helpers: 10 a minute per person and 100 a day per team.

New:

| What                | Limit                                                   | Why                                 |
| ------------------- | ------------------------------------------------------- | ----------------------------------- |
| Sign-up             | 5 an hour per address                                   | Each sign-up sends an email         |
| Team invitations    | 20 an hour per team                                     | Each invitation sends an email      |
| Every other request | 240 a minute per person, or per address when signed out | Stops scripts, far above normal use |

Each answers 429 with a short message.

## Deploying

- **`Dockerfile`**, built in three stages:
    1. Node 24 and pnpm build the front end;
    2. Composer installs the PHP packages without the dev ones;
    3. the final image is based on `serversideup/php` 8.4 with nginx and PHP-FPM, PHP 8.4.27 or newer, and the PostgreSQL driver, and runs the queue worker and the scheduler as extra supervised services.
- **`render.yaml`** (a Render Blueprint) describes:
    - the web service: Docker, Singapore, health check `/up`, deploys from `main`;
    - the database;
    - the environment variables. Secrets are marked to be entered in the dashboard; `APP_KEY` is generated.
- **On start:** caches, then `migrate --force`, then serve. This works on every plan; the free plan has no pre-deploy command.
- **A deploy** is a push to `main`. CI already has to pass before a pull request merges.
- **`docs/guides/deploy-render.md`** covers:
    - the first setup: the Blueprint, the secrets and the bucket;
    - what each variable does;
    - how to roll back;
    - how to run a command on the server.

## Costs

With the proposed decisions, about **US$13 a month**:

- the Starter web service, $7;
- Render Postgres Basic, about $6 (to confirm on Render's pricing page when the database is created);
- the bucket, on Cloudflare R2's free tier (10 GB, no fee for downloads).

The AI helpers stay off in production until the owner adds `ANTHROPIC_API_KEY`. When on, their limits from spec 0011 cap the cost.

## Out of scope

- Several instances, autoscaling, Redis and Octane.
- A CDN for the built assets.
- A strict Content-Security-Policy.
- Error tracking and uptime monitoring.
- Email notifications (the next roadmap item).

## Decisions

1. **Platform:** Render, in Singapore (the owner, 17 November).
2. **Compute:** one Starter web service at $7 a month, always on, running the app, the queue worker and the scheduler. _Proposed._
    - The free plan sleeps after 15 minutes: the first visit then waits about 30 to 60 seconds, and the queue and the scheduler stop while it sleeps.
    - A separate background worker would cost $7 more.
3. **Database:** Render Postgres Basic, in the same region, with Render's daily backups. _Proposed._ Render's free database is deleted after 30 days.
4. **Files:** a private Cloudflare R2 bucket, free up to 10 GB. _Proposed._
    - A Render disk costs $0.25 per GB, but it needs a paid instance and stops the app during every deploy.
    - Supabase Storage is free up to 1 GB, but a free Supabase project pauses when it is idle for a week.
5. **Address and email:** start on the `onrender.com` address with emails in the log. _Proposed._
    - Visitors sign in with Google, GitHub or the demo account.
    - A domain and a mail provider (Resend) come with the email notifications item, which needs them anyway.
    - If the owner already has a domain, both can come now.
6. **Demo data:** seed the demo workspace once, on the first deploy, with its sign-in in the README. _Proposed._ A nightly reset can follow if visitors change too much.

## Acceptance criteria

- [ ] CI runs the tests on SQLite and on PostgreSQL, and both pass.
- [ ] A deploy from `render.yaml` serves the app over HTTPS on the Render address, and `/up` answers 200.
- [ ] An attachment uploaded in production is stored in the bucket and still downloads after a redeploy.
- [ ] A team invitation goes through the queue, and the scheduler's daily task runs.
- [ ] Every page has the security headers, and cookies are marked `Secure`.
- [ ] The new rate limits answer 429.
- [ ] The deploy guide, README, changelog and roadmap are updated.
