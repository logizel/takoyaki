import pg from 'pg';
import crypto from 'crypto';

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      discord_id TEXT PRIMARY KEY,
      github_login TEXT NOT NULL,
      access_token TEXT
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS channels (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      discord_id TEXT NOT NULL,
      interaction_token TEXT,
      created_at BIGINT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS commits (
      discord_id TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (discord_id, date)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracked_channels (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      org_name TEXT,
      PRIMARY KEY (guild_id, channel_id)
    )
  `);
}

ensureTables().catch(err => {
  console.error('Failed to ensure database tables:', err);
});

export async function getUser(discordId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
  if (rows.length === 0) return null;
  const row = rows[0];
  return { githubLogin: row.github_login, accessToken: row.access_token };
}

export async function setUser(discordId, userObj) {
  await pool.query(
    'INSERT INTO users (discord_id, github_login, access_token) VALUES ($1, $2, $3) ON CONFLICT (discord_id) DO UPDATE SET github_login = $2, access_token = $3',
    [discordId, userObj.githubLogin, userObj.accessToken]
  );
}

export async function deleteUser(discordId) {
  await pool.query('DELETE FROM users WHERE discord_id = $1', [discordId]);
}

export async function getChannel(guildId) {
  const { rows } = await pool.query('SELECT * FROM channels WHERE guild_id = $1', [guildId]);
  return rows.length > 0 ? rows[0].channel_id : null;
}

export async function setChannel(guildId, channelId) {
  await pool.query(
    'INSERT INTO channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2',
    [guildId, channelId]
  );
}

export async function getChannelId() {
  const { rows } = await pool.query('SELECT channel_id FROM channels LIMIT 1');
  return rows.length > 0 ? rows[0].channel_id : null;
}

export async function setChannelId(channelId) {
  const { rows } = await pool.query('SELECT guild_id FROM channels LIMIT 1');
  const guildId = rows.length > 0 ? rows[0].guild_id : 'default';
  await setChannel(guildId, channelId);
}

export async function createOAuthState(discordId, interactionToken = null) {
  const state = crypto.randomBytes(16).toString('hex');
  await pool.query(
    'INSERT INTO oauth_states (state, discord_id, interaction_token, created_at) VALUES ($1, $2, $3, $4)',
    [state, discordId, interactionToken, Date.now()]
  );
  return state;
}

export async function getOAuthState(state) {
  const { rows } = await pool.query('SELECT * FROM oauth_states WHERE state = $1', [state]);
  if (rows.length === 0) return null;
  const row = rows[0];
  if (Date.now() - row.created_at > OAUTH_STATE_TTL_MS) {
    await pool.query('DELETE FROM oauth_states WHERE state = $1', [state]);
    return null;
  }
  return { discord_id: row.discord_id, interaction_token: row.interaction_token, created_at: row.created_at };
}

export async function deleteOAuthState(state) {
  await pool.query('DELETE FROM oauth_states WHERE state = $1', [state]);
}

export async function addCommitCount(discordId, count) {
  const key = todayKey();
  await pool.query(
    'INSERT INTO commits (discord_id, date, count) VALUES ($1, $2, $3) ON CONFLICT (discord_id, date) DO UPDATE SET count = commits.count + $3',
    [discordId, key, count]
  );
}

export async function getTodayCommits(discordId) {
  const { rows } = await pool.query('SELECT count FROM commits WHERE discord_id = $1 AND date = $2', [discordId, todayKey()]);
  return rows.length > 0 ? rows[0].count : 0;
}

export async function getAllTodayCommits() {
  const { rows } = await pool.query('SELECT discord_id, count FROM commits WHERE date = $1', [todayKey()]);
  return rows.map(r => ({ discordId: r.discord_id, count: r.count }));
}

export async function getCommitsForDateRange(discordId, startDate, endDate) {
  const { rows } = await pool.query('SELECT SUM(count) AS total FROM commits WHERE discord_id = $1 AND date >= $2 AND date <= $3', [discordId, startDate, endDate]);
  return rows[0]?.total || 0;
}

export async function getYearCommits(discordId) {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  return getCommitsForDateRange(discordId, yearAgo.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
}

export async function getAllLogins() {
  const { rows } = await pool.query('SELECT discord_id, github_login, access_token FROM users');
  return rows.map(r => ({ discordId: r.discord_id, githubLogin: r.github_login, accessToken: r.access_token }));
}

export async function setTrackedChannel(guildId, channelId, mode, orgName = null) {
  await pool.query(
    'INSERT INTO tracked_channels (guild_id, channel_id, mode, org_name) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, channel_id) DO UPDATE SET mode = $3, org_name = $4',
    [guildId, channelId, mode, orgName]
  );
}

export async function deleteTrackedChannel(guildId, channelId) {
  await pool.query('DELETE FROM tracked_channels WHERE guild_id = $1 AND channel_id = $2', [guildId, channelId]);
}

export async function getTrackedChannelsByMode(guildId, mode) {
  const { rows } = await pool.query('SELECT * FROM tracked_channels WHERE guild_id = $1 AND mode = $2', [guildId, mode]);
  return rows;
}

export async function getOrgChannelsByOrgName(orgName) {
  const { rows } = await pool.query(
    'SELECT * FROM tracked_channels WHERE mode = $1 AND lower(org_name) = lower($2)',
    ['org', orgName]
  );
  return rows;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function readData() {
  const data = { users: {}, channels: {}, oauth_states: {}, commits: {}, tracked_channels: [] };
  const [users, channels, states, commits, tcs] = await Promise.all([
    pool.query('SELECT * FROM users'),
    pool.query('SELECT * FROM channels'),
    pool.query('SELECT * FROM oauth_states'),
    pool.query('SELECT * FROM commits'),
    pool.query('SELECT * FROM tracked_channels'),
  ]);
  for (const row of users.rows) {
    data.users[row.discord_id] = { githubLogin: row.github_login, accessToken: row.access_token };
  }
  for (const row of channels.rows) {
    data.channels[row.guild_id] = row.channel_id;
  }
  for (const row of states.rows) {
    data.oauth_states[row.state] = { discord_id: row.discord_id, interaction_token: row.interaction_token, created_at: row.created_at };
  }
  for (const row of commits.rows) {
    if (!data.commits[row.discord_id]) data.commits[row.discord_id] = {};
    data.commits[row.discord_id][row.date] = row.count;
  }
  for (const row of tcs.rows) {
    data.tracked_channels.push({ guild_id: row.guild_id, channel_id: row.channel_id, mode: row.mode, org_name: row.org_name });
  }
  return data;
}
