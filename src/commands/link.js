import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createOAuthState, getUser } from '../database.js';

export async function linkCommand(interaction) {
  const existingUser = await getUser(interaction.user.id);
  const appName = process.env.GITHUB_APP_NAME;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const baseUrl = process.env.BASE_URL;
  if (!appName || !clientId || !clientSecret || !baseUrl) {
    return interaction.reply({
      content: '❌ GitHub is not fully configured. Set GITHUB_APP_NAME, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and BASE_URL.',
      ephemeral: true,
    });
  }

  const state = await createOAuthState(interaction.user.id, interaction.token);
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback`;
  const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=read:user`;
  const installUrl = `https://github.com/apps/${appName}/installations/new`;

  let title = '🔗 Link GitHub Account';
  let color = 0x24292e;

  if (existingUser) {
    title = '🔄 Re-link GitHub Account';
    color = 0xd63384;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      'Click **Link GitHub Account** to authorize Takoyaki with your GitHub account.\n\n' +
      'To receive repository events, also install the GitHub App on the account or organization that owns the repos using **Install GitHub App**.'
    )
    .addFields(
      { name: '📋 What happens next', value: 'Your GitHub identity is linked for `/stats`. In standard mode, your events are posted to the configured channel with a mention.' },
      { name: '🔒 Privacy', value: 'Private repos will show as "private repo" without exposing the name.' }
    )
    .setTimestamp()
    .setFooter({ text: 'Takoyaki Bot' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(existingUser ? 'Re-link GitHub Account' : 'Link GitHub Account')
      .setStyle(ButtonStyle.Link)
      .setURL(oauthUrl),
    new ButtonBuilder()
      .setLabel('Install GitHub App')
      .setStyle(ButtonStyle.Link)
      .setURL(installUrl)
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}
