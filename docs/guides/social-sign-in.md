# Setting up sign in with Google and GitHub

The _Google_ and _GitHub_ buttons ([spec 0009](../spec/0009-sign-in-with-google-and-github.md)) appear only when the app has that provider's client id and secret. This guide gets both for a local copy of Daily-Drift at `http://localhost:8000`, then lists what changes for a live site.

You need a Google account and a GitHub account. Each provider takes about five minutes.

## Before you start

- Open the app at **`http://localhost:8000`**, not `http://127.0.0.1:8000`. The providers compare the return address letter by letter, and these are two different addresses to them.
- The return addresses are:
    - Google: `http://localhost:8000/auth/google/callback`
    - GitHub: `http://localhost:8000/auth/github/callback`
- Keep the secrets in `.env` only. `.env` is not committed; never paste a secret into an issue, a chat or a commit.

## Google

1. Go to the [Google Cloud console](https://console.cloud.google.com/) and sign in.
2. In the project picker at the top, choose **New project**, name it `Daily-Drift`, and select it once it is created.
3. Open **Google Auth Platform** (in older consoles: _APIs & Services → OAuth consent screen_) and click **Get started**:
    1. **App information:** app name `Daily-Drift`, and your email as the user support email.
    2. **Audience:** choose **External**.
    3. **Contact information:** your email.
    4. Agree to the policy and click **Create**.
4. Still in Google Auth Platform, open **Audience** and, under **Test users**, add the Google account you will sign in with. While the app is in _Testing_, only these accounts can use it, and Google warns that the app is unverified; that is expected for a local copy.
5. Open **Clients** (older consoles: _APIs & Services → Credentials → Create credentials → OAuth client ID_) and click **Create client**:
    1. **Application type:** Web application.
    2. **Name:** `Daily-Drift local`.
    3. **Authorized JavaScript origins:** add `http://localhost:8000`.
    4. **Authorized redirect URIs:** add `http://localhost:8000/auth/google/callback`.
    5. Click **Create**.
6. Copy the **Client ID** and the **Client secret** from the dialog (the secret can also be found later under the client).
7. In `.env`:

    ```dotenv
    GOOGLE_CLIENT_ID=the-client-id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=the-client-secret
    ```

The app asks Google only for `openid`, `email` and `profile`, which need no review.

## GitHub

1. Go to **GitHub → Settings → Developer settings → OAuth Apps** and click **New OAuth App** ([direct link](https://github.com/settings/applications/new)).
2. Fill in:
    - **Application name:** `Daily-Drift (local)`
    - **Homepage URL:** `http://localhost:8000`
    - **Authorization callback URL:** `http://localhost:8000/auth/github/callback`
    - Leave **Enable Device Flow** off.
3. Click **Register application**.
4. Copy the **Client ID**, then click **Generate a new client secret** and copy it right away: GitHub shows it only once.
5. In `.env`:

    ```dotenv
    GITHUB_CLIENT_ID=the-client-id
    GITHUB_CLIENT_SECRET=the-client-secret
    ```

The app asks GitHub for `user:email` only, to read your primary, verified email even when it is private.

## Try it

1. If the configuration was cached, clear it: `php artisan config:clear`.
2. Open `http://localhost:8000/login`. Under the form, _or continue with_ now shows **Google** and **GitHub**.
3. Sign up with one of them in a private window: you land on the dashboard with a personal team, and _Settings → Security_ offers _Set a password_.
4. Sign in with your usual account, open _Settings → Security_, and **Connect** the other provider.

## A live site

- Give each environment its own credentials:
    - **Google:** add the live site's origin and `https://your-domain/auth/google/callback` to the same client, or create a second client.
    - **GitHub:** an OAuth app has one callback URL, so register a second app for the live site with `https://your-domain/auth/github/callback`.
- On Google, publish the app (_Audience → Publish app_) so that anyone, not only test users, can sign in.
- Set the four variables in the host's environment settings, not in a committed file.

## When it goes wrong

| What you see                                                              | Why, and the fix                                                                                                                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No Google or GitHub button                                                | The id or the secret is missing in `.env`, or the configuration is cached: run `php artisan config:clear`.                                                            |
| Google: `Error 400: redirect_uri_mismatch`                                | The address you opened differs from the authorized redirect URI. Open the app at `http://localhost:8000` and check the URI in the client.                             |
| GitHub: _The redirect_uri is not associated with this application_        | The callback URL of the OAuth app differs from the address you opened.                                                                                                |
| Google: _Access blocked_ or _This app is blocked_                         | Your account is not a test user. Add it under _Audience → Test users_.                                                                                                |
| _Sign in with GitHub was cancelled_                                       | You pressed _Cancel_ on the provider's page. Nothing was created.                                                                                                     |
| _GitHub did not share a verified email_                                   | Your primary email on GitHub is not verified. Verify it under _GitHub → Settings → Emails_.                                                                           |
| _That email already has an account here, and Google could not confirm it_ | The provider says the email is not verified, so the app will not attach it to the existing account. Sign in with the password and connect from _Settings → Security_. |
