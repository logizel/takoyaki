# Takoyaki

A Discord bot that monitors GitHub repository/organization activity and pings events to configured Discord text channels. Acts as a webhook-to-Discord bridge with support for both per-user and per-organization event routing.

## System Overview

The application runs as a Node.js Express server that simultaneously operates a Discord.js client. GitHub sends webhook events to the Express endpoint; the bot verifies the payload signature, resolves the sender, determines the target channel(s) from the database, and posts a formatted message with a contextual link button pointing to the relevant GitHub page (repository, PR, issue, or workflow run). A separate OAuth callback handler links Discord users to GitHub accounts via the GitHub App OAuth flow. The bot also supports CI/CD workflow run events for organization-mode channels.

## Commands

### `/setchannel`

Administrator-only. Initializes channel configuration in the current text channel. Presents an interactive mode-selection dialog:

- **Standard Mode**: Registers the channel as the server's personal-activity destination. Linked users' push, pull request, issue, and repository events are posted here with Discord mentions. Limited to one Standard channel per guild; selecting a replacement triggers a confirmation prompt.
- **Org Mode**: Opens a modal to input a GitHub organization name. Registers the channel to receive anonymized events (GitHub username only, no Discord mention) from any repository owned by that organization. Unlimited Org channels per guild; each targets a distinct organization.

### `/github link`

Initiates the GitHub OAuth flow. Creates an OAuth state record in the database, generates a GitHub App installation URL incorporating the state parameter, and responds with an ephemeral link-button embed. After the user completes authorization, the callback handler exchanges the authorization code for an access token, fetches the GitHub user profile, and persists the mapping in the `users` table.

### `/github unlink`

Removes the invoking user's record from the `users` table. Returns an error if no link exists.

### `/stats`

Fetches contribution data from the GitHub GraphQL API (`contributionsCollection.contributionCalendar.totalContributions`). Supports five subcommands:

| Subcommand       | Description                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `me`             | Returns today's contribution count and trailing-365-day total with daily average                                       |
| `compare <user>` | Compares trailing-365-day totals between the invoker and a specified Discord user                                      |
| `top`            | Iterates all linked users, fetches each 365-day count, and returns a sorted leaderboard (top 10)                       |
| `top-day`        | Same pattern as `top` but scoped to the current UTC date; excludes zero-contribution users                             |
| `streak`         | Fetches the full contribution calendar via GraphQL, renders a 365-day GitHub-style PNG heatmap, and attaches it as the embed image |

All `/stats` and `/github` subcommands are blocked when the guild has any Org-mode channels registered. The command returns an error message indicating that personal linking is disabled.

## Webhook Processing Pipeline

All requests to `POST /webhook` undergo HMAC-SHA256 signature verification using `GITHUB_WEBHOOK_SECRET`. Unsupported event types (`star`, `installation`, `installation_repositories`) are acknowledged but discarded.

The routing decision follows two priority tiers:

1. **Organization routing**: If the repository owner matches an org name registered in `tracked_channels` with `mode='org'`, the event is formatted without a Discord user ID and broadcast to all channels tracking that organization.
2. **User routing**: If the sender's GitHub login matches a record in the `users` table, the event is formatted with the Discord user ID (producing a mention) and broadcast to all channels with `mode='standard'` across all guilds. A fallback channel (`DISCORD_CHANNEL_ID` env var) is used if no Standard channels are found.

Commit counts from `push` events are recorded in the `commits` table for `/stats` queries.

## Database Schema (PostgreSQL)

| Table              | Columns                                                  | Constraints                  | Purpose                                   |
| ------------------ | -------------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| `users`            | `discord_id`, `github_login`, `access_token`             | PK: `discord_id`             | Discord-to-GitHub account mappings        |
| `channels`         | `guild_id`, `channel_id`                                 | PK: `guild_id`               | Legacy single-channel config (deprecated) |
| `oauth_states`     | `state`, `discord_id`, `interaction_token`, `created_at` | PK: `state`                  | OAuth state tokens (5-minute TTL)         |
| `commits`          | `discord_id`, `date`, `count`                            | PK: `(discord_id, date)`     | Daily commit aggregation                  |
| `tracked_channels` | `guild_id`, `channel_id`, `mode`, `org_name`             | PK: `(guild_id, channel_id)` | Per-channel mode configuration            |

## Event Formatting

The `formatMessage` function produces text messages from webhook payloads. The prefix varies by routing path: linked users receive `<@discord_id>` (mention), while org events receive `**github_username**` (bold text). Private repositories are masked as "a private repository" regardless of event type and suppress the link button.

## Events

| Event                          | Public                                                                    | Private                                             | Button            |
| ------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------- | ----------------- |
| `push`                         | `{user} pushed N commits to {owner/repo} — {first commit msg}`            | `{user} pushed N commits to a private repository`   | View Repository   |
| `pull_request` (opened)        | `{user} opened a PR in {owner/repo}: {title}`                             | `{user} opened a PR in a private repository`        | View Pull Request |
| `pull_request` (closed/merged) | `{user} merged/closed a PR in {owner/repo}: {title}`                      | `{user} merged/closed a PR in a private repository` | View Pull Request |
| `issues` (opened)              | `{user} opened an issue in {owner/repo}: {title}`                         | `{user} opened an issue in a private repository`    | View Issue        |
| `issues` (closed)              | `{user} closed an issue in {owner/repo}: {title}`                         | `{user} closed an issue in a private repository`    | View Issue        |
| `repository` (created)         | `{user} created {owner/repo}`                                             | `{user} created a private repository`               | View Repository   |
| `workflow_run` (completed)     | `{user} CI *{name}* **{conclusion}** on \`{branch}\` in **{owner/repo}**` | — (always treated as public)                        | View Run          |

## Environment Variables

| Variable                | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `DISCORD_BOT_TOKEN`     | Discord bot login token                                              |
| `DISCORD_CLIENT_ID`     | Discord application client ID                                        |
| `DISCORD_CHANNEL_ID`    | Fallback channel for events when no standard channels are configured |
| `GITHUB_APP_NAME`       | GitHub App name (used in installation URLs)                          |
| `GITHUB_CLIENT_ID`      | GitHub App OAuth client ID                                           |
| `GITHUB_CLIENT_SECRET`  | GitHub App OAuth client secret                                       |
| `GITHUB_WEBHOOK_SECRET` | Shared secret for webhook HMAC verification                          |
| `BASE_URL`              | Public URL of the server (used for OAuth redirects)                  |
| `DATABASE_URL`          | PostgreSQL connection string                                         |
| `PORT`                  | Server port (default 3000)                                           |

## Deployment

The Express server binds to `$PORT` (default 3000). GitHub delivers webhooks to `{BASE_URL}/webhook` and OAuth redirects to `{BASE_URL}/auth/callback`. A GitHub Pages landing page is served from `docs/index.html`.

To register slash commands with Discord:

```
npm run deploy
```

To start the application:

```
npm start
```
