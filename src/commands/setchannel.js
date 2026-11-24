import { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function setchannelCommand(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ You need Administrator permission to use this command.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x28a745)
    .setTitle('📢 Configure Channel')
    .setDescription(`Set up how this channel (<#${interaction.channelId}>) behaves.\n\nChoose a mode:`)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('standard_mode')
      .setLabel('📋 Standard Mode')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('org_mode')
      .setLabel('🏢 Org Mode')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}