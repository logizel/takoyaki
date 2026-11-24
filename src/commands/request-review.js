import crypto from "crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { getTrackedChannel } from "../database.js";
import {
  GitHubError,
  isGitHubAppConfigured,
  listOpenPullRequests,
  listOrgRepos,
} from "../github.js";

const PAGE_SIZE = 25;
const SESSION_TTL_MS = 15 * 60 * 1000;
const INVOKER_COOLDOWN_MS = 10 * 1000;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const EMBED_COLOR = 0x2f81f7;
const ERROR_COLOR = 0xda3633;

const sessions = new Map();
const lastInvokerUse = new Map();
const recentRequests = new Map();

const CUSTOM_ID = {
  repoSelect: (sessionId) => `rr:repo:${sessionId}`,
  prSelect: (sessionId) => `rr:pr:${sessionId}`,
  userSelect: (sessionId) => `rr:user:${sessionId}`,
  repoPage: (sessionId, page) => `rr:repopage:${sessionId}:${page}`,
  prPage: (sessionId, page) => `rr:prpage:${sessionId}:${page}`,
  back: (target, sessionId) => `rr:back:${target}:${sessionId}`,
  cancel: (sessionId) => `rr:cancel:${sessionId}`,
};

export function isRequestReviewComponent(customId) {
  return typeof customId === "string" && customId.startsWith("rr:");
}

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
  for (const [id, timestamp] of lastInvokerUse) {
    if (now - timestamp > INVOKER_COOLDOWN_MS) lastInvokerUse.delete(id);
  }
  for (const [key, timestamp] of recentRequests) {
    if (now - timestamp > DEDUPE_WINDOW_MS) recentRequests.delete(key);
  }
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

function truncate(value, max) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function relativeTimestamp(isoDate) {
  const parsed = Date.parse(isoDate);
  return Number.isFinite(parsed) ? `<t:${Math.floor(parsed / 1000)}:R>` : null;
}

function githubErrorMessage(error, org) {
  if (!(error instanceof GitHubError)) {
    return "❌ Something went wrong while contacting GitHub. Please try again later.";
  }

  switch (error.code) {
    case "NOT_CONFIGURED":
      return "❌ Review requests are not configured. An administrator must set `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`.";
    case "NOT_INSTALLED":
      return `❌ The Takoyaki GitHub App is not installed on **${org}**, or it has no accessible repositories. Install it from \`/setchannel\` → Org Mode.`;
    case "RATE_LIMITED":
      return "❌ GitHub's API rate limit was reached. Please try again later.";
    case "TIMEOUT":
    case "NETWORK":
      return "❌ Could not reach GitHub. Please try again.";
    case "NOT_FOUND":
      return "❌ GitHub could not find that organization or repository. Check that the app still has access.";
    case "UNAUTHORIZED":
      return "❌ GitHub rejected the request. The GitHub App may need to be reinstalled on the organization.";
    default:
      return "❌ GitHub returned an error. Please try again later.";
  }
}

async function validateReviewer(interaction, user) {
  if (user.bot) {
    return "❌ Bots can't review pull requests. Select a server member.";
  }
  try {
    await interaction.guild.members.fetch(user.id);
  } catch {
    return "❌ That user is not a member of this server.";
  }
  return null;
}

async function loadRepoPage(session, requestedPage) {
  const page = Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1);
  const { items, hasNext } = await listOrgRepos(session.org, page, PAGE_SIZE);

  session.repoPage = page;
  session.repos = items;
  session.repoHasNext = hasNext;

  // Repositories can disappear between page loads (renames, permission changes).
  if (page > 1 && items.length === 0) {
    return loadRepoPage(session, page - 1);
  }
}

async function loadPrPage(session, requestedPage) {
  const page = Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1);
  const { items, hasNext } = await listOpenPullRequests(
    session.repo.owner,
    session.repo.name,
    page,
    PAGE_SIZE
  );

  session.prPage = page;
  session.prs = items;
  session.prHasNext = hasNext;

  if (page > 1 && items.length === 0) {
    return loadPrPage(session, page - 1);
  }
}

function buildNavRow(session, kind) {
  const isRepo = kind === "repo";
  const page = isRepo ? session.repoPage : session.prPage;
  const hasNext = isRepo ? session.repoHasNext : session.prHasNext;
  const row = new ActionRowBuilder();

  if (!isRepo) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_ID.back("repo", session.id))
        .setLabel("← Repositories")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(
        CUSTOM_ID[isRepo ? "repoPage" : "prPage"](session.id, Math.max(1, page - 1))
      )
      .setLabel("← Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(CUSTOM_ID[isRepo ? "repoPage" : "prPage"](session.id, page + 1))
      .setLabel("Next →")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasNext),
    new ButtonBuilder()
      .setCustomId(CUSTOM_ID.cancel(session.id))
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
  );

  return row;
}

function buildRepoView(session) {
  const description = session.repos.length
    ? "Recently active repositories, most recent push first.\nChoose the repository that contains the pull request."
    : session.repoHasNext
      ? "No repositories on this page. Use **Next** to check the next page."
      : `No repositories were found for **${session.org}**. Make sure the GitHub App is installed and has access to its repositories.`;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(`📂 Select a repository — ${session.org}`)
    .setDescription(description)
    .setFooter({ text: `Page ${session.repoPage}` })
    .setTimestamp();

  const components = [];

  if (session.repos.length > 0) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.repoSelect(session.id))
      .setPlaceholder("Choose a repository")
      .addOptions(
        session.repos.slice(0, PAGE_SIZE).map((repo) => {
          const details = [];
          if (repo.private) details.push("Private");
          const pushed = relativeTimestamp(repo.pushedAt);
          if (pushed) details.push(`Pushed ${pushed}`);

          const option = new StringSelectMenuOptionBuilder()
            .setLabel(truncate(repo.name, 100))
            .setValue(repo.name);

          if (details.length > 0) {
            option.setDescription(truncate(details.join(" · "), 100));
          }
          return option;
        })
      );

    components.push(new ActionRowBuilder().addComponents(menu));
  }

  components.push(buildNavRow(session, "repo"));
  return { embeds: [embed], components };
}

function buildPrView(session) {
  const description = session.prs.length
    ? "Open pull requests, most recently updated first.\nChoose the pull request to request a review on."
    : session.prHasNext
      ? "No pull requests on this page. Use **Next** to check the next page."
      : `There are no open pull requests in **${session.repo.fullName}**.`;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(`🔀 Select a pull request — ${session.repo.fullName}`)
    .setDescription(description)
    .setFooter({ text: `Page ${session.prPage}` })
    .setTimestamp();

  const components = [];

  if (session.prs.length > 0) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_ID.prSelect(session.id))
      .setPlaceholder("Choose a pull request")
      .addOptions(
        session.prs.slice(0, PAGE_SIZE).map((pr) => {
          const details = [`@${pr.user}`];
          const updated = relativeTimestamp(pr.updatedAt);
          if (updated) details.push(`Updated ${updated}`);
          if (pr.draft) details.push("Draft");

          return new StringSelectMenuOptionBuilder()
            .setLabel(truncate(`#${pr.number} · ${pr.title}`, 100))
            .setValue(String(pr.number))
            .setDescription(truncate(details.join(" · "), 100));
        })
      );

    components.push(new ActionRowBuilder().addComponents(menu));
  }

  components.push(buildNavRow(session, "pr"));
  return { embeds: [embed], components };
}

function buildUserView(session, error = null) {
  const description = [
    error,
    `Select the server member who should review and merge **${session.repo.fullName}#${session.pr.number}**:`,
    `*${truncate(session.pr.title, 200)}*`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setColor(error ? ERROR_COLOR : EMBED_COLOR)
    .setTitle("👤 Who should review and merge?")
    .setDescription(description)
    .setTimestamp();

  const menu = new UserSelectMenuBuilder()
    .setCustomId(CUSTOM_ID.userSelect(session.id))
    .setPlaceholder("Select a server member")
    .setMinValues(1)
    .setMaxValues(1);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(menu),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_ID.back("pr", session.id))
          .setLabel("← Pull Requests")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(CUSTOM_ID.cancel(session.id))
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger)
      ),
    ],
  };
}

async function finalizeRequest(interaction, session) {
  const now = Date.now();
  const lastUse = lastInvokerUse.get(interaction.user.id) || 0;
  if (now - lastUse < INVOKER_COOLDOWN_MS) {
    sessions.delete(session.id);
    return interaction.editReply({
      content: "⏳ Please wait a few seconds before sending another review request.",
      embeds: [],
      components: [],
    });
  }

  const dedupeKey = `${session.guildId}:${session.channelId}:${session.reviewerId}:${session.pr.htmlUrl}`;
  const previousRequest = recentRequests.get(dedupeKey) || 0;
  if (now - previousRequest < DEDUPE_WINDOW_MS) {
    sessions.delete(session.id);
    return interaction.editReply({
      content: `⚠️ A review request for **${session.repo.fullName}#${session.pr.number}** was already sent to <@${session.reviewerId}> recently.`,
      embeds: [],
      components: [],
    });
  }

  const channel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    sessions.delete(session.id);
    return interaction.editReply({
      content: "❌ I can't find the org channel anymore. Run `/request-review` again.",
      embeds: [],
      components: [],
    });
  }

  let reviewer;
  try {
    reviewer = await interaction.guild.members.fetch(session.reviewerId);
  } catch {
    sessions.delete(session.id);
    return interaction.editReply({
      content: "❌ That user is no longer a member of this server.",
      embeds: [],
      components: [],
    });
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(truncate(`#${session.pr.number} · ${session.pr.title}`, 240))
    .setURL(session.pr.htmlUrl)
    .setDescription(`**${session.repo.fullName}**\n\nPlease review and merge this pull request.`)
    .addFields({ name: "Author", value: `@${session.pr.user}`, inline: true })
    .setFooter({
      text: `Requested by ${truncate(interaction.member?.displayName || interaction.user.username, 80)}`,
    })
    .setTimestamp();

  const updated = relativeTimestamp(session.pr.updatedAt);
  if (updated) {
    embed.addFields({ name: "Updated", value: updated, inline: true });
  }

  try {
    await channel.send({
      content: `🔔 <@${session.reviewerId}> — please review and merge this pull request.`,
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("View Pull Request")
            .setStyle(ButtonStyle.Link)
            .setURL(session.pr.htmlUrl)
        ),
      ],
      allowedMentions: { parse: ["users"], users: [session.reviewerId] },
    });
  } catch (error) {
    console.error(
      `Failed to send review request for ${session.repo.fullName}#${session.pr.number}:`,
      error
    );
    sessions.delete(session.id);
    return interaction.editReply({
      content: "❌ I couldn't post the review request. Please check my permissions in this channel.",
      embeds: [],
      components: [],
    });
  }

  lastInvokerUse.set(interaction.user.id, now);
  recentRequests.set(dedupeKey, now);
  sessions.delete(session.id);

  return interaction.editReply({
    content: `✅ Review request sent to <@${reviewer.id}> for **${session.repo.fullName}#${session.pr.number}**.`,
    embeds: [],
    components: [],
  });
}

export async function requestReviewCommand(interaction) {
  if (!interaction.guildId || !interaction.channelId) {
    return interaction.reply({
      content: "❌ This command can only be used in a server channel.",
      ephemeral: true,
    });
  }

  let tracked;
  try {
    tracked = await getTrackedChannel(interaction.guildId, interaction.channelId);
  } catch (error) {
    console.error("Failed to load tracked channel:", error);
    return interaction.reply({
      content: "❌ Could not check this channel's configuration. Please try again.",
      ephemeral: true,
    });
  }

  if (!tracked || tracked.mode !== "org" || !tracked.org_name) {
    return interaction.reply({
      content: "❌ `/request-review` only works in a channel configured with **Org Mode** via `/setchannel`.",
      ephemeral: true,
    });
  }

  if (!isGitHubAppConfigured()) {
    return interaction.reply({
      content: "❌ Review requests are not configured. An administrator must set `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`.",
      ephemeral: true,
    });
  }

  const reviewer = interaction.options.getUser("user", false);
  if (reviewer) {
    const error = await validateReviewer(interaction, reviewer);
    if (error) {
      return interaction.reply({ content: error, ephemeral: true });
    }
  }

  await interaction.deferReply({ ephemeral: true });
  cleanupSessions();

  const session = {
    id: crypto.randomBytes(6).toString("hex"),
    invokerId: interaction.user.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    org: tracked.org_name,
    reviewerId: reviewer?.id || null,
    repoPage: 1,
    repos: [],
    repoHasNext: false,
    repo: null,
    prPage: 1,
    prs: [],
    prHasNext: false,
    pr: null,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  sessions.set(session.id, session);

  try {
    await loadRepoPage(session, 1);
  } catch (error) {
    sessions.delete(session.id);
    console.error(`Failed to load repositories for org ${session.org}:`, error);
    return interaction.editReply({
      content: githubErrorMessage(error, session.org),
      allowedMentions: { parse: [] },
    });
  }

  return interaction.editReply(buildRepoView(session));
}

export async function handleRequestReviewComponent(interaction) {
  const parts = interaction.customId.split(":");
  const action = parts[1];

  let sessionId = null;
  let requestedPage = null;
  let backTarget = null;

  if (action === "back") {
    backTarget = parts[2];
    sessionId = parts[3];
  } else if (action === "repopage" || action === "prpage") {
    sessionId = parts[2];
    requestedPage = Number.parseInt(parts[3], 10);
  } else {
    sessionId = parts[2];
  }

  const session = sessionId ? getSession(sessionId) : null;
  if (!session) {
    await interaction
      .update({
        content: "⌛ This menu has expired. Run `/request-review` again.",
        embeds: [],
        components: [],
      })
      .catch(() => {});
    return true;
  }

  if (interaction.user.id !== session.invokerId) {
    await interaction
      .reply({
        content: "❌ This menu belongs to another user. Run `/request-review` yourself.",
        ephemeral: true,
      })
      .catch(() => {});
    return true;
  }

  try {
    switch (action) {
      case "cancel":
        sessions.delete(session.id);
        await interaction.update({
          content: "❌ Review request cancelled.",
          embeds: [],
          components: [],
        });
        return true;

      case "back":
        if (backTarget === "repo") {
          session.pr = null;
          session.prs = [];
          await interaction.update(buildRepoView(session));
        } else {
          await interaction.update(buildPrView(session));
        }
        return true;

      case "repopage":
        await interaction.deferUpdate();
        await loadRepoPage(session, requestedPage);
        await interaction.editReply(buildRepoView(session));
        return true;

      case "repo": {
        const repo = session.repos.find((item) => item.name === interaction.values[0]);
        if (!repo) {
          await interaction.deferUpdate();
          await interaction.editReply({
            content: "❌ That repository is no longer available. Run `/request-review` again.",
            embeds: [],
            components: [],
          });
          return true;
        }

        await interaction.deferUpdate();
        session.repo = repo;
        session.pr = null;

        try {
          await loadPrPage(session, 1);
        } catch (error) {
          sessions.delete(session.id);
          console.error(`Failed to load pull requests for ${repo.fullName}:`, error);
          await interaction.editReply({
            content: githubErrorMessage(error, session.org),
            embeds: [],
            components: [],
            allowedMentions: { parse: [] },
          });
          return true;
        }

        await interaction.editReply(buildPrView(session));
        return true;
      }

      case "prpage":
        await interaction.deferUpdate();
        try {
          await loadPrPage(session, requestedPage);
        } catch (error) {
          sessions.delete(session.id);
          console.error(`Failed to load pull requests for ${session.repo.fullName}:`, error);
          await interaction.editReply({
            content: githubErrorMessage(error, session.org),
            embeds: [],
            components: [],
            allowedMentions: { parse: [] },
          });
          return true;
        }
        await interaction.editReply(buildPrView(session));
        return true;

      case "pr": {
        const number = Number.parseInt(interaction.values[0], 10);
        const pr = session.prs.find((item) => item.number === number);
        if (!pr) {
          await interaction.deferUpdate();
          await interaction.editReply({
            content: "❌ That pull request is no longer available. Run `/request-review` again.",
            embeds: [],
            components: [],
          });
          return true;
        }

        await interaction.deferUpdate();
        session.pr = pr;

        if (session.reviewerId) {
          await finalizeRequest(interaction, session);
        } else {
          await interaction.editReply(buildUserView(session));
        }
        return true;
      }

      case "user": {
        await interaction.deferUpdate();
        const user = await interaction.client.users.fetch(interaction.values[0]).catch(() => null);
        if (!user) {
          await interaction.editReply(
            buildUserView(session, "❌ That user could not be found. Select another member.")
          );
          return true;
        }

        const error = await validateReviewer(interaction, user);
        if (error) {
          await interaction.editReply(buildUserView(session, error));
          return true;
        }

        session.reviewerId = user.id;
        await finalizeRequest(interaction, session);
        return true;
      }

      default:
        return false;
    }
  } catch (error) {
    sessions.delete(session.id);
    console.error("Request-review component failed:", error);
    const content = githubErrorMessage(error, session.org);

    if (interaction.deferred || interaction.replied) {
      await interaction
        .editReply({ content, embeds: [], components: [], allowedMentions: { parse: [] } })
        .catch(() => {});
    } else {
      await interaction
        .reply({ content, ephemeral: true, allowedMentions: { parse: [] } })
        .catch(() => {});
    }
    return true;
  }
}