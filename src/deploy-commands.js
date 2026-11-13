import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import 'dotenv/config';

const commands = [
  new SlashCommandBuilder()
    .setName('github')
    .setDescription('Manage your GitHub integration with Takoyaki.')
    .addSubcommand(sub => sub.setName('link').setDescription('Link your Discord account to GitHub.'))
    .addSubcommand(sub => sub.setName('unlink').setDescription('Remove your GitHub link.')),
  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set this channel for Takoyaki notifications.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('request-review')
    .setDescription('Ask a server member to review and merge an open pull request.')
    .addUserOption(opt => opt
      .setName('user')
      .setDescription('The server member who should review and merge the pull request.')
      .setRequired(false)),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View GitHub commit statistics.')
    .addSubcommand(sub => sub.setName('me').setDescription('Your commit count today and in the past 365 days.'))
    .addSubcommand(sub => sub.setName('streak').setDescription('Your commit streak chart for the past year.'))
    .addSubcommand(sub => sub.setName('compare')
      .setDescription('Compare your commits with another user.')
      .addUserOption(opt => opt.setName('user').setDescription('The user to compare with.').setRequired(true)))
    .addSubcommand(sub => sub.setName('top').setDescription('Leaderboard of commits in the past 365 days.'))
    .addSubcommand(sub => sub.setName('top-day').setDescription('Who has the most commits today.')),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();