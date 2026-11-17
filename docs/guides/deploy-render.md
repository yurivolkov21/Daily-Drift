# Deploying to Render

This guide puts Daily-Drift on the internet as [spec 0012](../spec/0012-production-readiness.md) describes: one Render web service in Singapore, a free Supabase database and a free Cloudflare R2 bucket. It costs about **US$7 a month**, for the Render service.

You need accounts at [Render](https://render.com), [Supabase](https://supabase.com) and [Cloudflare](https://dash.cloudflare.com), and the Daily-Drift repository on your GitHub account. It takes about 30 minutes, most of it waiting for the first build.

Keep every secret in the dashboards only: never paste one into an issue, a chat or a commit.

## 1. The database, on Supabase

1. In the Supabase dashboard, click **New project**:
    - **Name:** `daily-drift`.
    - **Database password:** at least 20 characters, **letters and digits only**. It goes into a URL, where any other character would need percent-encoding. Keep it somewhere safe.
    - **Region:** Southeast Asia (Singapore).
    - **Plan:** Free.
2. When the project is ready, click **Connect** at the top of its page and choose **Session pooler**. Copy the URI, which looks like this:

    ```text
    postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
    ```

3. Put the password in place of `[YOUR-PASSWORD]`. This is **`DB_URL`**.

Why the session pooler:

- **Not the direct connection:** it is IPv6 only, and Render cannot reach IPv6 addresses.
- **Not the transaction pooler** (port 6543): it breaks the prepared statements Laravel uses.

The free plan keeps no backups, so the app makes its own (see [Backups](#backups)). Supabase pauses a free project after a week without activity. The queue worker's checks probably count as activity, but that is not certain. A paused project keeps its data: **Restore project** in the Supabase dashboard brings it back.

## 2. The bucket, on Cloudflare R2

1. In the Cloudflare dashboard, open **R2 Object Storage**. The first time, Cloudflare may ask for a payment method; the free tier (10 GB, with no fee for downloads) is not charged.
2. Click **Create bucket**:
    - **Name:** `daily-drift`.
    - **Location:** Asia-Pacific.
    - Leave it private: no public access and no custom domain. The app sends every file itself.
3. Back on the R2 page, open **Manage API tokens** and create a token:
    - **Permissions:** Object Read & Write.
    - **Bucket:** `daily-drift` only.
4. Copy what the page shows once:
    - the **Access Key ID**: this is **`AWS_ACCESS_KEY_ID`**;
    - the **Secret Access Key**: this is **`AWS_SECRET_ACCESS_KEY`**;
    - the S3 endpoint, `https://<account id>.r2.cloudflarestorage.com`, without the bucket name: this is **`AWS_ENDPOINT`**.

**`AWS_BUCKET`** is `daily-drift`.

## 3. The app key

Make a key in a local copy of the app:

```bash
php artisan key:generate --show
```

Without PHP, this makes the same kind of key:

```bash
echo "base64:$(openssl rand -base64 32)"
```

The whole line, `base64:` included, is **`APP_KEY`**. Keep it: a new key signs everyone out, makes two-factor secrets unreadable, and stops passkeys from working (see `PASSKEYS_USER_HANDLE_SECRET` in `.env.example`).

## 4. The service, on Render

1. In the Render dashboard, click **New → Blueprint** and connect the Daily-Drift repository. Render reads `render.yaml` and shows one web service, `daily-drift`, on the Starter plan in Singapore.
2. Render asks for the six values that `render.yaml` leaves out:
    - `APP_KEY`;
    - `DB_URL`;
    - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET` and `AWS_ENDPOINT`.
3. Click **Apply**. The first deploy builds the image, which takes about 5 to 10 minutes. On start, the container migrates the database. After the first deploy, Render seeds the demo workspace once.
4. Open the address Render shows, such as `https://daily-drift.onrender.com` (Render adds a suffix when the name is taken).
    - `/up` answers 200.
    - The demo account is `test@example.com` with the password `password`.

The app uses Render's address for links in emails. Once you add your own domain, set `APP_URL` to it.

### Later, if you want them

- **Google and GitHub sign-in:** create production keys with the return addresses on your Render address, then add the four `GOOGLE_*` and `GITHUB_*` variables in the service's **Environment** ([setup guide](social-sign-in.md)).
- **AI helpers:** add `ANTHROPIC_API_KEY` in **Environment** ([spec 0011](../spec/0011-ai-helpers.md)). Their limits cap the cost.

## What each variable does

`render.yaml` sets these, apart from the six secrets:

| Variable                                            | Value                 | Why                                                                                                    |
| --------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `APP_ENV`, `APP_DEBUG`                              | `production`, `false` | No error details on screen, HTTPS links only, and strong passwords for new accounts.                   |
| `LOG_LEVEL`                                         | `debug`               | Emails go to the log, and the log mailer writes at debug level. Use `info` once a mail provider is on. |
| `MAIL_MAILER`                                       | `log`                 | Emails are written to the log instead of being sent (decision 5).                                      |
| `TRUSTED_PROXIES`                                   | `*`                   | Render's proxy gives the visitor's address and HTTPS. Without it, all visitors share one rate limit.   |
| `PORT`                                              | `8080`                | nginx in the image listens there.                                                                      |
| `DB_CONNECTION`, `DB_SSLMODE`                       | `pgsql`, `require`    | PostgreSQL over TLS.                                                                                   |
| `SESSION_DRIVER`, `CACHE_STORE`, `QUEUE_CONNECTION` | `database`            | No Redis at this size.                                                                                 |
| `SESSION_SECURE_COOKIE`                             | `true`                | Cookies only over HTTPS.                                                                               |
| `FILESYSTEM_DISK`                                   | `s3`                  | Attachments and backups go to the bucket.                                                              |
| `AWS_DEFAULT_REGION`, `AWS_USE_PATH_STYLE_ENDPOINT` | `auto`, `true`        | What R2 expects.                                                                                       |

The image itself sets `LOG_CHANNEL=stderr`, so the logs appear in Render's **Logs** tab, and turns on OPcache.

## Day to day

- **Deploying:** merge a pull request into `main`. Render deploys the new commit once its CI checks pass. The old version keeps serving until the new one answers `/up`.
- **Logs:** the service's **Logs** tab shows requests, the queue worker, the scheduler and the emails.
- **Rolling back:** in the service's **Events**, pick an earlier deploy and click **Rollback**. Migrations are not undone, so after one the old code may not fit the database: fix forward instead.
- **Running a command:** the service's **Shell** tab opens a terminal in the running container, for example:
    - `php artisan queue:failed` lists failed jobs;
    - `php artisan db:backup` makes a backup now;
    - `php artisan about` shows the settings in use.

## Backups

- **When:** every Sunday at 03:00, Vietnam time.
- **Where:** the bucket, under `backups/`, as `db-<date and time in UTC>.dump`. The 8 latest are kept.
- **What:** the app's own tables (the `public` schema), not Supabase's.

To restore one into an **empty** database, such as a new Supabase project:

1. Download the dump from the bucket in the R2 dashboard.
2. Load it with PostgreSQL 17's `pg_restore`, with the new database's session pooler URI:

    ```bash
    pg_restore --schema=public --no-owner --no-privileges --dbname="postgresql://postgres.newproject:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" db-2026-11-22-200000.dump
    ```

    `pg_restore` 17 is also in the image, so the service's **Shell** can run this command.

3. Set `DB_URL` to the new database and redeploy.

## If something goes wrong

| Problem                                                                             | Fix                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The build stops at `composer install` with a GitHub limit or authentication message | GitHub limits downloads without a token. Add a secret file named `auth.json` in the service's **Environment**, with `{"github-oauth": {"github.com": "a token"}}`, and deploy again. A fine-grained token with read access to public repositories is enough. |
| The deploy waits for the database, then fails                                       | The Supabase project may be paused: restore it, then deploy again. Check `DB_URL` too.                                                                                                                                                                       |
| Uploads fail                                                                        | Check the four `AWS_*` secrets. The R2 token needs Object Read & Write on the bucket.                                                                                                                                                                        |
| Everyone gets _Too many requests_ at once, or links start with `http://`            | `TRUSTED_PROXIES` must be `*`.                                                                                                                                                                                                                               |
| An email never shows up in the logs                                                 | `LOG_LEVEL` must be `debug` while `MAIL_MAILER` is `log`.                                                                                                                                                                                                    |
| The demo account's password was changed                                             | Anyone can sign in as the demo account. Reset it in the **Shell**: `php artisan tinker --execute="App\Models\User::where('email', 'test@example.com')->update(['password' => bcrypt('password')]);"`                                                         |
