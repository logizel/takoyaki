import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { getUser, getAllLogins } from "../database.js";
import { renderStreakPng } from "../streak-image.js";

function fmt(n) {
  return n.toLocaleString();
}

const GQL_QUERY = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
        }
      }
    }
  }
`;

const GQL_CALENDAR = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

async function fetchCommitCount(login, token, since, until) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: GQL_QUERY,
      variables: { login, from: since, to: until },
    }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    console.error(
      "GitHub API error:",
      res.status,
      JSON.stringify(body.errors || body),
    );
    throw new Error(`GitHub API: ${res.status}`);
  }
  return (
    body.data.user.contributionsCollection.contributionCalendar
      .totalContributions || 0
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yearAgoStr() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function dateStart(s) {
  return s + "T00:00:00Z";
}
function dateEnd(s) {
  return s + "T23:59:59Z";
}

async function generateStreakGrid(login, token) {
  const today = todayStr();
  const yearAgo = yearAgoStr();
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: GQL_CALENDAR,
      variables: { login, from: dateStart(yearAgo), to: dateEnd(today) },
    }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    console.error(
      "GitHub API error:",
      res.status,
      JSON.stringify(body.errors || body),
    );
    throw new Error(`GitHub API: ${res.status}`);
  }
  const weeks =
    body.data.user.contributionsCollection.contributionCalendar.weeks;
  const commits = {};
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      commits[day.date] = day.contributionCount;
    }
  }

  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;
  const toKey = (d) => d.toISOString().slice(0, 10);

  // Monday-aligned 26-week window ending with the week containing today,
  // so each labeled row holds its real weekday.
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const diffToMonday = (todayUTC.getUTCDay() + 6) % 7;
  const thisMonday = new Date(todayUTC);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - diffToMonday);
  const start = new Date(thisMonday);
  start.setUTCDate(start.getUTCDate() - 25 * 7);

  const cells = Array.from({ length: 7 }, () => Array(26).fill(0));
  let total = 0;
  for (let i = 0; i < 182; i++) {
    const d = new Date(start.getTime() + i * DAY);
    const count = commits[toKey(d)] || 0;
    cells[i % 7][Math.floor(i / 7)] = count;
    total += count;
  }

  // Current streak: consecutive active days ending today (or yesterday).
  let streak = 0;
  let cursor = new Date(todayUTC);
  if ((commits[toKey(cursor)] || 0) === 0) {
    cursor = new Date(cursor.getTime() - DAY);
  }
  while ((commits[toKey(cursor)] || 0) > 0) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY);
  }

  // GitHub dark-mode greens; empty cells are #151b23 (see streak-image.js).
  const pngBuffer = renderStreakPng(cells, start);

  return { pngBuffer, total, streak };
}

export async function statsCommand(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "me") {
    await statsMe(interaction);
  } else if (sub === "compare") {
    await statsCompare(interaction);
  } else if (sub === "top") {
    await statsTop(interaction);
  } else if (sub === "top-day") {
    await statsTopDay(interaction);
  } else if (sub === "streak") {
    await statsStreak(interaction);
  }
}

async function statsMe(interaction) {
  const user = await getUser(interaction.user.id);
  if (!user || !user.accessToken) {
    return interaction.reply({
      content:
        "❌ No GitHub account linked or missing access token. Please run `/github link` again.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const today = todayStr();
    const yearAgo = yearAgoStr();

    const [yearCount, todayCount] = await Promise.all([
      fetchCommitCount(
        user.githubLogin,
        user.accessToken,
        dateStart(yearAgo),
        dateEnd(today),
      ),
      fetchCommitCount(
        user.githubLogin,
        user.accessToken,
        dateStart(today),
        dateEnd(today),
      ),
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x24292e)
      .setTitle(`📊 Contribution Stats — @${user.githubLogin}`)
      .addFields(
        {
          name: "📅 Today",
          value: `**${fmt(todayCount)}** contributions`,
          inline: true,
        },
        {
          name: "📆 Past 365 days",
          value: `**${fmt(yearCount)}** contributions`,
          inline: true,
        },
        {
          name: "🏆 Daily average",
          value: `**${(yearCount / 365).toFixed(1)}** / day`,
          inline: true,
        },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Stats me error:", err);
    await interaction.editReply({
      content: "❌ Failed to fetch commit stats from GitHub. Try again later.",
    });
  }
}

async function statsCompare(interaction) {
  const targetUser = interaction.options.getUser("user");
  if (!targetUser) {
    return interaction.reply({
      content: "❌ Please specify a user to compare with.",
      ephemeral: true,
    });
  }

  const me = await getUser(interaction.user.id);
  const them = await getUser(targetUser.id);

  if (!me || !me.accessToken) {
    return interaction.reply({
      content:
        "❌ You need to link your GitHub account first via `/github link`.",
      ephemeral: true,
    });
  }
  if (!them || !them.accessToken) {
    return interaction.reply({
      content: "❌ That user hasn't linked their GitHub account.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const today = todayStr();
    const yearAgo = yearAgoStr();

    const [myYear, theirYear] = await Promise.all([
      fetchCommitCount(
        me.githubLogin,
        me.accessToken,
        dateStart(yearAgo),
        dateEnd(today),
      ),
      fetchCommitCount(
        them.githubLogin,
        them.accessToken,
        dateStart(yearAgo),
        dateEnd(today),
      ),
    ]);

    const diff = myYear - theirYear;
    const sign = diff >= 0 ? "+" : "";
    const winner =
      diff > 0
        ? `<@${interaction.user.id}>`
        : diff < 0
          ? `<@${targetUser.id}>`
          : "Nobody";

    const embed = new EmbedBuilder()
      .setColor(0x24292e)
      .setTitle("📊 Contribution Comparison (Past 365 Days)")
      .setDescription(`${winner} is ahead!`)
      .addFields(
        {
          name: `@${me.githubLogin}`,
          value: `**${fmt(myYear)}** contributions`,
          inline: true,
        },
        {
          name: `@${them.githubLogin}`,
          value: `**${fmt(theirYear)}** contributions`,
          inline: true,
        },
        {
          name: "Difference",
          value: `**${sign}${fmt(Math.abs(diff))}**`,
          inline: true,
        },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Stats compare error:", err);
    await interaction.editReply({
      content: "❌ Failed to fetch commit stats. Try again later.",
    });
  }
}

const memberCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

async function filterGuildMembers(interaction, users) {
  const cacheKey = interaction.guildId;
  const cached = memberCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return users.filter(u => cached.memberIds.has(u.discordId));
  }
  
  let members;
  let retries = 3;
  let delay = 1000;
  
  while (retries > 0) {
    try {
      members = await interaction.guild.members.fetch();
      break;
    } catch (error) {
      if (error.message.includes('rate limited') || error.code === 'GatewayRateLimitError') {
        const waitTime = error.data?.retry_after ? error.data.retry_after * 1000 : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        delay *= 2;
        retries--;
      } else {
        throw error;
      }
    }
  }
  
  if (!members) {
    return users; // Return unfiltered if fetch fails
  }
  
  const memberIds = new Set(members.map(m => m.id));
  memberCache.set(cacheKey, {
    memberIds,
    timestamp: Date.now()
  });
  
  return users.filter(u => memberIds.has(u.discordId));
}

async function statsTop(interaction) {
  const allUsers = (await getAllLogins()).filter((u) => u.accessToken);
  const guildUsers = await filterGuildMembers(interaction, allUsers);
  if (guildUsers.length === 0) {
    return interaction.reply({
      content: "❌ No one in this server has linked their GitHub account yet.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const today = todayStr();
    const yearAgo = yearAgoStr();

    const results = [];
    for (const u of guildUsers) {
      try {
        const count = await fetchCommitCount(
          u.githubLogin,
          u.accessToken,
          dateStart(yearAgo),
          dateEnd(today),
        );
        results.push({
          discordId: u.discordId,
          githubLogin: u.githubLogin,
          count,
        });
      } catch {
        // skip failed fetches
      }
    }

    results.sort((a, b) => b.count - a.count);

    const medals = ["🥇", "🥈", "🥉"];
    let description = "";
    for (let i = 0; i < Math.min(results.length, 10); i++) {
      const r = results[i];
      const rank = i < 3 ? medals[i] : `#${i + 1}`;
      description += `${rank} <@${r.discordId}> — **${fmt(r.count)}** contributions\n`;
    }

    if (results.length > 10) {
      description += `\n... and ${results.length - 10} more`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x24292e)
      .setTitle("🏆 Contribution Leaderboard (Past 365 Days)")
      .setDescription(description)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Stats top error:", err);
    await interaction.editReply({
      content: "❌ Failed to fetch leaderboard. Try again later.",
    });
  }
}

async function statsTopDay(interaction) {
  const allUsers = (await getAllLogins()).filter((u) => u.accessToken);
  const guildUsers = await filterGuildMembers(interaction, allUsers);
  if (guildUsers.length === 0) {
    return interaction.reply({
      content: "📭 No one in this server has linked their GitHub account yet.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const today = todayStr();

    const results = [];
    for (const u of guildUsers) {
      try {
        const count = await fetchCommitCount(
          u.githubLogin,
          u.accessToken,
          dateStart(today),
          dateEnd(today),
        );
        if (count > 0) {
          results.push({
            discordId: u.discordId,
            githubLogin: u.githubLogin,
            count,
          });
        }
      } catch {
        // skip failed fetches
      }
    }

    if (results.length === 0) {
      return interaction.editReply({
        content: "📭 No contributions from anyone today yet.",
      });
    }

    results.sort((a, b) => b.count - a.count);

    const medals = ["🥇", "🥈", "🥉"];
    let description = `📅 **${todayStr()}**\n\n`;
    for (let i = 0; i < Math.min(results.length, 10); i++) {
      const r = results[i];
      const rank = i < 3 ? medals[i] : `#${i + 1}`;
      description += `${rank} <@${r.discordId}> — **${fmt(r.count)}** contribution${r.count !== 1 ? "s" : ""}\n`;
    }

    if (results.length > 10) {
      description += `\n... and ${results.length - 10} more`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x24292e)
      .setTitle("📊 Today's Contribution Leaders")
      .setDescription(description)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Stats top-day error:", err);
    await interaction.editReply({
      content: "❌ Failed to fetch today's leaderboard. Try again later.",
    });
  }
}

async function statsStreak(interaction) {
  const user = await getUser(interaction.user.id);
  if (!user) {
    return interaction.reply({
      content: "❌ No GitHub account linked. Please run `/github link` first.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: false });

  try {
    const { pngBuffer, total, streak } = await generateStreakGrid(
      user.githubLogin,
      user.accessToken,
    );
    const attachment = new AttachmentBuilder(pngBuffer, {
      name: "streak.png",
    });
    const embed = new EmbedBuilder()
      .setColor(0x24292e)
      .setTitle(`📊 Contribution Streak — @${user.githubLogin}`)
      .setDescription(
        `Past 182 days · **${fmt(total)}** contributions · **${streak}**-day streak`,
      )
      .setImage("attachment://streak.png")
      .setFooter({ text: "Darker green = more · Dim = no activity" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error("Stats streak error:", err);
    await interaction.editReply({
      content: "❌ Failed to fetch contribution calendar. Try again later.",
    });
  }
}
