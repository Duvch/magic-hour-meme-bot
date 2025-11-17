require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
} = require("discord.js");
const cron = require("node-cron");
const express = require("express");
const MagicHourImport = require("magic-hour");

// Handle CommonJS default export
const MagicHour = MagicHourImport.default || MagicHourImport;

// Initialize Magic Hour client
const mh = new MagicHour({ token: process.env.MH_API_KEY });

// Create Discord client
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const BOT_COMMAND_PREFIX = "create meme";
const CHANNEL_SETUP_COMMAND = "setmemechannel";

// === Store multiple channels per guild ===
const guildChannelMap = new Map(); // guildId -> [channelIds]

// === HEALTH CHECK API SERVER ===
const app = express();
const PORT = process.env.PORT || 3000;

// Bot start time for uptime tracking
const startTime = Date.now();

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000); // uptime in seconds
  const uptimeMinutes = Math.floor(uptime / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);

  res.status(200).json({
    status: "healthy",
    service: "Magic Hour Discord Meme Bot",
    uptime: {
      seconds: uptime,
      formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptime % 60}s`,
    },
    discord: {
      connected: discord.ws.status === 0,
      status: discord.ws.status,
      guilds: discord.guilds.cache.size,
      ping: discord.ws.ping,
    },
    channels: {
      configured: guildChannelMap.size,
      total: Array.from(guildChannelMap.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
    },
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Magic Hour Discord Meme Bot API",
    endpoints: {
      health: "/health - Check bot health and status",
    },
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`🌐 Health check API running on port ${PORT}`);
  console.log(`📊 Health endpoint: http://localhost:${PORT}/health`);
});

// === ON READY ===
discord.once("ready", () => {
  console.log(`✅ Logged in as ${discord.user.tag}`);
  discord.user.setActivity(
    `Use /${CHANNEL_SETUP_COMMAND} to set meme channels`
  );
});

// === REGISTER SLASH COMMANDS ===
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands(clientId) {
  const commands = [
    {
      name: CHANNEL_SETUP_COMMAND,
      description: "Add a channel where memes should be posted automatically",
      options: [
        {
          name: "channel",
          description: "Select the channel for meme posting",
          type: 7, // CHANNEL type
          required: true,
        },
      ],
    },
  ];

  try {
    console.log("⚙️ Registering slash commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("✅ Slash commands registered globally.");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
}

// === HANDLE SLASH COMMANDS ===
discord.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === CHANNEL_SETUP_COMMAND) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "❌ Only admins can set meme channels.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel");

    // Store multiple channels for each guild
    const channels = guildChannelMap.get(interaction.guildId) || [];
    if (!channels.includes(channel.id)) {
      channels.push(channel.id);
      guildChannelMap.set(interaction.guildId, channels);
    }

    await interaction.reply(
      `✅ Added ${channel.toString()} for auto memes! You can add more channels too.`
    );
  }
});

// === FUNCTION: Generate Meme via Magic Hour ===
async function generateContent(prompt) {
  try {
    console.log(
      `[${new Date().toLocaleTimeString()}] 🎨 Generating meme for: "${prompt}"`
    );

    const result = await mh.v1.aiMemeGenerator.generate(
      {
        name: "Discord Meme Generation",
        style: {
          searchWeb: false,
          template: "Random",
          topic: prompt,
        },
      },
      { waitForCompletion: true, downloadOutputs: false }
    );

    if (result.status === "complete" && result.downloads?.length > 0) {
      return result.downloads[0].url;
    } else {
      console.error("❌ Meme generation failed:", result.error?.message);
      return null;
    }
  } catch (err) {
    console.error("🛑 MagicHour error:", err.message);
    return null;
  }
}

// === FUNCTION: Find Most Engaging Message ===
async function findMostEngagingMessage(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    let mostEngaging = null;
    let maxReactions = -1;

    for (const message of messages.values()) {
      if (message.author.bot) continue;
      let totalReactions = 0;
      message.reactions.cache.forEach(
        (reaction) => (totalReactions += reaction.count)
      );

      if (totalReactions > maxReactions) {
        maxReactions = totalReactions;
        mostEngaging = message;
      }
    }

    if (!mostEngaging)
      mostEngaging = messages.find((m) => !m.author.bot) || null;
    return mostEngaging;
  } catch (error) {
    console.error("❌ Error finding engaging message:", error);
    return null;
  }
}

// === RESPOND TO @MENTIONS ===
discord.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(discord.user)) return;

  // Ignore replies to bot's own messages to prevent reply loops
  if (message.reference) {
    try {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMessage.author.id === discord.user.id) {
        return; // Silently ignore replies to bot's messages
      }
    } catch (error) {
      console.error("❌ Error fetching replied message:", error);
    }
  }

  const contentArray = message.cleanContent.trim().split(/\s+/);
  if (contentArray[0].startsWith("@")) contentArray.shift();
  const prompt = contentArray.join(" ").trim();

  if (!prompt) {
    return message.reply(
      `Please provide a meme idea like: \`@${discord.user.username} nitin trying to play with cursor meme\``
    );
  }

  await message.reply("🎨 Generating your meme... hang tight!");
  const memeUrl = await generateContent(prompt);

  if (memeUrl) {
    await message.reply({
      content: `😂 Here's your meme, ${message.author}: **${prompt}**`,
      files: [memeUrl],
    });
  } else {
    await message.reply(
      "❌ Meme generation failed. Check MagicHour API or try another prompt."
    );
  }
});

// === AUTOMATIC MEME EVERY 1 MINUTE ===
cron.schedule("0 */24 * * *", async () => {
  console.log(
    `[${new Date().toLocaleTimeString()}] 🕒 Auto meme job running...`
  );

  for (const [guildId, channelIds] of guildChannelMap.entries()) {
    for (const channelId of channelIds) {
      try {
        const channel = await discord.channels.fetch(channelId);
        const engagingMessage = await findMostEngagingMessage(channel);

        if (engagingMessage) {
          const author = engagingMessage.author;
          const content = engagingMessage.content;
          const prompt = `Create a funny meme based on this message: "${content}"`;

          console.log(
            `🔥 Generating auto meme for ${author.username} in guild ${guildId}, channel ${channel.name}`
          );
          const memeUrl = await generateContent(prompt);

          if (memeUrl) {
            await channel.send({
              content: `🤣 **Auto Meme Time!** This one’s for you, ${author}! (Based on: "${content.substring(
                0,
                50
              )}...")`,
              files: [memeUrl],
            });
          }
        }
      } catch (err) {
        console.error("❌ Error in auto meme job:", err);
      }
    }
  }
});

// === START BOT ===
discord.login(process.env.DISCORD_TOKEN).then(() => {
  registerCommands(discord.user?.id || process.env.CLIENT_ID);
});
