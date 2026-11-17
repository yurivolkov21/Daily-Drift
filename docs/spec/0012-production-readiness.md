# Spec 0012: Production readiness

**Status:** In progress · **Phase:** 3 · **Roadmap:** [Phase 3](../plan/roadmap.md#phase-3-advanced-in-progress) · **Design:** no new screens

## Goal

Make Daily-Drift ready to run on the internet, on Render in Singapore (the owner's choice, 17 November), with:

- PostgreSQL;
- a queue worker and the scheduler;
- files kept outside the server;
- safe defaults for a public site;
- one documented way to deploy.

The code is done first. The deploy itself waits for the owner's go-ahead, because it is the step that costs money.

Local development stays as it is: SQLite, files on the disk, `composer dev`.

## What runs where

| Piece                  | Where                                       | Notes                                                                                         |
| ---------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The app                | One Render web service, from a Docker image | nginx and PHP-FPM, with the queue worker and the scheduler in the same container (decision 2) |
| Database               | Supabase Postgres 17, free plan, Singapore  | Reached through Supabase's session pooler (decision 3)                                        |
| Files                  | A private S3-compatible bucket              | Attachments and database backups (decision 4)                                                 |
| Cache, sessions, queue | The database                                | No Redis at this size                                                                         |
| Email                  | The log, for now (decision 5)               | Verification, password resets and team invitations                                            |

## PostgreSQL

- **Production** runs on PostgreSQL 17 at Supabase, in Singapore (`ap-southeast-1`), next to Render's Singapore region.
- **Connection:**
    - Render cannot reach IPv6 addresses, and Supabase's direct connection is IPv6 only. The app therefore connects through Supabase's shared pooler, which is IPv4, in session mode (port 5432).
    - Transaction mode (port 6543) is not used, because it breaks the prepared statements Laravel relies on.
    - Connections use TLS (`DB_SSLMODE=require`).
- **CI runs the tests twice:** on SQLite, as now, and on PostgreSQL 17 in a service container, both inside the required `ci` check. A query that works on only one of them fails the pull request.
- **Already handled:**
    - search uses `whereLike`, which is `ilike` on PostgreSQL, so it stays case-insensitive;
    - the Done list's partial unique index is created on both databases.

## Backups

Supabase's free plan keeps no backups, so the app makes its own:

- **What:** `php artisan db:backup` runs `pg_dump` (custom format) and stores the file in the bucket, under `backups/`. It keeps the 8 latest.
- **When:** the scheduler runs it every Sunday at 03:00, Vietnam time.
- **Restoring** with `pg_restore` is covered in the deploy guide.
- **Other databases:** on SQLite (local development) the command says there is nothing to back up.

## Queue and scheduler

- **Queue:** the database queue, with a worker supervised in the container (`queue:work`, 3 tries; it restarts after an hour or on deploy). Today it sends team invitations; the next roadmap item adds email notifications.
- **Scheduler:** `schedule:work` in the same container. It deletes expired invitations once a day and makes the weekly backup. Scheduled tasks run on one server only (`onOneServer`), so a second instance later would not run them twice.
- **Failed jobs** stay in `failed_jobs` and are listed with `php artisan queue:failed`.
- **Keeping the database awake:** the worker checks the queue every few seconds. That is likely enough for Supabase not to see the project as idle and pause it, but this is not certain. A paused project keeps its data and is restored from the Supabase dashboard.

## Files

- **Disk:** attachments are written to the default disk. Production sets it to `s3`, with any S3-compatible bucket; local development keeps `local`. This adds `league/flysystem-aws-s3-v3`.
- **Downloads** still go through `attachments.show`, so the bucket stays private and the safety headers from spec 0010 stay on every download.
- **The demo seeder** writes its files through the same disk.

## Safety on a public site

- **HTTPS:**
    - the app trusts the proxies named in `TRUSTED_PROXIES` (`*` on Render, where every request comes through Render's proxy) for the scheme and the visitor's address;
    - in production it makes HTTPS links only, sends cookies only over HTTPS, and sends `Strict-Transport-Security`.
- **Headers on every page:**
    - `X-Content-Type-Options: nosniff`;
    - `Referrer-Policy: strict-origin-when-cross-origin`;
    - `X-Frame-Options: DENY`;
    - a `Permissions-Policy` that turns off the camera, microphone and location.

    A response that already sets one of them, such as a file download, keeps its own.

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
    3. the final image is based on `serversideup/php` 8.4 with nginx and PHP-FPM. It has PHP 8.4.27 or newer, the PostgreSQL driver and `pg_dump` 17, and it runs the queue worker and the scheduler as extra supervised services.
- **`render.yaml`** (a Render Blueprint) describes:
    - the web service: Docker, Singapore, Starter plan, health check `/up`, deploys from `main`;
    - the environment variables. Secrets and the database settings are marked to be entered in the dashboard. That includes `APP_KEY`, from `php artisan key:generate --show`, because Render's generated values are not in Laravel's key format.
- **On start:** caches, then `migrate --force`, then serve. This works on every plan, since the free plan has no pre-deploy command.
- **A deploy** is a push to `main`. CI already has to pass before a pull request merges.
- **`docs/guides/deploy-render.md`** covers:
    - the first setup: the Supabase project, the bucket, the Blueprint and the secrets;
    - what each variable does;
    - how to roll back;
    - how to run a command on the server;
    - how to restore a backup.

## Costs

About **US$7 a month**:

- the Starter web service, $7;
- the database, on Supabase's free plan (500 MB, 2 active projects per account);
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
2. **Compute:** one Starter web service at $7 a month, always on, running the app, the queue worker and the scheduler (kept by the owner, 17 November).
    - The free plan sleeps after 15 minutes: the first visit then waits about 30 to 60 seconds, and the queue and the scheduler stop while it sleeps.
    - A separate background worker would cost $7 more.
3. **Database:** Supabase Postgres on the free plan, in Singapore, through the session pooler, with the app's own weekly backups (the owner, 17 November).
    - The owner asked to stay under $10 a month.
    - Render Postgres Basic, about $6 a month with daily backups, remains the fallback if Supabase pauses the project or the data starts to matter.
4. **Files:** a private Cloudflare R2 bucket, free up to 10 GB (kept by the owner, 17 November).
    - A Render disk costs $0.25 per GB, but it needs a paid instance and stops the app during every deploy.
    - Supabase Storage is free up to 1 GB, under the same pausing rule as the database.
5. **Address and email:** start on the `onrender.com` address with emails in the log (kept by the owner, 17 November).
    - Visitors sign in with Google, GitHub or the demo account.
    - A domain and a mail provider (Resend) come with the email notifications item, which needs them anyway.
6. **Demo data:** seed the demo workspace once, on the first deploy, with its sign-in in the README (kept by the owner, 17 November). A nightly reset can follow if visitors change too much.
7. **When to deploy:** the owner decides later, since it is the step that costs money (the owner, 17 November).

## Acceptance criteria

The code:

- [ ] CI runs the tests on SQLite and on PostgreSQL 17, and both pass.
- [ ] The Docker image builds. Run locally with PostgreSQL and an S3-compatible bucket (MinIO), it:
    - answers `/up`;
    - stores attachments in the bucket;
    - runs the queue worker and the scheduler;
    - sends the security headers.
- [ ] `db:backup` writes a dump to the bucket and keeps the 8 latest.
- [ ] The new rate limits answer 429.
- [ ] The deploy guide, README, changelog and roadmap are updated.

The deploy, once the owner says go:

- [ ] A deploy from `render.yaml` serves the app over HTTPS on the Render address, and `/up` answers 200.
- [ ] An attachment uploaded in production is stored in the bucket and still downloads after a redeploy.
- [ ] A team invitation goes through the queue, and the scheduler's tasks run.
