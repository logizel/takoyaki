import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  ActivityType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import express from "express";
import { oauthCallbackHandler } from "./oauth-handler.js";
import { webhookHandler } from "./webhook-handler.js";
import { linkCommand } from "./commands/link.js";
import { unlinkCommand } from "./commands/unlink.js";
import { statsCommand } from "./commands/stats.js";
import { setchannelCommand } from "./commands/setchannel.js";
import { setTrackedChannel, getTrackedChannelsByMode, setChannel, deleteTrackedChannel } from "./database.js";

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Make client globally accessible for webhook handler
global.discordClient = client;

// Raw body parser for webhook (large pushes + workflow_run events exceed the 100kb default)
app.use("/webhook", express.raw({ type: "application/json", limit: "5mb" }));
app.post("/webhook", webhookHandler);
app.use("/webhook", (err, req, res, next) => {
  if (err) {
    console.error(
      `Webhook parse failed: ${err.type || err.message} | event=${req.headers["x-github-event"]} delivery=${req.headers["x-github-delivery"]} content-length=${req.headers["content-length"]}`
    );
    return res.status(413).send("Payload too large");
  }
  next();
});

// JSON parser for other routes
app.use(express.json());
app.get("/health", (_, res) => res.send("OK"));
app.get("/auth/callback", oauthCallbackHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});

client.once(Events.ClientReady, (c) => {
  console.log("Takoyaki is online! 🐙");
  c.user.setPresence({
    activities: [{ name: "GitHub events", type: ActivityType.Watching }],
    status: "online",
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === "org_mode") {
      const modal = new ModalBuilder()
        .setCustomId("org_modal")
        .setTitle("Enable Org Mode")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("org_name")
              .setLabel("GitHub Organization Name")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("e.g. takoyaki")
              .setRequired(true),
          ),
        );
      await interaction.showModal(modal);
    } else if (interaction.customId === "standard_mode") {
      const existing = await getTrackedChannelsByMode(interaction.guildId, 'standard');
      if (existing.length > 0) {
        const oldChannelId = existing[0].channel_id;
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_std_override')
            .setLabel('✅ Yes, Replace')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_std_override')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary),
        );
        await interaction.update({
          content: `⚠️ <#${oldChannelId}> is already set as the standard channel. Replace it with <#${interaction.channelId}>?`,
          embeds: [],
          components: [row],
        });
      } else {
        await setTrackedChannel(interaction.guildId, interaction.channelId, 'standard');
        await interaction.update({
          content: "✅ Standard mode activated. Users can link their personal GitHub accounts.",
          embeds: [],
          components: [],
        });
      }
    } else if (interaction.customId === "confirm_std_override") {
      const existing = await getTrackedChannelsByMode(interaction.guildId, 'standard');
      if (existing.length > 0) {
        await deleteTrackedChannel(interaction.guildId, existing[0].channel_id);
      }
      await setTrackedChannel(interaction.guildId, interaction.channelId, 'standard');
      await interaction.update({
        content: `✅ Standard channel updated to <#${interaction.channelId}>.`,
        embeds: [],
        components: [],
      });
    } else if (interaction.customId === "cancel_std_override") {
      await interaction.update({
        content: "❌ No changes made.",
        embeds: [],
        components: [],
      });
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "org_modal") {
      const orgName = interaction.fields.getTextInputValue("org_name").trim().toLowerCase();
      if (!orgName) {
        return interaction.reply({ content: "❌ Organization name is required.", ephemeral: true });
      }
      await setTrackedChannel(interaction.guildId, interaction.channelId, 'org', orgName);
      const appName = process.env.GITHUB_APP_NAME;
      const installUrl = `https://github.com/apps/${appName}/installations/new`;
      await interaction.update({
        content: `✅ **Org Mode** activated for **${orgName}**.\n\nInstall the GitHub App on your org:\n${installUrl}\n\nAfter installing, push/PR/issue events from any **${orgName}** repo will appear in this channel.`,
        embeds: [],
        components: [],
      });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const guildId = interaction.guildId;

  if (commandName === "github") {
    const subcommand = interaction.options.getSubcommand();

    const orgChannels = await getTrackedChannelsByMode(guildId, 'org');
    if (orgChannels.length > 0) {
      return interaction.reply({
        content: "❌ Org mode is active in this server. Personal GitHub linking is disabled.",
        ephemeral: true,
      });
    }

    if (subcommand === "link") {
      await linkCommand(interaction);
    } else if (subcommand === "unlink") {
      await unlinkCommand(interaction);
    }
  } else if (commandName === "setchannel") {
    await setchannelCommand(interaction);
  } else if (commandName === "stats") {
    const orgChannels = await getTrackedChannelsByMode(guildId, 'org');
    if (orgChannels.length > 0) {
      return interaction.reply({
        content: "❌ Stats are disabled in org mode.",
        ephemeral: true,
      });
    }
    await statsCommand(interaction);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
