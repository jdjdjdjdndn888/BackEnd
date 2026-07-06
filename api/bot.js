// ═══════════════════════════════════════════════════════════════════════
//  HARD-CODED CONFIG — paste values here (no other files needed)
// ═══════════════════════════════════════════════════════════════════════
const HARD_CODED_BOT_TOKEN = ""; // ← paste Discord bot token here
const HARD_CODED_MONGO_URI = ""; // ← do NOT hardcode credentials here; use the MONGODB_URI secret instead
const HARD_CODED_OWNER_ID  = "1367076055416045668"; // ← owner Discord user ID
const SITE_URL             = "https://ps99bet.vercel.app"; // ← your Vercel frontend URL e.g. https://ps99bet.vercel.app
// Banner 1 is at /banner/1.png on your frontend. Set SITE_URL above or paste full image URL:
const BANNER_URL = process.env.BANNER_URL || (SITE_URL ? `${SITE_URL}/banner/1.png` : "");
// ═══════════════════════════════════════════════════════════════════════

const BOT_TOKEN        = HARD_CODED_BOT_TOKEN  || process.env.DISCORD_BOT_TOKEN  || "";
const MONGO_URI        = HARD_CODED_MONGO_URI   || process.env.MONGODB_URI        || "";
const OWNER_DISCORD_ID = HARD_CODED_OWNER_ID    || process.env.OWNER_DISCORD_ID   || "";
const DB_NAME          = "petflippy";

// ─── MongoDB connection ───────────────────────────────────────────────────────
const mongoose = require("mongoose");
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI, { dbName: DB_NAME })
    .then(() => console.log("[bot] MongoDB connected"))
    .catch((err) => console.error("[bot] MongoDB failed:", err.message));
} else {
  console.warn("[bot] No MongoDB URI set — DB commands will fail");
}

// ─── Mongoose models (inlined) ────────────────────────────────────────────────
const { Schema } = mongoose;

const users = mongoose.model("users", new Schema({
  userid:          Number,
  username:        String,
  discordid:       String,
  discordusername: String,
  thumbnail:       String,
  balance:         { type: Number, default: 0 },
  wager:           { type: Number, default: 0 },
  won:             { type: Number, default: 0 },
  lost:            { type: Number, default: 0 },
  level:           { type: Number, default: 0 },
}));

const bots = mongoose.model("bots", new Schema({
  name:        { type: String, required: true },
  pfp:         { type: String, required: true },
  userid:      { type: Number, required: true },
  link:        { type: String, default: "" },
  game:        { type: String, required: true },
  online:      { type: Boolean, default: true },
  showJoin:    { type: Boolean, default: true },
  showProfile: { type: Boolean, default: true },
  showId:      { type: Boolean, default: false },
}));

const withdraws = mongoose.model("withdraws", new Schema({
  userid:   Number,
  itemid:   String,
  itemname: String,
}));

const inventorys = mongoose.model("inventorys", new Schema({
  itemid: String,
  owner:  Number,
  locked: { type: Boolean, default: false },
}));

// ─── Settings (in-memory) ─────────────────────────────────────────────────────
const settings = { cancelWithdrawsEnabled: true, tippingLocked: false };

// ─── Log Channel IDs ─────────────────────────────────────────────────────────
const LOG_CHANNELS = {
  logs:       "1515602211319713853", // bot logs / general logs
  coinflip:   "1523289034632200192",
  dice:       "1523288922367590460",
  jackpot:    "1523289179876884612",
  giveaway:   "1522616966521688196",
  taxedItems: "1523482408467300513",
  tips:       "1523358826793926806",
};

// ─── Logger (inlined) ─────────────────────────────────────────────────────────
const _channels = {};
const logger = {
  init(client) {
    for (const [name, id] of Object.entries(LOG_CHANNELS)) {
      client.channels.fetch(id)
        .then((ch) => { _channels[name] = ch; console.log(`Log channel [${name}] ready: #${ch.name}`); })
        .catch(() => console.warn(`Could not fetch log channel [${name}]:`, id));
    }
  },
  async logEvent({ type, color, description, fields = [], thumbnail = null, channel = "logs" }) {
    const ch = _channels[channel] || _channels["logs"];
    if (!ch) return;
    try {
      const e = new EmbedBuilder()
        .setColor(color || 0x8b5cf6)
        .setTitle(type)
        .setDescription(description || "")
        .setTimestamp()
        .setFooter({ text: "PS99Bet Logs" });
      if (thumbnail) e.setThumbnail(thumbnail);
      if (fields.length) e.addFields(fields);
      await ch.send({ embeds: [e] });
    } catch (err) {
      console.error("[Logger] Failed:", err.message);
    }
  },
  // Convenience: send to a specific named channel
  async logTo(channelName, { type, color, description, fields = [], thumbnail = null }) {
    return this.logEvent({ type, color, description, fields, thumbnail, channel: channelName });
  },
};

// ─── Discord.js ───────────────────────────────────────────────────────────────
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

const SUPPORT_PANEL_CHANNEL_ID = "1521084432688222208";

const TICKET_CATEGORIES = {
  ticket_site_support:    "🎫 Site Support",
  ticket_scams:           "🚨 Scams & Unfair Trades",
  ticket_discord_support: "💬 Discord Support",
  ticket_claim_gw:        "🎉 Claim DC GWs",
};

const activeGiveaways = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
});

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
    for (const [, msg] of messages.filter((m) => m.author.id === client.user.id))
      await msg.delete().catch(() => {});

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
    console.log("Support panel sent.");
  } catch (e) {
    console.error("Failed to send support panel:", e.message);
  }
}

// ─── Giveaway helpers ─────────────────────────────────────────────────────────

function buildGiveawayEmbed(prize, endTime, winnersCount, entrantsCount, ended = false, winners = []) {
  const embed = new EmbedBuilder()
    .setColor(ended ? 0x888888 : 0xf59e0b)
    .setTitle(ended ? `🎉 Giveaway Ended — ${prize}` : `🎉 Giveaway — ${prize}`)
    .setDescription(
      ended
        ? (winners.length
            ? `**Winner${winners.length > 1 ? "s" : ""}:** ${winners.map((id) => `<@${id}>`).join(", ")}`
            : "No one entered the giveaway.")
        : `Click **Enter** to participate!\n\n**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n**Entries:** ${entrantsCount}`
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

  const pool = [...gw.entrants];
  const winners = [];
  const count = Math.min(gw.winnersCount, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }

  try {
    const channel = await client.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(gw.messageId);
    await message.edit({ embeds: [buildGiveawayEmbed(gw.prize, gw.endTime, gw.winnersCount, gw.entrants.size, true, winners)], components: [] });
    await channel.send(
      winners.length
        ? `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(", ")}! You won **${gw.prize}**!`
        : "No valid entrants — giveaway ended with no winner."
    );
  } catch (e) {
    console.error("Failed to end giveaway:", e.message);
  }
}

// ─── Ready ────────────────────────────────────────────────────────────────────

client.once("clientReady", async () => {
  console.log(`PS99Bet bot online as ${client.user.tag}`);

  try {
    client.user.setPresence({ activities: [{ name: "PS99Bet", type: ActivityType.Playing }], status: "online" });
  } catch (e) {
    console.error("Failed to set presence:", e.message);
  }

  logger.init(client);

  let commands;
  try {
    commands = [
      new SlashCommandBuilder()
        .setName("profile").setDescription("Check the site profile of a Discord user")
        .addUserOption((o) => o.setName("user").setDescription("Select a user").setRequired(true)),

      new SlashCommandBuilder().setName("balance").setDescription("Check your PS99Bet balance and stats"),
      new SlashCommandBuilder().setName("leaderboard").setDescription("View the top 10 wagerers on PS99Bet"),
      new SlashCommandBuilder().setName("profit").setDescription("Check your profit on PS99Bet"),
      new SlashCommandBuilder().setName("withdraws").setDescription("See your pending withdrawals on PS99Bet"),
      new SlashCommandBuilder().setName("cancelallwithdraws").setDescription("Cancel all your pending withdrawals on PS99Bet"),
      new SlashCommandBuilder().setName("deposit").setDescription("View active deposit bots and join their games"),

      new SlashCommandBuilder()
        .setName("giveaway").setDescription("Owner only — manage giveaways")
        .addSubcommand((s) => s.setName("start").setDescription("Start a new giveaway")
          .addStringOption((o) => o.setName("prize").setDescription("What are you giving away?").setRequired(true))
          .addIntegerOption((o) => o.setName("duration").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(10080))
          .addIntegerOption((o) => o.setName("winners").setDescription("Number of winners (default 1)").setMinValue(1).setMaxValue(20))
          .addChannelOption((o) => o.setName("channel").setDescription("Channel to post in (defaults to current)")))
        .addSubcommand((s) => s.setName("end").setDescription("Force-end an active giveaway")
          .addStringOption((o) => o.setName("id").setDescription("Giveaway ID from the confirm embed").setRequired(true)))
        .addSubcommand((s) => s.setName("reroll").setDescription("Reroll a winner for an ended giveaway")
          .addStringOption((o) => o.setName("messageid").setDescription("Message ID of the ended giveaway").setRequired(true))),

      new SlashCommandBuilder()
        .setName("listalllinked").setDescription("Owner only — list all users with linked Discord accounts")
        .addIntegerOption((o) => o.setName("page").setDescription("Page number (default 1)")),

      new SlashCommandBuilder()
        .setName("locktipping").setDescription("Owner only — enable or disable tipping")
        .addStringOption((o) => o.setName("action").setDescription("enable or disable").setRequired(true)
          .addChoices({ name: "enable", value: "enable" }, { name: "disable", value: "disable" })),

      new SlashCommandBuilder()
        .setName("create").setDescription("Owner only — create a new deposit/withdraw bot")
        .addStringOption((o) => o.setName("name").setDescription("Bot Roblox username").setRequired(true))
        .addStringOption((o) => o.setName("pfp").setDescription("Bot avatar URL").setRequired(true))
        .addIntegerOption((o) => o.setName("userid").setDescription("Bot Roblox user ID").setRequired(true))
        .addStringOption((o) => o.setName("game").setDescription("Game e.g. PS99").setRequired(true))
        .addStringOption((o) => o.setName("link").setDescription("Roblox profile link (optional)")),

      new SlashCommandBuilder()
        .setName("toggle").setDescription("Owner only — manage bots and settings")
        .addSubcommand((s) => s.setName("on").setDescription("Enable a bot")
          .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID or 'all'").setRequired(true)))
        .addSubcommand((s) => s.setName("off").setDescription("Disable a bot")
          .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID or 'all'").setRequired(true)))
        .addSubcommand((s) => s.setName("list").setDescription("List all registered bots"))
        .addSubcommand((s) => s.setName("delete").setDescription("Delete a bot entry")
          .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID").setRequired(true)))
        .addSubcommand((s) => s.setName("cancelwithdraws").setDescription("Enable or disable cancel-withdraws site-wide")
          .addStringOption((o) => o.setName("action").setDescription("enable or disable").setRequired(true)
            .addChoices({ name: "enable", value: "enable" }, { name: "disable", value: "disable" }))),
    ].map((c) => c.toJSON());
  } catch (e) {
    console.error("Failed to build commands:", e.message);
  }

  if (commands) {
    try {
      await client.application.commands.set(commands);
      console.log("Slash commands registered.");
    } catch (e) {
      console.error("Failed to register commands:", e.message);
    }
  }

  await sendSupportPanel();
});

// ─── Interactions ─────────────────────────────────────────────────────────────

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const { customId } = interaction;
    if (TICKET_CATEGORIES[customId])        return handleTicketCreate(interaction, customId);
    if (customId === "ticket_close")        return handleTicketClose(interaction);
    if (customId.startsWith("giveaway_enter_")) return handleGiveawayEnter(interaction, customId.replace("giveaway_enter_", ""));
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  await interaction.deferReply({ ephemeral: false });

  // /profile
  if (commandName === "profile") {
    try {
      const selected = interaction.options.getUser("user");
      const user = await users.findOne({ discordid: selected.id });
      if (!user) return interaction.editReply(`No linked PS99Bet account found for **${selected.username}**.`);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`${user.username}'s Profile`).setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "Level",   value: String(user.level ?? 0), inline: true },
          { name: "Wagered", value: `R$${(user.wager ?? 0).toLocaleString()}`, inline: true },
          { name: "Won",     value: `R$${(user.won ?? 0).toLocaleString()}`, inline: true },
          { name: "Lost",    value: `R$${(user.lost ?? 0).toLocaleString()}`, inline: true },
          { name: "Profit",  value: `R$${((user.won ?? 0) - (user.lost ?? 0)).toLocaleString()}`, inline: true }
        ).setFooter({ text: "PS99Bet" }))] });
    } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

  // /balance
  } else if (commandName === "balance") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("Link your Discord on PS99Bet first.");
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`${user.username}'s Balance`).setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "💰 Balance", value: `R$${(user.balance ?? 0).toLocaleString()}`, inline: true },
          { name: "📈 Wagered", value: `R$${(user.wager ?? 0).toLocaleString()}`, inline: true },
          { name: "✅ Won",     value: `R$${(user.won ?? 0).toLocaleString()}`, inline: true },
          { name: "❌ Lost",    value: `R$${(user.lost ?? 0).toLocaleString()}`, inline: true },
          { name: "📊 Profit",  value: `R$${((user.won ?? 0) - (user.lost ?? 0)).toLocaleString()}`, inline: true }
        ).setFooter({ text: "PS99Bet" }))] });
    } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

  // /leaderboard
  } else if (commandName === "leaderboard") {
    try {
      const leaders = await users.find({ wager: { $gt: 0 } }).sort({ wager: -1 }).limit(10);
      if (!leaders.length) return interaction.editReply("No data yet.");
      const medals = ["🥇", "🥈", "🥉"];
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle("🏆 PS99Bet Leaderboard (by Wager)")
        .setDescription(leaders.map((u, i) => `${medals[i] ?? `**#${i + 1}**`} **${u.username}** — R$${(u.wager ?? 0).toLocaleString()}`).join("\n"))
        .setFooter({ text: "PS99Bet" }))] });
    } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

  // /profit
  } else if (commandName === "profit") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("Link your Discord on PS99Bet first.");
      const profit = (user.won ?? 0) - (user.lost ?? 0);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(profit >= 0 ? 0x4ade80 : 0xff6b6b).setTitle(`${user.username}'s Profit`)
        .setDescription(`**R$${profit.toLocaleString()}**`).setFooter({ text: "PS99Bet" }))] });
    } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

  // /withdraws
  } else if (commandName === "withdraws") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("Link your Discord on PS99Bet first.");
      const pending = await withdraws.find({ userid: user.userid });
      if (!pending.length) return interaction.editReply("✅ You have no pending withdrawals.");
      const counts = {};
      pending.forEach((w) => { counts[w.itemname] = (counts[w.itemname] || 0) + 1; });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`${user.username}'s Pending Withdrawals`)
        .setDescription(Object.entries(counts).map(([item, c]) => `• **${item}** x${c}`).join("\n"))
        .addFields({ name: "Total Items", value: String(pending.length), inline: true })
        .setThumbnail(user.thumbnail || null).setFooter({ text: "PS99Bet" }))] });
    } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

  // /cancelallwithdraws
  } else if (commandName === "cancelallwithdraws") {
    try {
      if (!settings.cancelWithdrawsEnabled) return interaction.editReply("❌ Cancel withdrawals is currently **disabled**.");
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("Link your Discord on PS99Bet first.");
      const pending = await withdraws.find({ userid: user.userid });
      if (!pending.length) return interaction.editReply("You have no pending withdrawals to cancel.");
      await inventorys.insertMany(pending.map((w) => ({ itemid: w.itemid, owner: user.userid, locked: false })));
      await withdraws.deleteMany({ userid: user.userid });
      logger.logEvent({ type: "🗑️ Withdrawals Cancelled", color: 0xff6b6b,
        description: `**${user.username}** cancelled all pending withdrawals via Discord.`,
        fields: [{ name: "Items Returned", value: String(pending.length), inline: true }, { name: "Roblox ID", value: String(user.userid), inline: true }],
        thumbnail: user.thumbnail });
      await interaction.editReply(`✅ Cancelled **${pending.length}** withdrawal${pending.length !== 1 ? "s" : ""} — items returned to inventory.`);
    } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

  // /deposit
  } else if (commandName === "deposit") {
    try {
      const activeBots = await bots.find({ online: true });
      if (!activeBots.length) {
        return interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
          .setColor(0xff6b6b).setTitle("🤖 Deposit Bots")
          .setDescription("❌ No active deposit bots online right now. Check back later.")
          .setFooter({ text: "PS99Bet" }))] });
      }
      const embed = applyBanner(new EmbedBuilder()
        .setColor(0x4ade80).setTitle("🤖 Active Deposit Bots")
        .setDescription(`**${activeBots.length}** bot${activeBots.length !== 1 ? "s" : ""} online.\nClick **Join** to open their Roblox profile, then trade in-game to deposit.`)
        .setFooter({ text: "PS99Bet • Trade the bot in-game after joining" }).setTimestamp());
      activeBots.forEach((b, i) => embed.addFields({ name: `${i + 1}. ${b.name}`, value: `🎮 **${b.game}** | 🟢 Online`, inline: true }));
      const rows = [];
      for (let i = 0; i < activeBots.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(
          activeBots.slice(i, i + 5).map((b) =>
            new ButtonBuilder().setLabel(`Join ${b.name}`).setEmoji("🎮").setStyle(ButtonStyle.Link)
              .setURL(b.link?.startsWith("http") ? b.link : `https://www.roblox.com/users/${b.userid}/profile`)
          )
        ));
        if (rows.length >= 5) break;
      }
      await interaction.editReply({ embeds: [embed], components: rows });
    } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

  // /giveaway
  } else if (commandName === "giveaway") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      try {
        const prize        = interaction.options.getString("prize");
        const durationMins = interaction.options.getInteger("duration");
        const winnersCount = interaction.options.getInteger("winners") || 1;
        const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
        const giveawayId   = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const endTime      = Date.now() + durationMins * 60 * 1000;

        const enterRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`giveaway_enter_${giveawayId}`).setLabel("Enter Giveaway").setEmoji("🎉").setStyle(ButtonStyle.Success)
        );
        const gwMessage = await targetChannel.send({ embeds: [buildGiveawayEmbed(prize, endTime, winnersCount, 0)], components: [enterRow] });
        const timer = setTimeout(() => endGiveaway(giveawayId), durationMins * 60 * 1000);
        activeGiveaways.set(giveawayId, { prize, winnersCount, endTime, entrants: new Set(), timer, channelId: targetChannel.id, messageId: gwMessage.id });

        await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
          .setColor(0xf59e0b).setTitle("✅ Giveaway Started")
          .addFields(
            { name: "Prize",    value: prize,                     inline: true },
            { name: "Duration", value: `${durationMins} minutes`, inline: true },
            { name: "Winners",  value: String(winnersCount),       inline: true },
            { name: "Channel",  value: targetChannel.toString(),   inline: true },
            { name: "ID",       value: `\`${giveawayId}\``,        inline: false }
          ).setFooter({ text: "PS99Bet Giveaways" }))] });
      } catch (e) { console.error(e); await interaction.editReply("Something went wrong starting the giveaway."); }

    } else if (sub === "end") {
      const id = interaction.options.getString("id");
      if (!activeGiveaways.has(id)) return interaction.editReply("❌ No active giveaway with that ID.");
      await endGiveaway(id);
      await interaction.editReply("✅ Giveaway ended.");

    } else if (sub === "reroll") {
      try {
        const msg = await interaction.channel.messages.fetch(interaction.options.getString("messageid")).catch(() => null);
        if (!msg) return interaction.editReply("❌ Message not found.");
        const winner = interaction.guild.members.cache.random();
        await interaction.channel.send(`🎉 **Reroll!** New winner: ${winner ? `<@${winner.id}>` : "unknown"}`);
        await interaction.editReply("✅ Rerolled.");
      } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }
    }

  // /create
  } else if (commandName === "create") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const name = interaction.options.getString("name"), pfp = interaction.options.getString("pfp");
      const userid = interaction.options.getInteger("userid"), game = interaction.options.getString("game");
      const link = interaction.options.getString("link") || "";
      if (await bots.findOne({ userid })) return interaction.editReply(`❌ Bot with Roblox ID **${userid}** already exists.`);
      const newBot = await bots.create({ name, pfp, userid, game, link, online: true, showJoin: true, showProfile: true, showId: false });
      logger.logEvent({ type: "🤖 Bot Created", color: 0x4ade80,
        description: `**${interaction.user.username}** created a new bot.`,
        fields: [{ name: "Name", value: name, inline: true }, { name: "Game", value: game, inline: true },
                 { name: "Roblox ID", value: String(userid), inline: true }, { name: "DB ID", value: String(newBot._id), inline: false }],
        thumbnail: pfp });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x4ade80).setTitle("✅ Bot Created").setThumbnail(pfp)
        .addFields({ name: "Name", value: name, inline: true }, { name: "Game", value: game, inline: true },
                   { name: "Roblox ID", value: String(userid), inline: true }, { name: "DB ID", value: String(newBot._id), inline: false })
        .setFooter({ text: "PS99Bet" }))] });
    } catch (e) { console.error(e); await interaction.editReply("Something went wrong creating the bot."); }

  // /toggle
  } else if (commandName === "toggle") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      try {
        const all = await bots.find({});
        if (!all.length) return interaction.editReply("No bots registered.");
        await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
          .setColor(0x8b5cf6).setTitle("Registered Bots")
          .setDescription(all.map((b) => `**${b.name}** (\`${b._id}\`) — ${b.online ? "🟢 Online" : "🔴 Offline"} | ${b.game}`).join("\n"))
          .setFooter({ text: "PS99Bet" }))] });
      } catch (e) { console.error(e); await interaction.editReply("Something went wrong."); }

    } else if (sub === "on" || sub === "off") {
      const online = sub === "on", botId = interaction.options.getString("botid");
      try {
        if (botId.toLowerCase() === "all") {
          await bots.updateMany({}, { $set: { online } });
          await interaction.editReply(`✅ All bots set to **${online ? "Online 🟢" : "Offline 🔴"}**.`);
        } else {
          const bot = await bots.findByIdAndUpdate(botId, { $set: { online } }, { new: true });
          if (!bot) return interaction.editReply("Bot not found.");
          await interaction.editReply(`✅ **${bot.name}** is now **${online ? "Online 🟢" : "Offline 🔴"}**.`);
        }
      } catch (e) { console.error(e); await interaction.editReply("Invalid bot ID or something went wrong."); }

    } else if (sub === "delete") {
      try {
        const bot = await bots.findByIdAndDelete(interaction.options.getString("botid"));
        if (!bot) return interaction.editReply("Bot not found.");
        await interaction.editReply(`🗑️ Bot **${bot.name}** deleted.`);
      } catch (e) { console.error(e); await interaction.editReply("Invalid bot ID or something went wrong."); }

    } else if (sub === "cancelwithdraws") {
      const action = interaction.options.getString("action");
      settings.cancelWithdrawsEnabled = action === "enable";
      logger.logEvent({ type: "⚙️ Setting Changed", color: settings.cancelWithdrawsEnabled ? 0x4ade80 : 0xff6b6b,
        description: `**${interaction.user.username}** ${action}d cancel-withdraws.` });
      await interaction.editReply(`Cancel Withdrawals is now **${settings.cancelWithdrawsEnabled ? "✅ Enabled" : "❌ Disabled"}**.`);
    }

  // /listalllinked
  } else if (commandName === "listalllinked") {
    if (!OWNER_DISCORD_ID || interaction.user.id !== OWNER_DISCORD_ID)
      return interaction.editReply({ content: "❌ Owner only.", ephemeral: true });
    try {
      const page = Math.max(1, interaction.options.getInteger("page") || 1), perPage = 15;
      const filter = { discordid: { $exists: true, $nin: [null, ""] } };
      const [linked, total] = await Promise.all([users.find(filter).skip((page - 1) * perPage).limit(perPage), users.countDocuments(filter)]);
      if (!linked.length) return interaction.editReply(`No linked accounts found${page > 1 ? ` on page ${page}` : ""}.`);
      const totalPages = Math.ceil(total / perPage);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`🔗 Linked Discord Accounts (${total} total)`)
        .setDescription(linked.map((u, i) => `**${(page - 1) * perPage + i + 1}.** ${u.username} ↔ @${u.discordusername || "?"} (\`${u.discordid}\`)`).join("\n"))
        .setFooter({ text: `Page ${page} / ${totalPages} • PS99Bet` }))], ephemeral: true });
    } catch (e) { console.error(e); await interaction.editReply({ content: "Something went wrong.", ephemeral: true }); }

  // /locktipping
  } else if (commandName === "locktipping") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const action = interaction.options.getString("action");
    settings.tippingLocked = action === "disable";
    logger.logEvent({ type: "⚙️ Tipping Changed", color: settings.tippingLocked ? 0xff6b6b : 0x4ade80,
      description: `**${interaction.user.username}** ${settings.tippingLocked ? "locked" : "unlocked"} tipping.` });
    await interaction.editReply(`Tipping is now **${settings.tippingLocked ? "🔒 Locked" : "🔓 Unlocked"}**.`);
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
    const safeName     = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}`;

    const existing = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.parentId === category.id && c.name === safeName
    );
    if (existing) return interaction.editReply({ content: `❌ You already have an open ticket: ${existing.toString()}`, ephemeral: true });

    const ticketChannel = await guild.channels.create({
      name: safeName, type: ChannelType.GuildText, parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: client.user.id,       allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
      ],
    });

    const labelMap = {
      ticket_site_support: "🌐 Site Support", ticket_scams: "🚨 Scams / Unfair Trades",
      ticket_discord_support: "💬 Discord Support", ticket_claim_gw: "🎉 Claim DC GWs",
    };

    await ticketChannel.send({
      content: interaction.user.toString(),
      embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`${labelMap[customId]} Ticket`)
        .setDescription(`Hello ${interaction.user.toString()}! A staff member will be with you shortly.\n\n**Category:** ${categoryName}\n\nPlease describe your issue below.`)
        .setFooter({ text: "PS99Bet Support" }).setTimestamp())],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger)
      )],
    });

    await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel.toString()}`, ephemeral: true });
  } catch (e) {
    console.error("Ticket creation error:", e.message);
    try { await interaction.editReply({ content: "Something went wrong. Please try again.", ephemeral: true }); } catch {}
  }
}

async function handleTicketClose(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) && interaction.user.id !== OWNER_DISCORD_ID)
    return interaction.reply({ content: "❌ Only staff can close tickets.", ephemeral: true });
  try {
    await interaction.reply({ content: "🔒 Closing ticket in 5 seconds..." });
    setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000);
  } catch (e) { console.error("Ticket close error:", e.message); }
}

async function handleGiveawayEnter(interaction, giveawayId) {
  const gw = activeGiveaways.get(giveawayId);
  if (!gw) return interaction.reply({ content: "❌ This giveaway has already ended.", ephemeral: true });
  if (gw.entrants.has(interaction.user.id)) return interaction.reply({ content: "✅ You're already entered!", ephemeral: true });
  gw.entrants.add(interaction.user.id);
  try {
    const message = await interaction.channel.messages.fetch(gw.messageId);
    await message.edit({ embeds: [buildGiveawayEmbed(gw.prize, gw.endTime, gw.winnersCount, gw.entrants.size)] });
  } catch {}
  await interaction.reply({ content: `🎉 You've entered the giveaway for **${gw.prize}**! Good luck!`, ephemeral: true });
}

// ─── Login ────────────────────────────────────────────────────────────────────

if (BOT_TOKEN) {
  console.log("Bot: attempting login...");
  const loginTimeout = setTimeout(() => {
    console.error("Bot login timed out after 30s — check your token.");
  }, 30000);
  client.once("ready", () => clearTimeout(loginTimeout));
  client.login(BOT_TOKEN).catch((err) => {
    clearTimeout(loginTimeout);
    console.error("Bot login failed:", err.message);
  });
} else {
  console.warn("No bot token set — paste it into HARD_CODED_BOT_TOKEN at the top of bot.js");
}
