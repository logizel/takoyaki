# Takoyaki

A Discord bot that monitors GitHub repository and organization activity and pings events to configured Discord text channels. Acts as a webhook-to-Discord bridge with per-user and per-organization routing, contribution stats and leaderboards, streak heatmaps, and pull-request review requests.

## System Overview

The application runs as a Node.js Express server that simultaneously operates a Discord.js client. GitHub sends webhook events to the Express endpoint; the bot verifies the payload signature, resolves the sender, determines the target channel(s) from the database, and posts a formatted message with a contextual link button pointing to the relevant GitHub page (repository, PR, issue, or workflow run). A separate OAuth callback handler links Discord users to GitHub accounts, while GitHub App installation redirects are acknowledged by a setup handler. The bot also supports CI/CD workflow run events.

Contribution stats are fetched on demand from the GitHub GraphQL API. `/request-review` uses a GitHub App installation token to browse an account's repositories and open pull requests.

## Commands

### `/setchannel`

Administrator-only. Initializes channel configuration in the current text channel. Presents an interactive mode-selection dialog:

- **Standard Mode**: Registers the channel as the server's personal-activity destination. Linked users' push, pull request, issue, repository, and workflow run events are posted here with Discord mentions. Limited to one Standard channel per guild; selecting a replacement triggers a confirmation prompt.
- **Org Mode**: Opens a modal to input a GitHub organization or user account name. Registers the channel to receive anonymized events (GitHub username only, no Discord mention) from any repository owned by that account. Unlimited Org channels per guild; each channel tracks one organization, and multiple channels can track different organizations. Organization names are matched case-insensitively against the repository owner. No Discord account linking is required in this mode.

### `/github link`

Initiates the GitHub OAuth user-authorization flow. Creates an OAuth state record in the database, generates a GitHub OAuth authorize URL incorporating the state parameter, and responds with an ephemeral link-button embed. The embed also includes an **Install GitHub App** button for granting repository access. After the user completes authorization, the callback handler exchanges the authorization code for an access token, fetches the GitHub user profile, and persists the mapping in the `users` table.

### `/github unlink`

Removes the invoking user's record from the `users` table. Returns an error if no link exists.

### `/request-review`

Available in channels configured with Org Mode. Any server member can use it to ask another member of the same server to review and merge an open pull request:

1. Run `/request-review` (optionally with `user:@member`).
2. Pick one of the account's recently active repositories from an ephemeral menu (most recent push first, 25 per page); archived and disabled repositories are hidden.
3. Pick an open pull request (most recently updated first, 25 per page).
4. If `user` was omitted, pick the reviewer from a member menu.
5. The bot posts a public message in the same channel that mentions the reviewer and links to the PR.

Menus are ephemeral, paginated, and expire after 15 minutes. Only the invoking user can operate them. A 10-second cooldown and a 10-minute duplicate-request window prevent repeated requests. The final public message mentions only the selected reviewer. The GitHub App must be installed on the account, and `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` must be configured.

### `/stats`

Fetches contribution data from the GitHub GraphQL API (`contributionsCollection.contributionCalendar.totalContributions`). Supports five subcommands:

| Subcommand       | Description                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `me`             | Returns today's contribution count and trailing-365-day total with daily average                                       |
| `compare <user>` | Compares trailing-365-day totals between the invoker and another linked Discord user                                   |
| `top`            | Ranks linked members of the current server by trailing-365-day contributions (top 10)                                  |
| `top-day`        | Ranks linked members of the current server by contributions for the current UTC date; excludes zero-contribution users |
| `streak`         | Fetches the full contribution calendar via GraphQL, renders a 182-day GitHub-style PNG heatmap, and attaches it as the embed image |

Leaderboards only include linked users who are members of the server where the command is run. The guild member list is cached for five minutes, and users whose GitHub lookup fails are skipped.

All `/stats` and `/github` subcommands are blocked when the guild has any Org-mode channels registered. The command returns an error message indicating that personal linking is disabled.

## Webhook Processing Pipeline

All requests to `POST /webhook` undergo HMAC-SHA256 signature verification using `GITHUB_WEBHOOK_SECRET`. Requests without a valid signature are rejected, and the raw webhook body limit is 5 MB. Events that do not map to a formatter (including `star`, `installation`, and `installation_repositories`) are acknowledged but discarded.

The routing decision follows two priority tiers:

1. **Organization routing**: If the repository owner matches an org name registered in `tracked_channels` with `mode='org'` (case-insensitively), the event is formatted without a Discord user ID and broadcast to all channels tracking that organization.
2. **User routing**: If the sender's GitHub login matches a record in the `users` table, the event is formatted with the Discord user ID (producing a mention) and broadcast to Standard channels in guilds where the linked user is a member. If no message can be sent to a Standard channel, the fallback channel (`DISCORD_CHANNEL_ID` env var) is used.

In user routing, push events also increment the linked sender's daily count in the `commits` table. `/stats` does not read this table; it fetches live contribution data from the GitHub GraphQL API.

## Database Schema (PostgreSQL)

| Table              | Columns                                                  | Constraints                  | Purpose                                   |
| ------------------ | -------------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| `users`            | `discord_id`, `github_login`, `access_token`             | PK: `discord_id`             | Discord-to-GitHub account mappings        |
| `channels`         | `guild_id`, `channel_id`                                 | PK: `guild_id`               | Legacy single-channel config (deprecated) |
| `oauth_states`     | `state`, `discord_id`, `interaction_token`, `created_at` | PK: `state`                  | OAuth state tokens (15-minute TTL)        |
| `commits`          | `discord_id`, `date`, `count`                            | PK: `(discord_id, date)`     | Daily push aggregation (legacy; not read by `/stats`) |
| `tracked_channels` | `guild_id`, `channel_id`, `mode`, `org_name`             | PK: `(guild_id, channel_id)` | Per-channel mode configuration            |

## Event Formatting

The `formatMessage` function produces text messages from webhook payloads. The prefix varies by routing path: linked users receive `<@discord_id>` (mention), while org events receive `**github_username**` (bold text). For push, pull request, issue, and repository events, private repositories are masked as "a private repository" and the link button is suppressed. Workflow run events always include the repository name but omit the link button for private repositories. Push messages list up to 10 commit subjects; Standard mode counts only distinct commits authored by the pusher (falling back to committer when author info is absent), while Org mode counts every distinct commit.

## Events

| Event                          | Public                                                                    | Private                                             | Button            |
| ------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------- | ----------------- |
| `push`                         | `{user} pushed N commits to {owner/repo}: {commit subjects}`              | `{user} pushed N commits to a private repository`   | View Repository   |
| `pull_request` (opened)        | `{user} opened a PR in {owner/repo}: {title}`                             | `{user} opened a PR in a private repository`        | View Pull Request |
| `pull_request` (closed/merged) | `{user} merged/closed a PR in {owner/repo}: {title}`                      | `{user} merged/closed a PR in a private repository` | View Pull Request |
| `issues` (opened)              | `{user} opened an issue in {owner/repo}: {title}`                         | `{user} opened an issue in a private repository`    | View Issue        |
| `issues` (closed)              | `{user} closed an issue in {owner/repo}: {title}`                         | `{user} closed an issue in a private repository`    | View Issue        |
| `repository` (created)         | `{user} created {owner/repo}`                                             | `{user} created a private repository`               | View Repository   |
| `repository` (forked)          | `{user} forked {owner/repo} from {parent}`                                | `{user} forked a private repository`                | View Repository   |
| `workflow_run` (completed)     | `{user} CI *{name}* **{conclusion}** on \`{branch}\` in **{owner/repo}**` | Same as public; link button omitted                 | View Run          |

Push events with no commits authored by the sender (or committed by them when author info is absent) produce no message in Standard mode. Workflow run events are posted in both Standard and Org modes.

## Environment Variables

| Variable                 | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `DISCORD_BOT_TOKEN`      | Discord bot login token                                                |
| `DISCORD_CLIENT_ID`      | Discord application client ID                                          |
| `DISCORD_CHANNEL_ID`     | Fallback channel used when no Standard channel can receive an event    |
| `GITHUB_APP_NAME`        | GitHub App name (used in installation URLs)                            |
| `GITHUB_APP_ID`          | GitHub App ID (used to sign API requests for `/request-review`)        |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key in PEM format (escaped newlines or base64)      |
| `GITHUB_CLIENT_ID`       | GitHub App OAuth client ID                                             |
| `GITHUB_CLIENT_SECRET`   | GitHub App OAuth client secret                                         |
| `GITHUB_WEBHOOK_SECRET`  | Shared secret for webhook HMAC verification (required at startup)      |
| `BASE_URL`               | Public URL of the server (used for OAuth redirects)                    |
| `DATABASE_URL`           | PostgreSQL connection string                                           |
| `PORT`                   | Server port (default 3000)                                             |

## Deployment

The Express server binds to `$PORT` (default 3000) and refuses to start if `GITHUB_WEBHOOK_SECRET` is missing or empty. Webhook payloads are accepted up to 5 MB.

| Endpoint | Purpose |
| --- | --- |
| `POST /webhook` | GitHub webhook deliveries (HMAC-SHA256 verified) |
| `GET /auth/callback` | GitHub OAuth callback (also tolerates App installation redirects) |
| `GET /auth/setup` | GitHub App installation result page |
| `GET /health` | Liveness check (`OK`) |

`docs/index.html` is the GitHub Pages landing page.

### GitHub App configuration

Set the following in the GitHub App settings:

| Setting | Value |
| --- | --- |
| User authorization callback URL | `{BASE_URL}/auth/callback` |
| Setup URL | `{BASE_URL}/auth/setup` |
| Webhook URL | `{BASE_URL}/webhook` |
| Webhook secret | Same value as `GITHUB_WEBHOOK_SECRET` |

Repository permissions:

| Permission | Access | Purpose |
| --- | --- | --- |
| Contents | Read | Push events and commit metadata |
| Issues | Read | Issue events |
| Pull requests | Read | Pull request events |
| Metadata | Read | Required baseline |
| Actions | Read | Optional; required for `workflow_run` events |

Event subscriptions: **Push**, **Pull requests**, **Issues**, **Repository**, and optionally **Workflow runs**. The `Workflow runs` event requires the Actions read permission.

Org mode does not use the OAuth callback. Install the GitHub App on the organization or user account, then run `/setchannel` → Org Mode; events are routed by the repository owner. Adding the App's **App ID** and **private key** to the environment (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`) also enables `/request-review`, which lists the account's repositories and open pull requests through the App installation. No additional repository permissions are required beyond **Metadata: Read** and **Pull requests: Read**.

Install dependencies:

```
npm install
```

To register slash commands with Discord:

```
npm run deploy
```

To start the application:

```
npm start
```
