# Spec 0012: Production readiness

**Status:** In progress: the code is done, and the deploy waits for the owner · **Phase:** 3 · **Roadmap:** [Phase 3](../plan/roadmap.md#phase-3-advanced-in-progress) · **Design:** no new screens

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
    - The connection is one secret, `DB_URL`: the session pooler's URI from the Supabase dashboard.
- **CI runs the tests twice:** on SQLite, as now, and on PostgreSQL 17 in a service container, both inside the required `ci` check. A query that works on only one of them fails the pull request.
- **Already handled:**
    - search uses `whereLike`, which is `ilike` on PostgreSQL, so it stays case-insensitive;
    - the Done list's partial unique index is created on both databases.
- **Fixed for PostgreSQL:**
    - adding a task locks its list's row. It used to count the list's tasks with `FOR UPDATE`, which PostgreSQL refuses, and on PostgreSQL locking the existing tasks would not stop two new ones from getting the same position;
    - the four people in the header are ordered by when they joined and then by membership, since PostgreSQL returns tied rows in no set order.

## Backups

Supabase's free plan keeps no backups, so the app makes its own:

- **What:** `php artisan db:backup` runs `pg_dump` (custom format) and streams the file to the bucket, under `backups/`, as `db-<UTC date and time>.dump`. It keeps the 8 latest.
- **Only the app's tables:** it dumps the `public` schema. On Supabase the database also holds Supabase's own schemas, which a restore must not touch.
- **The password** reaches `pg_dump` through libpq's variables, never the command line.
- **When:** the scheduler runs it every Sunday at 03:00, Vietnam time.
- **Restoring:** `pg_restore --schema=public --no-owner --no-privileges` into an empty database, as the deploy guide shows. Restoring every schema would fail on the `public` schema, which a new database already has.
- **Other databases:** on SQLite (local development) the command says there is nothing to back up.

## Queue and scheduler

- **Queue:** the database queue, with a worker supervised in the container (`queue:work`, 3 tries; it restarts after an hour or on deploy). Today it sends team invitations; the next roadmap item adds email notifications.
- **Scheduler:** `schedule:work` in the same container. It deletes expired invitations once a day and makes the weekly backup. Scheduled tasks run on one server only (`onOneServer`), so a second instance later would not run them twice.
- **Failed jobs** stay in `failed_jobs` and are listed with `php artisan queue:failed`.
- **Keeping the database awake:** the worker checks the queue every few seconds. That is likely enough for Supabase not to see the project as idle and pause it, but this is not certain. A paused project keeps its data and is restored from the Supabase dashboard.

## Files

- **Disk:** attachments are written to the default disk. Production sets it to `s3`, with any S3-compatible bucket; local development keeps `local`.
- **Package:** `league/flysystem-aws-s3-v3`. Composer keeps only the S3 part of the AWS SDK, which takes it from 302 MB to 14 MB. Checksums are sent only where S3 needs them, since not every S3-compatible service accepts the newer ones.
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

Only sign-ups and invitations that go through count. Past the limit, the form says so under the email field. Every other request past its limit answers 429.

## Deploying

- **`Dockerfile`**, built in four stages, all on Debian trixie:
    1. Composer's image downloads the PHP packages without the dev ones. It has git, so a package GitHub will not send as a zip is cloned instead. A secret file named `auth.json` on the service, if there is one, gives Composer a GitHub token.
    2. `serversideup/php` 8.4 makes the autoloader, on the PHP the app runs on.
    3. Node 24 and pnpm build the front end in the same image, since Wayfinder writes the route helpers with Artisan while Vite builds.
    4. The final image is `serversideup/php` 8.4 with nginx and PHP-FPM. It has:
        - PHP 8.4.27 or newer, with OPcache on and the PostgreSQL driver;
        - `pg_dump` and `pg_restore` 17, copied from the PostgreSQL image, which run on the libraries the PHP image already has. The build fails if `pg_dump` cannot run;
        - the queue worker and the scheduler as S6 services next to nginx and PHP-FPM, started once PHP-FPM is up (`docker/s6/`);
        - nginx on port 8080, over IPv4 only, taking request bodies up to 12 MB.
- **`render.yaml`** (a Render Blueprint) describes:
    - the web service: Docker, Singapore, Starter plan, health check `/up`;
    - deploys: each new commit on `main`, once its CI checks pass (`autoDeployTrigger: checksPass`);
    - the demo workspace, seeded once after the first deploy (`initialDeployHook`, decision 6);
    - the environment variables. Six secrets are entered in the dashboard: `APP_KEY`, `DB_URL` and four for the bucket. `APP_KEY` comes from `php artisan key:generate --show`, because Render's generated values are not in Laravel's key format.
- **`APP_URL`** falls back to `RENDER_EXTERNAL_URL`, the address Render gives the service, which is not known before the service exists. Queued emails need it for their links.
- **Emails in the log** need `LOG_LEVEL=debug`, the level the log mailer writes at.
- **On start:** the image migrates, then caches the config, routes, views and events, then serves. This works on every plan, since the free plan has no pre-deploy command.
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
    - Anyone can sign in as the demo account, so anyone can also change its password. The deploy guide says how to set it back.
7. **When to deploy:** the owner decides later, since it is the step that costs money (the owner, 17 November).

## Acceptance criteria

The code:

- [x] CI runs the tests on SQLite and on PostgreSQL 17, and both pass.
- [x] The Docker image builds. Run locally in production mode with PostgreSQL 17 and an S3-compatible server (RustFS, since MinIO's images are no longer on Docker Hub), behind a proxy that says HTTPS, it:
    - answers `/up`;
    - seeds the demo as Render's hook does, with its files in the bucket;
    - signs in over HTTPS with secure cookies;
    - stores uploads in the bucket and sends them back with their own headers;
    - runs a queued invitation, whose email reaches the log, and keeps the queue worker and the scheduler running;
    - sends the security headers.
- [x] `db:backup` writes a dump to the bucket and keeps the 8 latest, and the dump restores into an empty database.
- [x] The new rate limits refuse past their limit: the forms with a message, other requests with 429.
- [x] The deploy guide, README, changelog and roadmap are updated.

The deploy, once the owner says go:

- [ ] A deploy from `render.yaml` serves the app over HTTPS on the Render address, and `/up` answers 200.
- [ ] An attachment uploaded in production is stored in the bucket and still downloads after a redeploy.
- [ ] A team invitation goes through the queue, and the scheduler's tasks run.
