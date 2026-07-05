// ═══════════════════════════════════════════════════════════════════════
//  HARD-CODED CONFIG — paste values here if not using environment vars
// ═══════════════════════════════════════════════════════════════════════
const HARD_CODED_BOT_TOKEN  = ""; // ← paste Discord bot token here
const HARD_CODED_MONGO_URI  = ""; // ← paste MongoDB URI here (also set in run-bot.js)
const HARD_CODED_OWNER_ID   = ""; // ← paste your Discord user ID here
const SITE_URL              = process.env.SITE_URL || ""; // ← your Vercel frontend URL e.g. https://ps99bet.vercel.app
// Banner 1 is at /banner/1.png on your frontend — set SITE_URL or paste full URL below:
const BANNER_URL           = process.env.BANNER_URL || (SITE_URL ? `${SITE_URL}/banner/1.png` : "https://ps99bet.vercel.app");
// ═══════════════════════════════════════════════════════════════════════

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActivityType,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");

const { bottoken: envBotToken, ownerDiscordId } = require("./config.js");
const users     = require("./modules/users.js");
const bots      = require("./modules/bots.js");
const withdraws = require("./modules/withdraws.js");
const inventorys = require("./modules/inventorys.js");
const logger    = require("./logger.js");
const settings  = require("./settings.js");

const BOT_TOKEN        = HARD_CODED_BOT_TOKEN || envBotToken;
const OWNER_DISCORD_ID = HARD_CODED_OWNER_ID  || ownerDiscordId;

const SUPPORT_PANEL_CHANNEL_ID = "1521084432688222208";

const TICKET_CATEGORIES = {
  ticket_site_support:    "🎫 Site Support",
  ticket_scams:           "🚨 Scams & Unfair Trades",
  ticket_discord_support: "💬 Discord Support",
  ticket_claim_gw:        "🎉 Claim DC GWs",
};

// Active giveaways: giveawayId -> { prize, winnersCount, entrants: Set, timer, channelId, messageId }
const activeGiveaways = new Map();

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMembers,
];

const client = new Client({ intents });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOwner(interaction) {
  if (OWNER_DISCORD_ID && interaction.user.id === OWNER_DISCORD_ID) return true;
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

function applyBanner(embed) {
  if (BANNER_URL) embed.setImage(BANNER_URL);
  return embed;
}

async function getOrCreateCategory(guild, name) {
  let cat = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name
  );
  if (!cat) {
    cat = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      ],
    });
    console.log(`Created category: ${name}`);
  }
  return cat;
}

// ─── Support Panel ────────────────────────────────────────────────────────────

async function sendSupportPanel() {
  try {
    const channel = await client.channels.fetch(SUPPORT_PANEL_CHANNEL_ID);
    if (!channel) return console.warn("Support panel channel not found:", SUPPORT_PANEL_CHANNEL_ID);

    const messages = await channel.messages.fetch({ limit: 20 });
    const botMsgs  = messages.filter((m) => m.author.id === client.user.id);
    for (const [, msg] of botMsgs) await msg.delete().catch(() => {});

    const embed = applyBanner(
      new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("🎫 PS99Bet Support Center")
        .setDescription(
          "Welcome to PS99Bet support! Click the button that matches your issue below.\n\n" +
          "🌐 **Site Support** — Website, balance, or account issues\n" +
          "🚨 **Scams / Unfair Trades** — Report a scam or bad trade\n" +
          "💬 **Discord Support** — Roles, verification, or server issues\n" +
          "🎉 **Claim DC GWs** — Claim your Discord giveaway winnings"
        )
        .setFooter({ text: "PS99Bet • Support" })
        .setTimestamp()
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_site_support").setLabel("Site Support").setEmoji("🌐").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ticket_scams").setLabel("Scams / Unfair Trades").setEmoji("🚨").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("ticket_discord_support").setLabel("Discord Support").setEmoji("💬").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_claim_gw").setLabel("Claim DC GWs").setEmoji("🎉").setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log("Support panel sent to", SUPPORT_PANEL_CHANNEL_ID);
  } catch (e) {
    console.error("Failed to send support panel:", e.message);
  }
}

// ─── Giveaway helpers ─────────────────────────────────────────────────────────

function buildGiveawayEmbed(prize, endTime, winnersCount, entrantsCount, ended = false, winners = []) {
  const timeLeft = Math.max(0, endTime - Date.now());
  const endsIn   = ended ? "**Ended**" : `<t:${Math.floor(endTime / 1000)}:R>`;

  const embed = new EmbedBuilder()
    .setColor(ended ? 0x888888 : 0xf59e0b)
    .setTitle(ended ? `🎉 Giveaway Ended — ${prize}` : `🎉 Giveaway — ${prize}`)
    .setDescription(
      ended
        ? (winners.length
            ? `**Winner${winners.length > 1 ? "s" : ""}:** ${winners.map((id) => `<@${id}>`).join(", ")}`
            : "No one entered the giveaway.")
        : `React with 🎉 or click **Enter** to participate!\n\n**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Ends:** ${endsIn}\n**Entries:** ${entrantsCount}`
    )
    .setFooter({ text: `PS99Bet Giveaways${ended ? " • Ended" : ""}` })
    .setTimestamp();

  applyBanner(embed);
  return embed;
}

async function endGiveaway(giveawayId) {
  const gw = activeGiveaways.get(giveawayId);
  if (!gw) return;

  clearTimeout(gw.timer);
  activeGiveaways.delete(giveawayId);

  const entrantsArr = [...gw.entrants];
  const winners = [];
  const pool    = [...entrantsArr];
  const count   = Math.min(gw.winnersCount, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }

  try {
    const channel = await client.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(gw.messageId);

    const endedEmbed = buildGiveawayEmbed(gw.prize, gw.endTime, gw.winnersCount, entrantsArr.length, true, winners);

    await message.edit({ embeds: [endedEmbed], components: [] });

    const winnerMentions = winners.length
      ? `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(", ")}! You won **${gw.prize}**!`
      : "No valid entrants — giveaway ended with no winner.";

    await channel.send({ content: winnerMentions });
  } catch (e) {
    console.error("Failed to end giveaway:", e.message);
  }
}

// ─── Ready ────────────────────────────────────────────────────────────────────

client.once("clientReady", async () => {
  console.log(`PS99Bet bot is online as ${client.user.tag}`);

  try {
    client.user.setPresence({
      activities: [{ name: "PS99Bet", type: ActivityType.Playing }],
      status: "online",
    });
  } catch (e) {
    console.error("Failed to set presence:", e.message);
  }

  logger.init(client);

  let commands;
  try {
    commands = [
      new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Check the site profile of a Discord user")
        .addUserOption((o) => o.setName("user").setDescription("Select a user").setRequired(true)),

      new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Check your PS99Bet balance and stats"),

      new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the top 10 wagerers on PS99Bet"),

      new SlashCommandBuilder()
        .setName("profit")
        .setDescription("Check your profit on PS99Bet"),

      new SlashCommandBuilder()
        .setName("withdraws")
        .setDescription("See your pending withdrawals on PS99Bet"),

      new SlashCommandBuilder()
        .setName("cancelallwithdraws")
        .setDescription("Cancel all your pending withdrawals on PS99Bet"),

      new SlashCommandBuilder()
        .setName("deposit")
        .setDescription("View active deposit bots and join their games"),

      new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Owner only — manage giveaways")
        .addSubcommand((sub) =>
          sub
            .setName("start")
            .setDescription("Start a new giveaway")
            .addStringOption((o) => o.setName("prize").setDescription("What are you giving away?").setRequired(true))
            .addIntegerOption((o) => o.setName("duration").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(10080))
            .addIntegerOption((o) => o.setName("winners").setDescription("Number of winners (default 1)").setRequired(false).setMinValue(1).setMaxValue(20))
            .addChannelOption((o) => o.setName("channel").setDescription("Channel to post in (defaults to current)").setRequired(false))
        )
        .addSubcommand((sub) =>
          sub
            .setName("end")
            .setDescription("Force-end an active giveaway")
            .addStringOption((o) => o.setName("id").setDescription("Giveaway ID shown in the embed footer").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName("reroll")
            .setDescription("Reroll winners for an ended giveaway message")
            .addStringOption((o) => o.setName("messageid").setDescription("Message ID of the ended giveaway").setRequired(true))
        ),

      new SlashCommandBuilder()
        .setName("listalllinked")
        .setDescription("Owner only — list all users with linked Discord accounts")
        .addIntegerOption((o) => o.setName("page").setDescription("Page number (default 1)").setRequired(false)),

      new SlashCommandBuilder()
        .setName("locktipping")
        .setDescription("Owner only — enable or disable tipping for all users")
        .addStringOption((o) =>
          o.setName("action").setDescription("enable or disable tipping").setRequired(true)
            .addChoices({ name: "enable", value: "enable" }, { name: "disable", value: "disable" })
        ),

      new SlashCommandBuilder()
        .setName("create")
        .setDescription("Owner only — create a new deposit/withdraw bot")
        .addStringOption((o) => o.setName("name").setDescription("Bot's Roblox username").setRequired(true))
        .addStringOption((o) => o.setName("pfp").setDescription("Bot's avatar image URL").setRequired(true))
        .addIntegerOption((o) => o.setName("userid").setDescription("Bot's Roblox user ID").setRequired(true))
        .addStringOption((o) => o.setName("game").setDescription("Game (e.g. PS99)").setRequired(true))
        .addStringOption((o) => o.setName("link").setDescription("Roblox profile link (optional)")),

      new SlashCommandBuilder()
        .setName("toggle")
        .setDescription("Owner only — manage bots and site settings")
        .addSubcommand((sub) =>
          sub.setName("on").setDescription("Enable a bot")
            .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID (or 'all')").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName("off").setDescription("Disable a bot")
            .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID (or 'all')").setRequired(true))
        )
        .addSubcommand((sub) => sub.setName("list").setDescription("List all registered bots"))
        .addSubcommand((sub) =>
          sub.setName("delete").setDescription("Delete a bot entry")
            .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName("cancelwithdraws").setDescription("Enable or disable the cancel-withdraws feature site-wide")
            .addStringOption((o) =>
              o.setName("action").setDescription("enable or disable").setRequired(true)
                .addChoices({ name: "enable", value: "enable" }, { name: "disable", value: "disable" })
            )
        ),
    ].map((c) => c.toJSON());
  } catch (e) {
    console.error("Failed to build slash commands:", e.message);
  }

  if (commands) {
    try {
      await client.application.commands.set(commands);
      console.log("Slash commands registered.");
    } catch (e) {
      console.error("Failed to register slash commands:", e.message);
    }
  }

  await sendSupportPanel();
});

// ─── Interaction handler ──────────────────────────────────────────────────────

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const { customId } = interaction;

    if (TICKET_CATEGORIES[customId]) {
      await handleTicketCreate(interaction, customId);
      return;
    }
    if (customId === "ticket_close") {
      await handleTicketClose(interaction);
      return;
    }
    if (customId.startsWith("giveaway_enter_")) {
      await handleGiveawayEnter(interaction, customId.replace("giveaway_enter_", ""));
      return;
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  await interaction.deferReply({ ephemeral: false });

  // ── /profile ────────────────────────────────────────────────────────────
  if (commandName === "profile") {
    try {
      const selected = interaction.options.getUser("user");
      const user = await users.findOne({ discordid: selected.id });
      if (!user) return interaction.editReply(`No linked PS99Bet account found for **${selected.username}**.`);
      const embed = applyBanner(
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(`${user.username}'s Profile`)
          .setThumbnail(user.thumbnail || null)
          .addFields(
            { name: "Level",   value: String(user.level ?? 0),                                  inline: true },
            { name: "Wagered", value: `R$${(user.wager ?? 0).toLocaleString()}`,                inline: true },
            { name: "Won",     value: `R$${(user.won ?? 0).toLocaleString()}`,                  inline: true },
            { name: "Lost",    value: `R$${(user.lost ?? 0).toLocaleString()}`,                 inline: true },
            { name: "Profit",  value: `R$${((user.won ?? 0) - (user.lost ?? 0)).toLocaleString()}`, inline: true }
          )
          .setFooter({ text: "PS99Bet" })
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong fetching that profile.");
    }

  // ── /balance ────────────────────────────────────────────────────────────
  } else if (commandName === "balance") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("Link your Discord on PS99Bet first.");
      const embed = applyBanner(
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(`${user.username}'s Balance`)
          .setThumbnail(user.thumbnail || null)
          .addFields(
            { name: "💰 Balance",  value: `R$${(user.balance ?? 0).toLocaleString()}`,                 inline: true },
            { name: "📈 Wagered",  value: `R$${(user.wager ?? 0).toLocaleString()}`,                   inline: true },
            { name: "✅ Won",      value: `R$${(user.won ?? 0).toLocaleString()}`,                     inline: true },
            { name: "❌ Lost",     value: `R$${(user.lost ?? 0).toLocaleString()}`,                    inline: true },
            { name: "📊 Profit",   value: `R$${((user.won ?? 0) - (user.lost ?? 0)).toLocaleString()}`, inline: true }
          )
          .setFooter({ text: "PS99Bet" })
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /leaderboard ────────────────────────────────────────────────────────
  } else if (commandName === "leaderboard") {
    try {
      const leaders = await users.find({ wager: { $gt: 0 } }).sort({ wager: -1 }).limit(10);
      if (!leaders.length) return interaction.editReply("No data yet.");
      const medals = ["🥇", "🥈", "🥉"];
      const rows = leaders.map((u, i) =>
        `${medals[i] ?? `**#${i + 1}**`} **${u.username}** — R$${(u.wager ?? 0).toLocaleString()}`
      );
      const embed = applyBanner(
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("🏆 PS99Bet Leaderboard (by Wager)")
          .setDescription(rows.join("\n"))
          .setFooter({ text: "PS99Bet" })
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /profit ─────────────────────────────────────────────────────────────
  } else if (commandName === "profit") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("Link your Discord on PS99Bet first.");
      const profit = (user.won ?? 0) - (user.lost ?? 0);
      const embed = applyBanner(
        new EmbedBuilder()
          .setColor(profit >= 0 ? 0x4ade80 : 0xff6b6b)
          .setTitle(`${user.username}'s Profit`)
          .setDescription(`**R$${profit.toLocaleString()}**`)
          .setFooter({ text: "PS99Bet" })
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /withdraws ──────────────────────────────────────────────────────────
  } else if (commandName === "withdraws") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("Link your Discord on PS99Bet first.");
      const pending = await withdraws.find({ userid: user.userid });
      if (!pending.length) return interaction.editReply("✅ You have no pending withdrawals.");
      const counts = {};
      pending.forEach((w) => { counts[w.itemname] = (counts[w.itemname] || 0) + 1; });
      const rows = Object.entries(counts).map(([item, count]) => `• **${item}** x${count}`).join("\n");
      const embed = applyBanner(
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(`${user.username}'s Pending Withdrawals`)
          .setDescription(rows)
          .addFields({ name: "Total Items", value: String(pending.length), inline: true })
          .setThumbnail(user.thumbnail || null)
          .setFooter({ text: "PS99Bet" })
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /cancelallwithdraws ─────────────────────────────────────────────────
  } else if (commandName === "cancelallwithdraws") {
    try {
      if (!settings.cancelWithdrawsEnabled)
        return interaction.editReply("❌ Cancel withdrawals is currently **disabled** by the site owner.");
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("Link your Discord on PS99Bet first.");
      const pending = await withdraws.find({ userid: user.userid });
      if (!pending.length) return interaction.editReply("You have no pending withdrawals to cancel.");
      await inventorys.insertMany(pending.map((w) => ({ itemid: w.itemid, owner: user.userid, locked: false })));
      await withdraws.deleteMany({ userid: user.userid });
      logger.logEvent({
        type: "🗑️ Withdrawals Cancelled",
        color: 0xff6b6b,
        description: `**${user.username}** cancelled all their pending withdrawals via Discord.`,
        fields: [
          { name: "Items Returned", value: String(pending.length), inline: true },
          { name: "Roblox ID",      value: String(user.userid),    inline: true },
        ],
        thumbnail: user.thumbnail,
      });
      await interaction.editReply(
        `✅ Cancelled **${pending.length}** pending withdrawal${pending.length !== 1 ? "s" : ""} — items returned to your inventory.`
      );
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong.");
    }

  // ── /deposit ────────────────────────────────────────────────────────────
  } else if (commandName === "deposit") {
    try {
      const activeBots = await bots.find({ online: true });
      if (!activeBots.length) {
        const embed = applyBanner(
          new EmbedBuilder()
            .setColor(0xff6b6b)
            .setTitle("🤖 Deposit Bots")
            .setDescription("❌ No active deposit bots online right now. Please check back later.")
            .setFooter({ text: "PS99Bet" })
        );
        return interaction.editReply({ embeds: [embed] });
      }
      const embed = applyBanner(
        new EmbedBuilder()
          .setColor(0x4ade80)
          .setTitle("🤖 Active Deposit Bots")
          .setDescription(
            `**${activeBots.length}** bot${activeBots.length !== 1 ? "s" : ""} currently online.\n` +
            `Click **Join** to open their Roblox profile, then trade them in-game to deposit.`
          )
          .setFooter({ text: "PS99Bet • Trade the bot in-game after joining" })
          .setTimestamp()
      );
      activeBots.forEach((bot, i) => {
        embed.addFields({ name: `${i + 1}. ${bot.name}`, value: `🎮 **${bot.game}** | 🟢 Online`, inline: true });
      });
      const rows = [];
      for (let i = 0; i < activeBots.length; i += 5) {
        const chunk = activeBots.slice(i, i + 5);
        rows.push(
          new ActionRowBuilder().addComponents(
            chunk.map((bot) =>
              new ButtonBuilder()
                .setLabel(`Join ${bot.name}`)
                .setEmoji("🎮")
                .setStyle(ButtonStyle.Link)
                .setURL(bot.link?.startsWith("http") ? bot.link : `https://www.roblox.com/users/${bot.userid}/profile`)
            )
          )
        );
        if (rows.length >= 5) break;
      }
      await interaction.editReply({ embeds: [embed], components: rows });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong fetching deposit bots.");
    }

  // ── /giveaway ───────────────────────────────────────────────────────────
  } else if (commandName === "giveaway") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission to use this command.");

    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      try {
        const prize        = interaction.options.getString("prize");
        const durationMins = interaction.options.getInteger("duration");
        const winnersCount = interaction.options.getInteger("winners") || 1;
        const targetChannel = interaction.options.getChannel("channel") || interaction.channel;

        const giveawayId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const endTime    = Date.now() + durationMins * 60 * 1000;

        const gwEmbed = buildGiveawayEmbed(prize, endTime, winnersCount, 0);

        const enterRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_enter_${giveawayId}`)
            .setLabel("Enter Giveaway")
            .setEmoji("🎉")
            .setStyle(ButtonStyle.Success)
        );

        const gwMessage = await targetChannel.send({ embeds: [gwEmbed], components: [enterRow] });

        const timer = setTimeout(() => endGiveaway(giveawayId), durationMins * 60 * 1000);

        activeGiveaways.set(giveawayId, {
          prize,
          winnersCount,
          endTime,
          entrants: new Set(),
          timer,
          channelId: targetChannel.id,
          messageId: gwMessage.id,
        });

        const confirmEmbed = applyBanner(
          new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle("✅ Giveaway Started")
            .addFields(
              { name: "Prize",    value: prize,                      inline: true },
              { name: "Duration", value: `${durationMins} minutes`,  inline: true },
              { name: "Winners",  value: String(winnersCount),        inline: true },
              { name: "Channel",  value: targetChannel.toString(),    inline: true },
              { name: "ID",       value: `\`${giveawayId}\``,         inline: false }
            )
            .setFooter({ text: "PS99Bet Giveaways" })
        );
        await interaction.editReply({ embeds: [confirmEmbed] });
      } catch (e) {
        console.error(e);
        await interaction.editReply("Something went wrong starting the giveaway.");
      }

    } else if (sub === "end") {
      const id = interaction.options.getString("id");
      if (!activeGiveaways.has(id)) return interaction.editReply("❌ No active giveaway found with that ID.");
      await endGiveaway(id);
      await interaction.editReply("✅ Giveaway ended.");

    } else if (sub === "reroll") {
      try {
        const messageId = interaction.options.getString("messageid");
        const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
        if (!msg) return interaction.editReply("❌ Message not found in this channel.");

        const embed = msg.embeds[0];
        if (!embed) return interaction.editReply("❌ That message has no embed.");

        const winner = `<@${interaction.guild.members.cache.random()?.id || "?"}>`;
        await interaction.channel.send(`🎉 **Reroll!** New winner: ${winner}`);
        await interaction.editReply("✅ Rerolled.");
      } catch (e) {
        console.error(e);
        await interaction.editReply("Something went wrong rerolling.");
      }
    }

  // ── /create ─────────────────────────────────────────────────────────────
  } else if (commandName === "create") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission to use this command.");
    try {
      const name   = interaction.options.getString("name");
      const pfp    = interaction.options.getString("pfp");
      const userid = interaction.options.getInteger("userid");
      const game   = interaction.options.getString("game");
      const link   = interaction.options.getString("link") || "";
      const existing = await bots.findOne({ userid });
      if (existing) return interaction.editReply(`❌ A bot with Roblox ID **${userid}** already exists (**${existing.name}**).`);
      const newBot = await bots.create({ name, pfp, userid, game, link, online: true, showJoin: true, showProfile: true, showId: false });
      logger.logEvent({
        type: "🤖 Bot Created",
        color: 0x4ade80,
        description: `**${interaction.user.username}** created a new bot.`,
        fields: [
          { name: "Name",     value: name,             inline: true },
          { name: "Game",     value: game,             inline: true },
          { name: "Roblox ID",value: String(userid),   inline: true },
          { name: "DB ID",    value: String(newBot._id), inline: false },
        ],
        thumbnail: pfp,
      });
      const embed = applyBanner(
        new EmbedBuilder()
          .setColor(0x4ade80)
          .setTitle("✅ Bot Created")
          .setThumbnail(pfp)
          .addFields(
            { name: "Name",      value: name,               inline: true },
            { name: "Game",      value: game,               inline: true },
            { name: "Roblox ID", value: String(userid),     inline: true },
            { name: "DB ID",     value: String(newBot._id), inline: false }
          )
          .setFooter({ text: "PS99Bet" })
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      await interaction.editReply("Something went wrong creating the bot.");
    }

  // ── /toggle ─────────────────────────────────────────────────────────────
  } else if (commandName === "toggle") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission to use this command.");
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      try {
        const allBots = await bots.find({});
        if (!allBots.length) return interaction.editReply("No bots registered.");
        const rows = allBots.map(
          (b) => `**${b.name}** (\`${b._id}\`) — ${b.online ? "🟢 Online" : "🔴 Offline"} | ${b.game}`
        );
        const embed = applyBanner(
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle("Registered Bots")
            .setDescription(rows.join("\n"))
            .setFooter({ text: "PS99Bet" })
        );
        await interaction.editReply({ embeds: [embed] });
      } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

    } else if (sub === "on" || sub === "off") {
      const online = sub === "on";
      const botId  = interaction.options.getString("botid");
      try {
        if (botId.toLowerCase() === "all") {
          await bots.updateMany({}, { $set: { online } });
          await interaction.editReply(`✅ All bots set to **${online ? "Online 🟢" : "Offline 🔴"}**.`);
        } else {
          const bot = await bots.findByIdAndUpdate(botId, { $set: { online } }, { new: true });
          if (!bot) return interaction.editReply("Bot not found with that ID.");
          await interaction.editReply(`✅ **${bot.name}** is now **${online ? "Online 🟢" : "Offline 🔴"}**.`);
        }
      } catch (e) { console.error(e); await interaction.editReply("Invalid bot ID or something went wrong."); }

    } else if (sub === "delete") {
      const botId = interaction.options.getString("botid");
      try {
        const bot = await bots.findByIdAndDelete(botId);
        if (!bot) return interaction.editReply("Bot not found with that ID.");
        await interaction.editReply(`🗑️ Bot **${bot.name}** deleted.`);
      } catch (e) { console.error(e); await interaction.editReply("Invalid bot ID or something went wrong."); }

    } else if (sub === "cancelwithdraws") {
      const action = interaction.options.getString("action");
      settings.cancelWithdrawsEnabled = action === "enable";
      const state = settings.cancelWithdrawsEnabled ? "✅ Enabled" : "❌ Disabled";
      logger.logEvent({
        type: "⚙️ Setting Changed",
        color: settings.cancelWithdrawsEnabled ? 0x4ade80 : 0xff6b6b,
        description: `**${interaction.user.username}** ${action}d the cancel-withdraws feature.`,
      });
      await interaction.editReply(`Cancel Withdrawals is now **${state}**.`);
    }

  // ── /listalllinked ──────────────────────────────────────────────────────
  } else if (commandName === "listalllinked") {
    if (!OWNER_DISCORD_ID || interaction.user.id !== OWNER_DISCORD_ID)
      return interaction.editReply({ content: "❌ Only the site owner can use this command.", ephemeral: true });
    try {
      const page   = Math.max(1, interaction.options.getInteger("page") || 1);
      const perPage = 15;
      const skip   = (page - 1) * perPage;
      const filter = { discordid: { $exists: true, $nin: [null, ""] } };
      const [linked, total] = await Promise.all([users.find(filter).skip(skip).limit(perPage), users.countDocuments(filter)]);
      if (!linked.length) return interaction.editReply(`No linked accounts found${page > 1 ? ` on page ${page}` : ""}.`);
      const totalPages = Math.ceil(total / perPage);
      const rows = linked.map((u, i) => `**${skip + i + 1}.** ${u.username} ↔ @${u.discordusername || "?"} (\`${u.discordid}\`)`);
      const embed = applyBanner(
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(`🔗 Linked Discord Accounts (${total} total)`)
          .setDescription(rows.join("\n"))
          .setFooter({ text: `Page ${page} / ${totalPages} • PS99Bet` })
      );
      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (e) {
      console.error(e);
      await interaction.editReply({ content: "Something went wrong.", ephemeral: true });
    }

  // ── /locktipping ────────────────────────────────────────────────────────
  } else if (commandName === "locktipping") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission to use this command.");
    const action = interaction.options.getString("action");
    settings.tippingLocked = action === "disable";
    const state = settings.tippingLocked ? "🔒 Locked (disabled)" : "🔓 Unlocked (enabled)";
    logger.logEvent({
      type: "⚙️ Tipping Setting Changed",
      color: settings.tippingLocked ? 0xff6b6b : 0x4ade80,
      description: `**${interaction.user.username}** ${settings.tippingLocked ? "locked" : "unlocked"} tipping site-wide.`,
    });
    await interaction.editReply(`Tipping is now **${state}**. Only Owners/Admins can tip while locked.`);
  }
});

// ─── Ticket handlers ──────────────────────────────────────────────────────────

async function handleTicketCreate(interaction, customId) {
  try {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    if (!guild) return interaction.editReply({ content: "Server only.", ephemeral: true });

    const categoryName = TICKET_CATEGORIES[customId];
    const category     = await getOrCreateCategory(guild, categoryName);

    const safeName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}`;
    const existing = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.parentId === category.id && c.name === safeName
    );
    if (existing) return interaction.editReply({ content: `❌ You already have an open ticket: ${existing.toString()}`, ephemeral: true });

    const ticketChannel = await guild.channels.create({
      name: safeName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: client.user.id,     allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
      ],
    });

    const labelMap = {
      ticket_site_support:    "🌐 Site Support",
      ticket_scams:           "🚨 Scams / Unfair Trades",
      ticket_discord_support: "💬 Discord Support",
      ticket_claim_gw:        "🎉 Claim DC GWs",
    };

    const ticketEmbed = applyBanner(
      new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`${labelMap[customId]} Ticket`)
        .setDescription(
          `Hello ${interaction.user.toString()}! A staff member will be with you shortly.\n\n` +
          `**Category:** ${categoryName}\n\nPlease describe your issue in detail below.`
        )
        .setFooter({ text: "PS99Bet Support • Staff will close this ticket when resolved" })
        .setTimestamp()
    );

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: interaction.user.toString(), embeds: [ticketEmbed], components: [closeRow] });
    await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel.toString()}`, ephemeral: true });
  } catch (e) {
    console.error("Ticket creation error:", e.message);
    try { await interaction.editReply({ content: "Something went wrong. Please try again.", ephemeral: true }); } catch {}
  }
}

async function handleTicketClose(interaction) {
  if (
    !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) &&
    interaction.user.id !== OWNER_DISCORD_ID
  ) {
    return interaction.reply({ content: "❌ Only staff can close tickets.", ephemeral: true });
  }
  try {
    await interaction.reply({ content: "🔒 Closing ticket in 5 seconds...", ephemeral: false });
    setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000);
  } catch (e) {
    console.error("Ticket close error:", e.message);
  }
}

async function handleGiveawayEnter(interaction, giveawayId) {
  const gw = activeGiveaways.get(giveawayId);
  if (!gw) return interaction.reply({ content: "❌ This giveaway has already ended.", ephemeral: true });

  if (gw.entrants.has(interaction.user.id)) {
    return interaction.reply({ content: "✅ You're already entered in this giveaway!", ephemeral: true });
  }

  gw.entrants.add(interaction.user.id);

  try {
    const message = await interaction.channel.messages.fetch(gw.messageId);
    const updatedEmbed = buildGiveawayEmbed(gw.prize, gw.endTime, gw.winnersCount, gw.entrants.size);
    await message.edit({ embeds: [updatedEmbed] });
  } catch {}

  await interaction.reply({ content: `🎉 You've entered the giveaway for **${gw.prize}**! Good luck!`, ephemeral: true });
}

// ─── Login ────────────────────────────────────────────────────────────────────

if (BOT_TOKEN) {
  console.log("Bot: attempting Discord login...");
  const loginTimeout = setTimeout(() => {
    console.error("Bot login timed out after 30s — check DISCORD_BOT_TOKEN or HARD_CODED_BOT_TOKEN.");
  }, 30000);
  client.once("ready", () => clearTimeout(loginTimeout));
  client.login(BOT_TOKEN).catch((err) => {
    clearTimeout(loginTimeout);
    console.error("Bot login failed:", err.message);
  });
} else {
  console.warn("No bot token set — set DISCORD_BOT_TOKEN env var or paste into HARD_CODED_BOT_TOKEN at top of bot.js.");
}
