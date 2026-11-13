import crypto from "crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import { readData, addCommitCount, getOrgChannelsByOrgName } from "./database.js";

const DISCORD_READY_TIMEOUT_MS = 8000;
const ROUTABLE_EVENTS = new Set(["push", "pull_request", "issues", "repository", "workflow_run"]);
let readyPromise = null;

function waitForDiscordReady(client, timeoutMs = DISCORD_READY_TIMEOUT_MS) {
  if (client.isReady()) return Promise.resolve(true);

  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      const timer = setTimeout(() => {
        readyPromise = null;
        resolve(false);
      }, timeoutMs);

      client.once(Events.ClientReady, () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  return readyPromise;
}

async function getTextChannel(client, channelId) {
  let channel = client.channels.cache.get(channelId);
  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (error) {
      console.warn(`Could not fetch Discord channel ${channelId}:`, error.message);
      return null;
    }
  }
  return channel && channel.isTextBased() ? channel : null;
}

async function getAllStandardChannels() {
  const data = await readData();
  return data.tracked_channels.filter(tc => tc.mode === 'standard');
}

function getEventComponents(event, parsed) {
  const isPrivate = parsed.repository?.private || parsed.workflow_run?.repository?.private;
  if (isPrivate) return [];

  let url = null;
  let label = null;

  switch (event) {
    case "push":
    case "repository":
      url = parsed.repository?.html_url;
      label = "View Repository";
      break;
    case "pull_request":
      url = parsed.pull_request?.html_url;
      label = "View Pull Request";
      break;
    case "issues":
      url = parsed.issue?.html_url;
      label = "View Issue";
      break;
    case "workflow_run":
      url = parsed.workflow_run?.html_url;
      label = "View Run";
      break;
  }

  if (!url) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(label)
        .setStyle(ButtonStyle.Link)
        .setURL(url)
    )
  ];
}

function verifySignature(payload, signature, secret) {
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

function getOwnCommits(payload, senderLogin) {
  const commits = payload.commits || [];
  if (!senderLogin) return commits;
  const sender = senderLogin.toLowerCase();
  return commits.filter((c) => {
    if (c.distinct === false) return false;
    const authorLogin = c.author?.username?.toLowerCase();
    if (authorLogin) return authorLogin === sender;
    const committerLogin = c.committer?.username?.toLowerCase();
    if (committerLogin) return committerLogin === sender;
    return false;
  });
}

function formatMessage(discordId, event, payload, orgSender, isOrgMode = false) {
  const sender = orgSender || payload.sender?.login;
  const repo = payload.repository?.name;
  const isPrivate = payload.repository?.private;
  const owner = payload.repository?.owner?.login;
  const prefix = discordId ? `<@${discordId}>` : `**${sender}**`;

  const repoFull = owner ? `${owner}/${repo}` : repo;

  switch (event) {
    case "push": {
      // Standard mode only pings for commits the pusher authored. Org mode
      // announces every distinct commit pushed to the organization.
      const ownCommits = isOrgMode
        ? (payload.commits || []).filter((c) => c.distinct !== false)
        : getOwnCommits(payload, sender);
      const count = ownCommits.length;
      if (count === 0) return null;
      const commitsMsgs = ownCommits.map(c => (c.message || '').split('\n')[0]).filter(Boolean);
      if (isPrivate) {
        return `${prefix} pushed ${count} commit${count !== 1 ? "s" : ""} to a **private repository**.`;
      }
      if (count === 1) {
        return `${prefix} pushed 1 commit to **${repoFull}** — *${commitsMsgs[0]}*`;
      }
      const shown = commitsMsgs.slice(0, 10);
      const bulletList = shown.map(l => `• ${l}`).join('\n');
      const extra = count > 10 ? `\n... and ${count - 10} more` : "";
      return `${prefix} pushed ${count} commits to **${repoFull}**:\n${bulletList}${extra}`;
    }
    case "pull_request": {
      const action = payload.action;
      const title = payload.pull_request?.title;
      if (action === "opened") {
        if (isPrivate)
          return `${prefix} opened a PR in a **private repository**.`;
        return `${prefix} opened a PR in **${repoFull}**: *${title}*`;
      }
      if (action === "closed") {
        const verb = payload.pull_request?.merged ? "merged" : "closed";
        if (isPrivate)
          return `${prefix} ${verb} a PR in a **private repository**.`;
        return `${prefix} ${verb} a PR in **${repoFull}**: *${title}*`;
      }
      return null;
    }
    case "issues": {
      const action = payload.action;
      const title = payload.issue?.title;
      if (action === "opened") {
        if (isPrivate)
          return `${prefix} opened an issue in a **private repository**.`;
        return `${prefix} opened an issue in **${repoFull}**: *${title}*`;
      }
      if (action === "closed") {
        if (isPrivate)
          return `${prefix} closed an issue in a **private repository**.`;
        return `${prefix} closed an issue in **${repoFull}**: *${title}*`;
      }
      return null;
    }
    case "repository": {
      if (payload.action === "created") {
        const isFork = payload.repository?.fork || !!payload.forkee;
        if (isFork) {
          const parent = payload.repository?.parent?.full_name || payload.forkee?.parent?.full_name;
          if (isPrivate) return `${prefix} forked a **private repository**.`;
          if (parent) return `${prefix} forked **${repoFull}** from **${parent}**`;
          return `${prefix} forked **${repoFull}**`;
        }
        if (isPrivate) return `${prefix} created a **private repository**.`;
        return `${prefix} created **${repoFull}**`;
      }
      return null;
    }
    case "workflow_run": {
      const action = payload.action;
      const run = payload.workflow_run;
      const name = run?.name;
      const conclusion = run?.conclusion;
      const branch = run?.head_branch;
      const repoFull = run?.repository?.full_name;
      if (action === "completed" && conclusion) {
        return `${prefix} CI *${name}* **${conclusion}** on \`${branch}\` in **${repoFull}**`;
      }
      return null;
    }
    default:
      return null;
  }
}

async function getUserByGithubLogin(githubLogin) {
  const data = await readData();
  for (const [discordId, userObj] of Object.entries(data.users)) {
    let login;
    if (typeof userObj === 'object' && userObj !== null) {
      login = userObj.githubLogin;
    } else if (typeof userObj === 'string') {
      login = userObj;
    } else {
      continue;
    }
    if (login.toLowerCase() === githubLogin.toLowerCase()) {
      return { discordId, githubLogin: login };
    }
  }
  return null;
}

export async function webhookHandler(req, res) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) {
    return res.status(401).send("Missing signature");
  }

  const payload = req.body.toString("utf-8");
  if (!verifySignature(payload, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.headers["x-github-event"];
  if (
    event === "star" ||
    event === "installation" ||
    event === "installation_repositories"
  ) {
    console.log(`Received ${event} event`);
    return res.status(200).send("OK");
  }

  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return res.status(400).send("Invalid JSON");
  }

  const sender = parsed.sender?.login;
  if (!sender) {
    return res.status(200).send("OK");
  }

  const client = global.discordClient;
  if (!client) {
    console.error("Discord client is not available");
    return res.status(503).send("Discord client unavailable");
  }

  if (!(await waitForDiscordReady(client))) {
    console.warn(
      `Discord client was not ready; rejecting ${event} delivery ${req.headers["x-github-delivery"] || ""}`
    );
    return res.status(503).send("Discord client not ready");
  }

  const repoOwner = parsed.repository?.owner?.login || parsed.workflow_run?.repository?.owner?.login;
  const orgChannels = repoOwner ? await getOrgChannelsByOrgName(repoOwner) : [];

  if (orgChannels.length > 0) {
    const message = formatMessage(null, event, parsed, sender, true);
    if (!message) {
      if (ROUTABLE_EVENTS.has(event)) {
        console.log(`No Discord message for ${event}.${parsed.action || ""} in ${repoOwner}`);
      }
      return res.status(200).send("OK");
    }
    const components = getEventComponents(event, parsed);
    for (const tc of orgChannels) {
      try {
        const channel = await getTextChannel(client, tc.channel_id);
        if (!channel) {
          console.warn(`Org channel ${tc.channel_id} for ${repoOwner} not found or not text-based`);
          continue;
        }
        await channel.send({ content: message, components });
      } catch (error) {
        console.error(`Failed to send ${event} to org channel ${tc.channel_id}:`, error);
      }
    }
    return res.status(200).send("OK");
  }

  const user = await getUserByGithubLogin(sender);
  if (!user) {
    if (ROUTABLE_EVENTS.has(event)) {
      console.log(
        `Ignoring ${event}.${parsed.action || ""} for ${repoOwner || "unknown owner"}/${parsed.repository?.name || parsed.workflow_run?.repository?.name || "unknown repo"} from ${sender}: no org channel and sender is not linked`
      );
    }
    return res.status(200).send("OK");
  }

  const message = formatMessage(user.discordId, event, parsed);
  if (!message) {
    return res.status(200).send("OK");
  }

  const components = getEventComponents(event, parsed);
  const standardChannels = await getAllStandardChannels();

  let sentToAny = false;
  const userGuildIds = new Set();
  for (const tc of standardChannels) {
    if (userGuildIds.has(tc.guild_id)) continue;
    const guild = client.guilds.cache.get(tc.guild_id);
    if (!guild) continue;
    try {
      await guild.members.fetch(user.discordId);
      userGuildIds.add(tc.guild_id);
    } catch {
      // user not in this guild
    }
  }
  const relevantChannels = standardChannels.filter(tc => userGuildIds.has(tc.guild_id));
  for (const tc of relevantChannels) {
    try {
      const channel = await getTextChannel(client, tc.channel_id);
      if (!channel) {
        console.warn(`Standard channel ${tc.channel_id} not found or not text-based`);
        continue;
      }
      await channel.send({ content: message, components });
      sentToAny = true;
    } catch (error) {
      console.error(`Failed to send ${event} to standard channel ${tc.channel_id}:`, error);
    }
  }
  if (!sentToAny) {
    const fallback = process.env.DISCORD_CHANNEL_ID;
    if (fallback) {
      try {
        const channel = await getTextChannel(client, fallback);
        if (channel) {
          await channel.send({ content: message, components });
        } else {
          console.warn(`Fallback channel ${fallback} not found or not text-based`);
        }
      } catch (error) {
        console.error("Failed to send webhook message to fallback:", error);
      }
    }
  }

  if (event === "push") {
    const ownCount = getOwnCommits(parsed, parsed.sender?.login).length;
    if (ownCount > 0) {
      await addCommitCount(user.discordId, ownCount);
    }
  }

  res.status(200).send("OK");
}
