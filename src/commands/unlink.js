import { EmbedBuilder } from 'discord.js';
import { getUser, deleteUser } from '../database.js';

export async function unlinkCommand(interaction) {
  const user = await getUser(interaction.user.id);
  if (!user) {
    return interaction.reply({
      content: '❌ You don\'t have a GitHub account linked.',
      ephemeral: true,
    });
  }

  await deleteUser(interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x28a745)
    .setTitle('✅ GitHub Account Unlinked')
    .setDescription(`Your GitHub account (**@${user.githubLogin}**) has been unlinked from Takoyaki.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}