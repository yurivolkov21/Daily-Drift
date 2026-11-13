# Spec 0009: Sign in with Google and GitHub

**Status:** Done · **Phase:** 3 · **Roadmap:** [Phase 3](../plan/roadmap.md#phase-3-advanced-in-progress) · **Design:** [round 9](../design/README.md#how-it-was-chosen)

## Goal

Let people sign up and sign in with a Google or GitHub account instead of a password, and connect either account to an existing one. Nothing else about accounts changes: two-factor authentication, passkeys, teams and invitations keep working, and nobody can lock themselves out.

## How it works

- [Laravel Socialite](https://laravel.com/docs/socialite), the first-party package, runs the OAuth exchange with Google and GitHub. Only the provider's user id, email and name are read; no access token is kept, since the app never calls the providers again.
- A provider shows on the pages only when its client id and secret are set (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`). Without them the app looks and works as today.
- GitHub is asked for the `user:email` scope, so a person whose email is private still has one: their primary, verified address.
- Getting the keys from Google and GitHub, step by step: [setting up sign in with Google and GitHub](../guides/social-sign-in.md).

## Signing in and up

- The sign-in and sign-up cards get _Continue with Google_ and _Continue with GitHub_ buttons. Both pages do the same thing: the provider decides whether this is a new account.
- **A connected account** signs its person in.
- **A new email** creates an account, as signing up does: the name and email from the provider, the email marked verified, no password, and a personal team. The time zone follows the device, as for any new account ([spec 0003](0003-user-time-zone.md)).
- **An email that already has an account** but no connection to this provider: connected and signed in when the provider says the email is verified, otherwise refused with a line asking to sign in with the password and connect from _Settings_ ([Decisions](#decisions) 1).
- **Two-factor authentication** still applies: a person who turned it on is asked for a code after the provider sends them back, as after a password.
- **The page they wanted** opens afterwards, so an invitation link still leads to its invitation.
- **When it fails** (the person cancels, the provider is down, or GitHub returns no verified email), the sign-in page says so in one sentence and nothing is created.

## Connected accounts

- _Settings → Security_ gets a _Connected accounts_ block: Google and GitHub, each with the email it uses and _Connect_ or _Disconnect_.
- Connecting goes to the provider and back. A provider account already connected to someone else is refused.
- **Nobody locks themselves out:** _Disconnect_ is refused while it is the only way to sign in, that is, the account has no password, no other connected account and no passkey. The block says why.

## Accounts without a password

- An account made with a provider has no password. Its _Security_ page shows _Set a password_ (a new password twice, no current password) instead of _Change password_.
- The _Security_ page asks to confirm the password before it opens. An account without one has nothing to confirm, so the page opens directly; otherwise it could never set a password.
- _Forgot password_ also works for it: the email's link sets a first password.
- Turning on two-factor authentication, adding a passkey and deleting the account ask to confirm the password today. Without one, they first ask to _Set a password_ ([Decisions](#decisions) 2).

## Data model

`social_accounts`: `id`, `user_id` (cascade on delete), `provider` (`google` or `github`), `provider_user_id`, `email`, timestamps.

- Unique on (`provider`, `provider_user_id`): one provider account belongs to one person.
- Unique on (`user_id`, `provider`): a person connects at most one account per provider.
- `users.password` becomes nullable.

## Permissions

Anyone can sign in or sign up with a provider, as with a password. Only the signed-in person sees, connects and disconnects their own accounts. Teams, roles and project permissions are unchanged.

## Routes

| Method   | Path                                     | Name                         | What it does                                                                         |
| -------- | ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `GET`    | `auth/{provider}/redirect`               | `social.redirect`            | Sends the browser to the provider, to sign in or, when signed in, to connect.        |
| `GET`    | `auth/{provider}/callback`               | `social.callback`            | Signs in, signs up or connects; throttled to 10 tries a minute per IP.               |
| `DELETE` | `settings/connected-accounts/{provider}` | `connected-accounts.destroy` | Disconnects, unless it is the only way to sign in.                                   |
| `PUT`    | `settings/password`                      | `user-password.update`       | Exists; takes no current password when the account has none, so it sets a first one. |

`{provider}` is `google` or `github`; anything else, or a provider without credentials, is a 404.

## Out of scope

- Other providers (Apple, Microsoft, GitLab).
- Using the provider's avatar or profile; avatars stay initials.
- Calling Google or GitHub after sign-in (importing repositories, calendars or contacts).
- Signing in with a provider on the invitation page itself; the invitation link already leads back to it after any sign-in.

## Decisions

1. **An email that already has an account:** connect and sign in when the provider says the email is verified (Google's and GitHub's primary email both are), and remember the provider from then on; otherwise ask to sign in with the password and connect from _Settings_ (the owner kept the proposal, 13 November).
2. **Confirming without a password:** turning on two-factor authentication, adding a passkey and deleting the account first ask to _Set a password_, with one line saying why; the _Security_ page itself opens without a confirmation (as above).
3. **Layout** (the owner, wireframe round 9, 13 November): on the sign-in and sign-up cards the email form comes first, then _or continue with_ and two side-by-side buttons, Google and GitHub, with _Sign in with a passkey_ as a small link under them. In _Settings → Security_, _Connected accounts_ is a block under the password, one row per provider with a _Connected_ badge; two-factor authentication and passkeys stay where they are.

## Acceptance criteria

- With credentials set, _Continue with Google_ and _Continue with GitHub_ show on sign-in and sign-up; without them, they do not, and the routes answer 404.
- A new provider account creates a user with a verified email, no password and a personal team, and signs them in.
- A connected provider account signs its person in; with two-factor authentication on, they are asked for a code first.
- A provider account connected to someone else cannot be connected again; a person connects at most one account per provider.
- _Disconnect_ is refused when it would leave no way to sign in, and works otherwise.
- An account without a password can set one without a current password, then change it as usual.
- A cancelled or failed sign-in creates nothing and says why on the sign-in page.
- The server tests fake the providers (no network): sign in, sign up, connect, disconnect, the lockout rule, two-factor, failures and the 404s.
