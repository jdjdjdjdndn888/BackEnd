// ═══════════════════════════════════════════════════════════════════════
//  HARD-CODED CONFIG — paste values here (no other files needed)
// ═══════════════════════════════════════════════════════════════════════
const HARD_CODED_BOT_TOKEN = ""; // ← paste Discord bot token here
const HARD_CODED_MONGO_URI = ""; // ← paste MongoDB URI here
const HARD_CODED_OWNER_ID  = "1367076055416045668";
const SITE_URL             = "https://gemtide.win";
const BANNER_URL = process.env.BANNER_URL || (SITE_URL ? `${SITE_URL}/banner/1.png` : "");
// ═══════════════════════════════════════════════════════════════════════

const BOT_TOKEN        = HARD_CODED_BOT_TOKEN  || process.env.DISCORD_BOT_TOKEN  || "";
const MONGO_URI        = HARD_CODED_MONGO_URI   || process.env.MONGODB_URI        || "";
const OWNER_DISCORD_ID = HARD_CODED_OWNER_ID    || process.env.OWNER_DISCORD_ID   || "";
const DB_NAME          = "petflippy";
const BOT_START_TIME   = Date.now();

// ─── MongoDB ─────────────────────────────────────────────────────────────────
const mongoose = require("mongoose");
if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { dbName: DB_NAME })
    .then(() => console.log("[bot] MongoDB connected"))
    .catch((err) => console.error("[bot] MongoDB failed:", err.message));
} else {
  console.warn("[bot] No MongoDB URI set — DB commands will fail");
}

// ─── Models ───────────────────────────────────────────────────────────────────
const { Schema } = mongoose;

const users = mongoose.model("users", new Schema({
  userid: Number, username: String, discordid: String, discordusername: String,
  thumbnail: String, balance: { type: Number, default: 0 }, wager: { type: Number, default: 0 },
  won: { type: Number, default: 0 }, lost: { type: Number, default: 0 },
  level: { type: Number, default: 0 }, banned: { type: Boolean, default: false },
}));

const items = mongoose.model("items", new Schema({
  itemid: Number, itemname: String, itemvalue: Number, itemimage: String, game: String,
}));

const bots = mongoose.model("bots", new Schema({
  name: { type: String, required: true }, pfp: { type: String, required: true },
  userid: { type: Number, required: true }, link: { type: String, default: "" },
  game: { type: String, required: true }, online: { type: Boolean, default: true },
  showJoin: { type: Boolean, default: true }, showProfile: { type: Boolean, default: true },
  showId: { type: Boolean, default: false },
}));

const withdraws = mongoose.model("withdraws", new Schema({
  userid: Number, itemid: String, itemname: String,
}));

const inventorys = mongoose.model("inventorys", new Schema({
  itemid: String, owner: Number, locked: { type: Boolean, default: false },
}));

const history = mongoose.model("history", new Schema({
  userid: { type: Number, required: true }, type: { type: String, required: true },
  amount: { type: String, required: true }, date: { type: Date, required: true },
}));

const Coinflips = mongoose.model("Coinflips", new Schema({
  creatorid: Number, game: String, active: Boolean, crazyMode: Boolean,
  PlayerOne: { id: Number, username: String, value: Number, coin: String },
  PlayerTwo: { id: Number, username: String, value: Number, coin: String },
  winner: Number, start: Date, end: Date,
}, { strict: false }));

const Jackpot = mongoose.model("Jackpot", new Schema({
  value: Number, winnerusername: String, winnerid: Number,
  state: String, game: String, inactive: Boolean, endsAt: Date,
}, { strict: false }));

// ─── In-memory state ─────────────────────────────────────────────────────────
const settings       = { cancelWithdrawsEnabled: true, tippingLocked: false };
const warnings       = new Map();
const activeGiveaways = new Map();

// ─── Log channels ─────────────────────────────────────────────────────────────
const LOG_CHANNELS = {
  logs: "1515602211319713853", coinflip: "1523289034632200192",
  dice: "1523288922367590460", jackpot: "1523289179876884612",
  giveaway: "1522616966521688196", taxedItems: "1523482408467300513",
  tips: "1523358826793926806",
};

// ─── Logger ───────────────────────────────────────────────────────────────────
const _channels = {};
const logger = {
  init(client) {
    for (const [name, id] of Object.entries(LOG_CHANNELS)) {
      client.channels.fetch(id)
        .then((ch) => { _channels[name] = ch; console.log(`Log channel [${name}] ready`); })
        .catch(() => console.warn(`Could not fetch log channel [${name}]:`, id));
    }
  },
  async logEvent({ type, color, description, fields = [], thumbnail = null, channel = "logs" }) {
    const ch = _channels[channel] || _channels["logs"];
    if (!ch) return;
    try {
      const e = new EmbedBuilder().setColor(color || 0x8b5cf6).setTitle(type)
        .setDescription(description || "").setTimestamp().setFooter({ text: "GemTide Logs" });
      if (thumbnail) e.setThumbnail(thumbnail);
      if (fields.length) e.addFields(fields);
      await ch.send({ embeds: [e] });
    } catch (err) { console.error("[Logger] Failed:", err.message); }
  },
  async logTo(channelName, opts) { return this.logEvent({ ...opts, channel: channelName }); },
};

// ─── Discord.js ───────────────────────────────────────────────────────────────
const {
  Client, GatewayIntentBits, SlashCommandBuilder, ActivityType,
  EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ChannelType,
} = require("discord.js");

const SUPPORT_PANEL_CHANNEL_ID = "1521084432688222208";
const TICKET_CATEGORIES = {
  ticket_site_support: "Site Support", ticket_scams: "Scams & Unfair Trades",
  ticket_discord_support: "Discord Support", ticket_claim_gw: "Claim DC GWs",
};
const TICKET_BANNER_URL = process.env.TICKET_BANNER_URL || (SITE_URL ? `${SITE_URL}/ticket-banner.png` : "");
const TICKET_EMOJI_FILES = {
  ticket: `${SITE_URL}/ticket-icon.png`,
  siteSupport: `${SITE_URL}/ticket-icons/site-support.png`,
  scamReport: `${SITE_URL}/ticket-icons/scam-report.png`,
  discordSupport: `${SITE_URL}/ticket-icons/discord-support.png`,
  claimGiveaway: `${SITE_URL}/ticket-icons/claim-giveaway.png`,
  ticketClosed: `${SITE_URL}/ticket-icons/ticket-closed.png`,
  ownerAlert: `${SITE_URL}/ticket-icons/owner-alert.png`,
};
const ticketEmojis = {};

async function ensureTicketEmojis() {
  try {
    const existing = await client.application.emojis.fetch();
    for (const [key, url] of Object.entries(TICKET_EMOJI_FILES)) {
      const name = `ticket_${key}`.toLowerCase();
      let emoji = existing.find((e) => e.name === name);
      if (!emoji) {
        if (!SITE_URL) { console.warn(`Skipping ${name}`); continue; }
        emoji = await client.application.emojis.create({ name, attachment: url });
      }
      ticketEmojis[key] = { id: emoji.id, name: emoji.name, mention: `<:${emoji.name}:${emoji.id}>` };
    }
  } catch (e) { console.error("Ticket emojis failed:", e.message); }
}

function ticketEmoji(key) { return ticketEmojis[key]?.mention || ""; }
function ticketEmojiButton(key) {
  return ticketEmojis[key] ? { id: ticketEmojis[key].id, name: ticketEmojis[key].name } : undefined;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers,
  ],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeRegex(s) {
  const sp = '.^$*+?{}[]\\()|';
  const out = [];
  for (const c of String(s)) out.push(sp.indexOf(c) >= 0 ? '\\' + c : c);
  return out.join('');
}
function isOwner(i) {
  if (OWNER_DISCORD_ID && i.user.id === OWNER_DISCORD_ID) return true;
  return i.memberPermissions?.has(PermissionFlagsBits.Administrator);
}
function applyBanner(e) { if (BANNER_URL) e.setImage(BANNER_URL); return e; }
function applyTicketBanner(e) { if (TICKET_BANNER_URL) e.setImage(TICKET_BANNER_URL); return e; }
function fmt(n) { return (n || 0).toLocaleString(); }
function fmtMs(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
async function getOrCreateCategory(guild, name) {
  let cat = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === name);
  if (!cat) cat = await guild.channels.create({
    name, type: ChannelType.GuildCategory,
    permissionOverwrites: [{ id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }],
  });
  return cat;
}

// ─── Support panel ────────────────────────────────────────────────────────────
async function sendSupportPanel() {
  try {
    const channel = await client.channels.fetch(SUPPORT_PANEL_CHANNEL_ID);
    if (!channel) return;
    const messages = await channel.messages.fetch({ limit: 20 });
    for (const [, msg] of messages.filter((m) => m.author.id === client.user.id))
      await msg.delete().catch(() => {});
    const embed = applyTicketBanner(new EmbedBuilder().setColor(0x8b5cf6)
      .setTitle(`${ticketEmoji("ticket")} GemTide Support Center`)
      .setDescription(
        "Welcome to GemTide support! Click the button that matches your issue below.\n\n" +
        `${ticketEmoji("siteSupport")} **Site Support** — Website, balance, or account issues\n` +
        `${ticketEmoji("scamReport")} **Scams / Unfair Trades** — Report a scam or bad trade\n` +
        `${ticketEmoji("discordSupport")} **Discord Support** — Roles, verification, or server issues\n` +
        `${ticketEmoji("claimGiveaway")} **Claim DC GWs** — Claim your Discord giveaway winnings`
      ).setFooter({ text: "GemTide • Support" }).setTimestamp());
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_site_support").setLabel("Site Support").setEmoji(ticketEmojiButton("siteSupport")).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ticket_scams").setLabel("Scams / Unfair Trades").setEmoji(ticketEmojiButton("scamReport")).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("ticket_discord_support").setLabel("Discord Support").setEmoji(ticketEmojiButton("discordSupport")).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ticket_claim_gw").setLabel("Claim DC GWs").setEmoji(ticketEmojiButton("claimGiveaway")).setStyle(ButtonStyle.Success)
    );
    await channel.send({ embeds: [embed], components: [row] });
  } catch (e) { console.error("Support panel failed:", e.message); }
}

// ─── Giveaway helpers ─────────────────────────────────────────────────────────
function buildGiveawayEmbed(prize, endTime, winnersCount, entrantsCount, ended = false, winners = []) {
  const embed = new EmbedBuilder().setColor(ended ? 0x888888 : 0xf59e0b)
    .setTitle(ended ? `🎉 Giveaway Ended — ${prize}` : `🎉 Giveaway — ${prize}`)
    .setDescription(ended
      ? (winners.length ? `**Winner${winners.length > 1 ? "s" : ""}:** ${winners.map((id) => `<@${id}>`).join(", ")}` : "No one entered.")
      : `Click **Enter** to participate!\n\n**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n**Entries:** ${entrantsCount}`
    ).setFooter({ text: `GemTide Giveaways${ended ? " • Ended" : ""}` }).setTimestamp();
  applyBanner(embed);
  return embed;
}
async function endGiveaway(giveawayId) {
  const gw = activeGiveaways.get(giveawayId);
  if (!gw) return;
  clearTimeout(gw.timer);
  activeGiveaways.delete(giveawayId);
  const pool = [...gw.entrants], winners = [];
  const count = Math.min(gw.winnersCount, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  try {
    const channel = await client.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(gw.messageId);
    await message.edit({ embeds: [buildGiveawayEmbed(gw.prize, gw.endTime, gw.winnersCount, gw.entrants.size, true, winners)], components: [] });
    await channel.send(winners.length
      ? `🎉 Congratulations ${winners.map((id) => `<@${id}>`).join(", ")}! You won **${gw.prize}**!`
      : "No valid entrants — giveaway ended with no winner.");
  } catch (e) { console.error("endGiveaway failed:", e.message); }
}

// ─── clientReady ──────────────────────────────────────────────────────────────
client.once("clientReady", async () => {
  console.log(`GemTide bot online as ${client.user.tag}`);
  try { client.user.setPresence({ activities: [{ name: "GemTide.Win", type: ActivityType.Playing }], status: "online" }); } catch {}
  logger.init(client);
  await ensureTicketEmojis();

  let commands;
  try {
    commands = [
      // ── User / Account ────────────────────────────────────────────────────
      new SlashCommandBuilder().setName("balance").setDescription("Your GemTide balance & stats"),
      new SlashCommandBuilder().setName("profit").setDescription("Your net profit/loss"),
      new SlashCommandBuilder().setName("stats").setDescription("Your full GemTide statistics"),
      new SlashCommandBuilder().setName("wager").setDescription("Your wager amount & rank"),
      new SlashCommandBuilder().setName("daily").setDescription("Daily bonus reminder link"),
      new SlashCommandBuilder().setName("withdraws").setDescription("Your pending withdrawals"),
      new SlashCommandBuilder().setName("cancelallwithdraws").setDescription("Cancel all your pending withdrawals"),
      new SlashCommandBuilder().setName("link").setDescription("Link your Discord to GemTide"),
      new SlashCommandBuilder().setName("unlink").setDescription("Unlink your Discord from GemTide"),
      new SlashCommandBuilder()
        .setName("inventory").setDescription("Browse your GemTide inventory")
        .addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder()
        .setName("history").setDescription("Your recent transaction history")
        .addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder()
        .setName("profile").setDescription("View a linked user's GemTide profile")
        .addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)),

      // ── Leaderboards ──────────────────────────────────────────────────────
      new SlashCommandBuilder().setName("leaderboard").setDescription("Top 10 wagerers"),
      new SlashCommandBuilder().setName("richest").setDescription("Top 10 users by balance"),
      new SlashCommandBuilder().setName("topprofit").setDescription("Top 10 most profitable users"),
      new SlashCommandBuilder().setName("toplosers").setDescription("Top 10 by total loss"),
      new SlashCommandBuilder().setName("toplevel").setDescription("Top 10 by level"),

      // ── Games & Site Info ─────────────────────────────────────────────────
      new SlashCommandBuilder().setName("deposit").setDescription("Active deposit bots & how to deposit"),
      new SlashCommandBuilder().setName("games").setDescription("All available games on GemTide"),
      new SlashCommandBuilder().setName("sitestats").setDescription("Site-wide statistics"),
      new SlashCommandBuilder().setName("activecoinflips").setDescription("Active coinflips right now"),
      new SlashCommandBuilder().setName("jackpotstats").setDescription("Current jackpot status"),
      new SlashCommandBuilder().setName("recentgames").setDescription("5 most recently completed coinflips"),

      // ── Utility ───────────────────────────────────────────────────────────
      new SlashCommandBuilder().setName("ping").setDescription("Bot response time"),
      new SlashCommandBuilder().setName("help").setDescription("All GemTide bot commands"),
      new SlashCommandBuilder().setName("support").setDescription("GemTide support info"),
      new SlashCommandBuilder().setName("invite").setDescription("GemTide site link"),
      new SlashCommandBuilder().setName("serverinfo").setDescription("This Discord server's info"),
      new SlashCommandBuilder().setName("botinfo").setDescription("GemTide bot info & uptime"),
      new SlashCommandBuilder()
        .setName("avatar").setDescription("View a user's avatar")
        .addUserOption((o) => o.setName("user").setDescription("User (defaults to yourself)")),
      new SlashCommandBuilder()
        .setName("roll").setDescription("Roll a random number")
        .addIntegerOption((o) => o.setName("sides").setDescription("Sides (default 100)").setMinValue(2).setMaxValue(1000000)),
      new SlashCommandBuilder().setName("flip").setDescription("Flip a coin"),
      new SlashCommandBuilder()
        .setName("8ball").setDescription("Ask the magic 8-ball")
        .addStringOption((o) => o.setName("question").setDescription("Your question").setRequired(true)),
      new SlashCommandBuilder()
        .setName("rps").setDescription("Rock-paper-scissors vs the bot")
        .addStringOption((o) => o.setName("choice").setDescription("Your choice").setRequired(true)
          .addChoices({ name: "Rock", value: "rock" }, { name: "Paper", value: "paper" }, { name: "Scissors", value: "scissors" })),
      new SlashCommandBuilder()
        .setName("poll").setDescription("Create a poll")
        .addStringOption((o) => o.setName("question").setDescription("Poll question").setRequired(true))
        .addStringOption((o) => o.setName("options").setDescription("Options separated by | e.g. Yes|No|Maybe").setRequired(true)),
      new SlashCommandBuilder()
        .setName("remind").setDescription("Set a reminder (DM'd to you)")
        .addIntegerOption((o) => o.setName("minutes").setDescription("Minutes from now").setRequired(true).setMinValue(1).setMaxValue(10080))
        .addStringOption((o) => o.setName("message").setDescription("Reminder message").setRequired(true)),
      new SlashCommandBuilder()
        .setName("calc").setDescription("Calculate a math expression")
        .addStringOption((o) => o.setName("expression").setDescription("e.g. 2500 * 3 + 1000").setRequired(true)),
      new SlashCommandBuilder()
        .setName("say").setDescription("Admin — send a message as the bot")
        .addStringOption((o) => o.setName("message").setDescription("Message to send").setRequired(true))
        .addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),

      // ── Giveaways ─────────────────────────────────────────────────────────
      new SlashCommandBuilder().setName("giveaway").setDescription("Manage giveaways")
        .addSubcommand((s) => s.setName("start").setDescription("Start a giveaway")
          .addStringOption((o) => o.setName("prize").setDescription("Prize").setRequired(true))
          .addIntegerOption((o) => o.setName("duration").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(10080))
          .addIntegerOption((o) => o.setName("winners").setDescription("Winners (default 1)").setMinValue(1).setMaxValue(20))
          .addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")))
        .addSubcommand((s) => s.setName("end").setDescription("Force-end a giveaway")
          .addStringOption((o) => o.setName("id").setDescription("Giveaway ID").setRequired(true)))
        .addSubcommand((s) => s.setName("reroll").setDescription("Reroll a winner")
          .addStringOption((o) => o.setName("messageid").setDescription("Message ID of ended giveaway").setRequired(true)))
        .addSubcommand((s) => s.setName("list").setDescription("List active giveaways")),

      // ── Admin — User Management ───────────────────────────────────────────
      new SlashCommandBuilder().setName("ban").setDescription("Admin — ban a user from the site")
        .addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason")),
      new SlashCommandBuilder().setName("unban").setDescription("Admin — unban a site user")
        .addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)),
      new SlashCommandBuilder().setName("banid").setDescription("Admin — ban by Roblox ID")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason")),
      new SlashCommandBuilder().setName("unbanid").setDescription("Admin — unban by Roblox ID")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("listbanned").setDescription("Admin — list all banned users")
        .addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("userinfo").setDescription("Admin — full account info")
        .addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)),
      new SlashCommandBuilder().setName("userinfobyid").setDescription("Admin — full account info by Roblox ID")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("finduser").setDescription("Admin — search users by Roblox username")
        .addStringOption((o) => o.setName("query").setDescription("Search term").setRequired(true)),
      new SlashCommandBuilder().setName("addbalance").setDescription("Admin — add/subtract balance")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addIntegerOption((o) => o.setName("amount").setDescription("Amount (neg to subtract)").setRequired(true)),
      new SlashCommandBuilder().setName("setbalance").setDescription("Admin — set exact balance")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addIntegerOption((o) => o.setName("amount").setDescription("New balance (0+)").setRequired(true).setMinValue(0)),
      new SlashCommandBuilder().setName("addwager").setDescription("Admin — manually add wager amount")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addIntegerOption((o) => o.setName("amount").setDescription("Amount to add").setRequired(true).setMinValue(1)),
      new SlashCommandBuilder().setName("setlevel").setDescription("Admin — set a user's level")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addIntegerOption((o) => o.setName("level").setDescription("New level").setRequired(true).setMinValue(0)),
      new SlashCommandBuilder().setName("resetstats").setDescription("Admin — reset won/lost/wager to 0")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("transferbalance").setDescription("Admin — transfer balance between users")
        .addStringOption((o) => o.setName("from_id").setDescription("From Roblox ID").setRequired(true))
        .addStringOption((o) => o.setName("to_id").setDescription("To Roblox ID").setRequired(true))
        .addIntegerOption((o) => o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(1)),
      new SlashCommandBuilder().setName("give").setDescription("Admin — give an item to a user")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true))
        .addIntegerOption((o) => o.setName("quantity").setDescription("Quantity (default 1)").setMinValue(1)),

      // ── Admin — Withdrawal Management ─────────────────────────────────────
      new SlashCommandBuilder().setName("clearwithdrawals").setDescription("Admin — clear withdrawals for a user")
        .addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)),
      new SlashCommandBuilder().setName("clearwithdrawalsbyid").setDescription("Admin — clear withdrawals by Roblox ID")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("pendingwithdrawals").setDescription("Admin — all site-wide pending withdrawals")
        .addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("addwithdrawal").setDescription("Admin — queue a withdrawal for a user")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("withdrawstats").setDescription("Admin — site-wide withdrawal stats"),

      // ── Admin — Inventory Management ──────────────────────────────────────
      new SlashCommandBuilder().setName("inventoryof").setDescription("Admin — view user's inventory by Roblox ID")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("clearinventory").setDescription("Admin — wipe a user's inventory")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("removeitem").setDescription("Admin — remove one item from a user's inventory")
        .addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true))
        .addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("searchinventory").setDescription("Admin — find who holds a specific item")
        .addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("givemass").setDescription("Admin — give an item to all users")
        .addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true))
        .addStringOption((o) => o.setName("game").setDescription("Game (PS99 etc)").setRequired(true))
        .addIntegerOption((o) => o.setName("quantity").setDescription("Qty per user (default 1)").setMinValue(1)),

      // ── Admin — Item Database ─────────────────────────────────────────────
      new SlashCommandBuilder().setName("iteminfo").setDescription("Look up an item in the database")
        .addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("itemlist").setDescription("Browse items in the database")
        .addStringOption((o) => o.setName("game").setDescription("Filter by game (optional)"))
        .addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("createitem").setDescription("Admin — create a new item")
        .addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true))
        .addIntegerOption((o) => o.setName("value").setDescription("Value in R$").setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName("game").setDescription("Game (e.g. PS99)").setRequired(true)),
      new SlashCommandBuilder().setName("updateitemvalue").setDescription("Admin — update an item's value")
        .addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true))
        .addIntegerOption((o) => o.setName("value").setDescription("New value in R$").setRequired(true).setMinValue(1)),
      new SlashCommandBuilder().setName("deleteitem").setDescription("Admin — delete an item from the database")
        .addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true)),

      // ── Admin — Bot Management ────────────────────────────────────────────
      new SlashCommandBuilder().setName("create").setDescription("Admin — register a deposit/withdraw bot")
        .addStringOption((o) => o.setName("name").setDescription("Bot Roblox username").setRequired(true))
        .addStringOption((o) => o.setName("pfp").setDescription("Bot avatar URL").setRequired(true))
        .addIntegerOption((o) => o.setName("userid").setDescription("Bot Roblox user ID").setRequired(true))
        .addStringOption((o) => o.setName("game").setDescription("Game e.g. PS99").setRequired(true))
        .addStringOption((o) => o.setName("link").setDescription("Roblox profile link (optional)")),
      new SlashCommandBuilder().setName("toggle").setDescription("Admin — manage bots and settings")
        .addSubcommand((s) => s.setName("on").setDescription("Enable a bot")
          .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID or 'all'").setRequired(true)))
        .addSubcommand((s) => s.setName("off").setDescription("Disable a bot")
          .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID or 'all'").setRequired(true)))
        .addSubcommand((s) => s.setName("list").setDescription("List all registered bots"))
        .addSubcommand((s) => s.setName("delete").setDescription("Delete a bot entry")
          .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID").setRequired(true)))
        .addSubcommand((s) => s.setName("cancelwithdraws").setDescription("Enable/disable cancel-withdraws")
          .addStringOption((o) => o.setName("action").setDescription("enable or disable").setRequired(true)
            .addChoices({ name: "enable", value: "enable" }, { name: "disable", value: "disable" }))),
      new SlashCommandBuilder().setName("botstatus").setDescription("Admin — all bots online/offline status"),
      new SlashCommandBuilder().setName("editbot").setDescription("Admin — edit a bot property")
        .addStringOption((o) => o.setName("botid").setDescription("Bot DB ID").setRequired(true))
        .addStringOption((o) => o.setName("field").setDescription("Field to update").setRequired(true)
          .addChoices({ name: "name", value: "name" }, { name: "pfp", value: "pfp" },
                      { name: "link", value: "link" }, { name: "game", value: "game" }))
        .addStringOption((o) => o.setName("value").setDescription("New value").setRequired(true)),

      // ── Admin — Site / Announcements ──────────────────────────────────────
      new SlashCommandBuilder().setName("announce").setDescription("Admin — send a branded announcement")
        .addStringOption((o) => o.setName("message").setDescription("Announcement text").setRequired(true))
        .addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("listalllinked").setDescription("Admin — all users with linked Discord")
        .addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)")),
      new SlashCommandBuilder().setName("locktipping").setDescription("Admin — enable or disable tipping")
        .addStringOption((o) => o.setName("action").setDescription("enable or disable").setRequired(true)
          .addChoices({ name: "enable", value: "enable" }, { name: "disable", value: "disable" })),

      // ── Discord Moderation ────────────────────────────────────────────────
      new SlashCommandBuilder().setName("kick").setDescription("Admin — kick a member")
        .addUserOption((o) => o.setName("user").setDescription("Member to kick").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason")),
      new SlashCommandBuilder().setName("discordban").setDescription("Admin — ban from the Discord server")
        .addUserOption((o) => o.setName("user").setDescription("Member to ban").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason"))
        .addIntegerOption((o) => o.setName("delete_days").setDescription("Days of messages to delete (0-7)").setMinValue(0).setMaxValue(7)),
      new SlashCommandBuilder().setName("timeout").setDescription("Admin — timeout (mute) a member")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addIntegerOption((o) => o.setName("minutes").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption((o) => o.setName("reason").setDescription("Reason")),
      new SlashCommandBuilder().setName("untimeout").setDescription("Admin — remove a member's timeout")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      new SlashCommandBuilder().setName("warn").setDescription("Admin — warn a Discord member")
        .addUserOption((o) => o.setName("user").setDescription("Member to warn").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true)),
      new SlashCommandBuilder().setName("warnings").setDescription("Admin — view a member's warnings")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      new SlashCommandBuilder().setName("clearwarnings").setDescription("Admin — clear all warnings for a member")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      new SlashCommandBuilder().setName("purge").setDescription("Admin — bulk delete messages")
        .addIntegerOption((o) => o.setName("count").setDescription("Messages to delete (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)),
      new SlashCommandBuilder().setName("slowmode").setDescription("Admin — set channel slowmode")
        .addIntegerOption((o) => o.setName("seconds").setDescription("Seconds (0=disable, max 21600)").setRequired(true).setMinValue(0).setMaxValue(21600))
        .addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("lock").setDescription("Admin — lock a channel")
        .addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("unlock").setDescription("Admin — unlock a channel")
        .addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("nick").setDescription("Admin — change a member's nickname")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addStringOption((o) => o.setName("nickname").setDescription("New nickname (blank to reset)")),
    ].map((c) => c.toJSON());
  } catch (e) { console.error("Failed to build commands:", e.message); }

  if (commands) {
    try {
      await client.application.commands.set(commands);
      console.log(`Slash commands registered (${commands.length} total).`);
    } catch (e) { console.error("Failed to register commands:", e.message); }
  }
  await sendSupportPanel();
});

// ─── Interaction handler ──────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const { customId } = interaction;
    if (TICKET_CATEGORIES[customId])            return handleTicketCreate(interaction, customId);
    if (customId === "ticket_close")            return handleTicketClose(interaction);
    if (customId.startsWith("giveaway_enter_")) return handleGiveawayEnter(interaction, customId.replace("giveaway_enter_", ""));
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  await interaction.deferReply({ ephemeral: false });

  // ── /balance ─────────────────────────────────────────────────────────────────
  if (commandName === "balance") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Link your Discord first — use `/link`.");
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`${user.username}'s Balance`).setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "💰 Balance", value: `R$${fmt(user.balance)}`, inline: true },
          { name: "📈 Wagered", value: `R$${fmt(user.wager)}`,   inline: true },
          { name: "✅ Won",     value: `R$${fmt(user.won)}`,     inline: true },
          { name: "❌ Lost",   value: `R$${fmt(user.lost)}`,     inline: true },
          { name: "📊 Profit", value: `R$${fmt((user.won||0)-(user.lost||0))}`, inline: true },
          { name: "⭐ Level",  value: String(user.level || 0),   inline: true }
        ).setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /profit ──────────────────────────────────────────────────────────────────
  } else if (commandName === "profit") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Link your Discord first — use `/link`.");
      const profit = (user.won || 0) - (user.lost || 0);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(profit >= 0 ? 0x4ade80 : 0xff6b6b).setTitle(`${user.username}'s Profit/Loss`)
        .addFields(
          { name: "✅ Total Won",  value: `R$${fmt(user.won)}`,  inline: true },
          { name: "❌ Total Lost", value: `R$${fmt(user.lost)}`, inline: true },
          { name: "📊 Net",        value: `${profit >= 0 ? "+" : ""}R$${fmt(Math.abs(profit))}`, inline: true }
        ).setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /stats ───────────────────────────────────────────────────────────────────
  } else if (commandName === "stats") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Link your Discord first — use `/link`.");
      const [invCount, pendingCount] = await Promise.all([
        inventorys.countDocuments({ owner: user.userid, locked: false }),
        withdraws.countDocuments({ userid: user.userid }),
      ]);
      const profit = (user.won || 0) - (user.lost || 0);
      const total = (user.won || 0) + (user.lost || 0);
      const winRate = total ? ((user.won || 0) / total * 100).toFixed(1) : "N/A";
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`📊 ${user.username}'s Stats`).setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "⭐ Level",     value: String(user.level || 0),   inline: true },
          { name: "💰 Balance",   value: `R$${fmt(user.balance)}`,   inline: true },
          { name: "📈 Wagered",   value: `R$${fmt(user.wager)}`,     inline: true },
          { name: "✅ Won",       value: `R$${fmt(user.won)}`,       inline: true },
          { name: "❌ Lost",      value: `R$${fmt(user.lost)}`,      inline: true },
          { name: "📊 Profit",    value: `R$${fmt(profit)}`,          inline: true },
          { name: "🎯 Win Rate",  value: `${winRate}%`,              inline: true },
          { name: "🎒 Inventory", value: String(invCount),           inline: true },
          { name: "📤 Withdrawals", value: String(pendingCount),     inline: true }
        ).setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /wager ───────────────────────────────────────────────────────────────────
  } else if (commandName === "wager") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Link your Discord first — use `/link`.");
      const rank = await users.countDocuments({ wager: { $gt: user.wager || 0 } });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`${user.username}'s Wager Stats`)
        .addFields(
          { name: "📈 Total Wagered", value: `R$${fmt(user.wager)}`, inline: true },
          { name: "🏆 Wager Rank",    value: `#${rank + 1}`,         inline: true },
          { name: "⭐ Level",         value: String(user.level || 0), inline: true }
        ).setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /daily ───────────────────────────────────────────────────────────────────
  } else if (commandName === "daily") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Claim Daily Bonus").setEmoji("🎁").setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/daily`)
    );
    await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
      .setColor(0xf59e0b).setTitle("🎁 Daily Bonus")
      .setDescription(`Visit GemTide to claim your daily bonus!\n\n[Click here to claim](${SITE_URL}/daily)`)
      .setFooter({ text: "GemTide • Daily resets every 24 hours" }))], components: [row] });

  // ── /withdraws ───────────────────────────────────────────────────────────────
  } else if (commandName === "withdraws") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Link your Discord first — use `/link`.");
      const pending = await withdraws.find({ userid: user.userid });
      if (!pending.length) return interaction.editReply("✅ You have no pending withdrawals.");
      const counts = {};
      pending.forEach((w) => { counts[w.itemname] = (counts[w.itemname] || 0) + 1; });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`${user.username}'s Pending Withdrawals`)
        .setDescription(Object.entries(counts).map(([item, c]) => `• **${item}** x${c}`).join("\n"))
        .addFields({ name: "Total Items", value: String(pending.length), inline: true })
        .setThumbnail(user.thumbnail || null).setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /cancelallwithdraws ──────────────────────────────────────────────────────
  } else if (commandName === "cancelallwithdraws") {
    try {
      if (!settings.cancelWithdrawsEnabled) return interaction.editReply("❌ Cancel withdrawals is currently **disabled** site-wide.");
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Link your Discord first — use `/link`.");
      const pending = await withdraws.find({ userid: user.userid });
      if (!pending.length) return interaction.editReply("You have no pending withdrawals to cancel.");
      await inventorys.insertMany(pending.map((w) => ({ itemid: w.itemid, owner: user.userid, locked: false })));
      await withdraws.deleteMany({ userid: user.userid });
      logger.logEvent({ type: "🗑️ Withdrawals Cancelled", color: 0xff6b6b,
        description: `**${user.username}** cancelled ${pending.length} withdrawal(s) via Discord.`,
        thumbnail: user.thumbnail });
      await interaction.editReply(`✅ Cancelled **${pending.length}** withdrawal${pending.length !== 1 ? "s" : ""} — items returned to inventory.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /link ────────────────────────────────────────────────────────────────────
  } else if (commandName === "link") {
    const already = await users.findOne({ discordid: interaction.user.id }).catch(() => null);
    if (already) {
      return interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x4ade80).setTitle("✅ Already Linked")
        .setDescription(`Your Discord is already linked to **${already.username}**.\nUse \`/unlink\` to disconnect.`)
        .setFooter({ text: "GemTide" }))] });
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Link on GemTide").setEmoji("🔗").setStyle(ButtonStyle.Link).setURL(`${SITE_URL}/profile`)
    );
    await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
      .setColor(0x8b5cf6).setTitle("🔗 Link Your Discord Account")
      .setDescription(
        "To link your Discord account to GemTide:\n\n" +
        `**1.** Log in to [GemTide.Win](${SITE_URL}) with Roblox\n` +
        "**2.** Click your avatar → **Profile**\n" +
        "**3.** Click **Link Discord** and authorise\n\n" +
        "Once linked, all bot commands like `/balance`, `/withdraws`, and `/inventory` will work."
      ).setFooter({ text: "GemTide" }))], components: [row] });

  // ── /unlink ──────────────────────────────────────────────────────────────────
  } else if (commandName === "unlink") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Your Discord isn't linked to any GemTide account.");
      await users.updateOne({ discordid: interaction.user.id }, { $set: { discordid: "", discordusername: "" } });
      logger.logEvent({ type: "🔓 Discord Unlinked", color: 0xfbbf24,
        description: `**${user.username}** unlinked Discord (@${interaction.user.username}).`,
        thumbnail: user.thumbnail });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0xfbbf24).setTitle("🔓 Discord Unlinked")
        .setDescription(`Unlinked from **${user.username}**. Re-link anytime with \`/link\`.`)
        .setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /inventory ───────────────────────────────────────────────────────────────
  } else if (commandName === "inventory") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Link your Discord first — use `/link`.");
      const perPage = 10, page = Math.max(1, interaction.options.getInteger("page") || 1);
      const total = await inventorys.countDocuments({ owner: user.userid, locked: false });
      if (!total) return interaction.editReply("🎒 Your inventory is empty.");
      const totalPages = Math.ceil(total / perPage);
      const rawItems = await inventorys.find({ owner: user.userid, locked: false }).skip((page - 1) * perPage).limit(perPage).lean();
      const itemIds = rawItems.map((i) => Number(i.itemid)).filter(Boolean);
      const itemDocs = itemIds.length ? await items.find({ itemid: { $in: itemIds } }).lean() : [];
      const itemMap = {};
      itemDocs.forEach((d) => { itemMap[d.itemid] = d; });
      const lines = rawItems.map((inv) => {
        const doc = itemMap[Number(inv.itemid)];
        return doc ? `• **${doc.itemname}** — R$${fmt(doc.itemvalue)}` : `• Item \`${inv.itemid}\``;
      });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`🎒 ${user.username}'s Inventory`)
        .setDescription(lines.join("\n"))
        .addFields({ name: "Total Items", value: String(total), inline: true }, { name: "Page", value: `${page}/${totalPages}`, inline: true })
        .setThumbnail(user.thumbnail || null).setFooter({ text: `GemTide • Page ${page}/${totalPages}` }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /history ─────────────────────────────────────────────────────────────────
  } else if (commandName === "history") {
    try {
      const user = await users.findOne({ discordid: interaction.user.id });
      if (!user) return interaction.editReply("❌ Link your Discord first — use `/link`.");
      const perPage = 10, page = Math.max(1, interaction.options.getInteger("page") || 1);
      const total = await history.countDocuments({ userid: user.userid });
      if (!total) return interaction.editReply("📜 No transaction history found.");
      const totalPages = Math.ceil(total / perPage);
      const entries = await history.find({ userid: user.userid }).sort({ date: -1 }).skip((page - 1) * perPage).limit(perPage).lean();
      const lines = entries.map((h) => {
        const ts = h.date ? `<t:${Math.floor(new Date(h.date).getTime() / 1000)}:d>` : "?";
        return `${ts} **${h.type}** — \`${h.amount}\``;
      });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle(`📜 ${user.username}'s History`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: `GemTide • Page ${page}/${totalPages}` }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /profile ─────────────────────────────────────────────────────────────────
  } else if (commandName === "profile") {
    try {
      const selected = interaction.options.getUser("user");
      const user = await users.findOne({ discordid: selected.id });
      if (!user) return interaction.editReply(`❌ No linked GemTide account for **${selected.username}**.`);
      const invCount = await inventorys.countDocuments({ owner: user.userid, locked: false });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(user.banned ? 0xff0000 : 0x8b5cf6)
        .setTitle(`${user.username}'s Profile${user.banned ? " 🔨" : ""}`)
        .setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "⭐ Level",   value: String(user.level || 0),             inline: true },
          { name: "💰 Balance", value: `R$${fmt(user.balance)}`,             inline: true },
          { name: "📈 Wagered", value: `R$${fmt(user.wager)}`,               inline: true },
          { name: "✅ Won",     value: `R$${fmt(user.won)}`,                 inline: true },
          { name: "❌ Lost",    value: `R$${fmt(user.lost)}`,                inline: true },
          { name: "📊 Profit",  value: `R$${fmt((user.won||0)-(user.lost||0))}`, inline: true },
          { name: "🎒 Items",   value: String(invCount),                     inline: true }
        ).setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /leaderboard ─────────────────────────────────────────────────────────────
  } else if (commandName === "leaderboard") {
    try {
      const leaders = await users.find({ wager: { $gt: 0 } }).sort({ wager: -1 }).limit(10);
      if (!leaders.length) return interaction.editReply("No data yet.");
      const medals = ["🥇","🥈","🥉"];
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle("🏆 Top Wagerers")
        .setDescription(leaders.map((u, i) => `${medals[i] || `**#${i+1}**`} **${u.username}** — R$${fmt(u.wager)}`).join("\n"))
        .setFooter({ text: "GemTide Leaderboard" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /richest ─────────────────────────────────────────────────────────────────
  } else if (commandName === "richest") {
    try {
      const leaders = await users.find({ balance: { $gt: 0 } }).sort({ balance: -1 }).limit(10);
      if (!leaders.length) return interaction.editReply("No data yet.");
      const medals = ["🥇","🥈","🥉"];
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0xf59e0b).setTitle("💰 Richest Users")
        .setDescription(leaders.map((u, i) => `${medals[i] || `**#${i+1}**`} **${u.username}** — R$${fmt(u.balance)}`).join("\n"))
        .setFooter({ text: "GemTide Leaderboard" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /topprofit ───────────────────────────────────────────────────────────────
  } else if (commandName === "topprofit") {
    try {
      const all = await users.find({ won: { $gt: 0 } }).lean();
      all.sort((a, b) => ((b.won||0)-(b.lost||0)) - ((a.won||0)-(a.lost||0)));
      const leaders = all.slice(0, 10);
      if (!leaders.length) return interaction.editReply("No data yet.");
      const medals = ["🥇","🥈","🥉"];
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x4ade80).setTitle("📊 Top Profit")
        .setDescription(leaders.map((u, i) => `${medals[i] || `**#${i+1}**`} **${u.username}** — R$${fmt((u.won||0)-(u.lost||0))}`).join("\n"))
        .setFooter({ text: "GemTide Leaderboard" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /toplosers ───────────────────────────────────────────────────────────────
  } else if (commandName === "toplosers") {
    try {
      const leaders = await users.find({ lost: { $gt: 0 } }).sort({ lost: -1 }).limit(10);
      if (!leaders.length) return interaction.editReply("No data yet.");
      const medals = ["🥇","🥈","🥉"];
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0xff6b6b).setTitle("📉 Biggest Losers")
        .setDescription(leaders.map((u, i) => `${medals[i] || `**#${i+1}**`} **${u.username}** — R$${fmt(u.lost)}`).join("\n"))
        .setFooter({ text: "GemTide Leaderboard" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /toplevel ────────────────────────────────────────────────────────────────
  } else if (commandName === "toplevel") {
    try {
      const leaders = await users.find({ level: { $gt: 0 } }).sort({ level: -1 }).limit(10);
      if (!leaders.length) return interaction.editReply("No data yet.");
      const medals = ["🥇","🥈","🥉"];
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0xa78bfa).setTitle("⭐ Top Levels")
        .setDescription(leaders.map((u, i) => `${medals[i] || `**#${i+1}**`} **${u.username}** — Level ${u.level}`).join("\n"))
        .setFooter({ text: "GemTide Leaderboard" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /deposit ─────────────────────────────────────────────────────────────────
  } else if (commandName === "deposit") {
    try {
      const activeBots = await bots.find({ online: true });
      if (!activeBots.length) {
        return interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
          .setColor(0xff6b6b).setTitle("🤖 Deposit Bots")
          .setDescription("❌ No active deposit bots online right now. Check back later.")
          .setFooter({ text: "GemTide" }))] });
      }
      const embed = applyBanner(new EmbedBuilder().setColor(0x4ade80).setTitle("🤖 Active Deposit Bots")
        .setDescription(`**${activeBots.length}** bot${activeBots.length !== 1 ? "s" : ""} online. Join their Roblox game and trade items to deposit.`)
        .setFooter({ text: "GemTide • Trade the bot in-game after joining" }).setTimestamp());
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
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /games ───────────────────────────────────────────────────────────────────
  } else if (commandName === "games") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Play Now").setEmoji("🎮").setStyle(ButtonStyle.Link).setURL(SITE_URL)
    );
    await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle("🎮 GemTide Games")
      .setDescription(`All games at [GemTide.Win](${SITE_URL})`)
      .addFields(
        { name: "🪙 Coinflip",  value: "1v1 — bet items against another player", inline: false },
        { name: "🎲 Dice",      value: "1v1 — roll dice, highest total wins",     inline: false },
        { name: "🎰 Jackpot",   value: "Multi-player — biggest deposit wins",     inline: false },
        { name: "💣 Mines",     value: "Reveal tiles, avoid mines to multiply",   inline: false },
        { name: "🚀 Upgrader",  value: "Gamble items for a chance at better ones",inline: false },
        { name: "📦 Cases",     value: "Open cases to win random items",           inline: false },
        { name: "✂️ RPS",       value: "Classic rock paper scissors 1v1",         inline: false }
      ).setFooter({ text: "GemTide • Win big, withdraw to your inventory" }))], components: [row] });

  // ── /sitestats ───────────────────────────────────────────────────────────────
  } else if (commandName === "sitestats") {
    try {
      const [totalUsers, linkedUsers, bannedUsers, totalWithdraws, totalItems, totalBots, onlineBots] = await Promise.all([
        users.countDocuments(), users.countDocuments({ discordid: { $exists: true, $ne: "" } }),
        users.countDocuments({ banned: true }), withdraws.countDocuments(),
        inventorys.countDocuments({ locked: false }), bots.countDocuments(),
        bots.countDocuments({ online: true }),
      ]);
      const wageredAgg = await users.aggregate([{ $group: { _id: null, total: { $sum: "$wager" } } }]);
      const totalWagered = wageredAgg[0]?.total || 0;
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle("📊 GemTide Site Statistics")
        .addFields(
          { name: "👥 Total Users",       value: fmt(totalUsers),    inline: true },
          { name: "🔗 Linked Discord",    value: fmt(linkedUsers),   inline: true },
          { name: "🔨 Banned Users",      value: fmt(bannedUsers),   inline: true },
          { name: "📈 Total Wagered",     value: `R$${fmt(totalWagered)}`, inline: true },
          { name: "📤 Pending Withdrawals", value: fmt(totalWithdraws), inline: true },
          { name: "🎒 Items in Inventories", value: fmt(totalItems), inline: true },
          { name: "🤖 Total Bots",        value: fmt(totalBots),     inline: true },
          { name: "🟢 Online Bots",       value: fmt(onlineBots),    inline: true }
        ).setTimestamp().setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /activecoinflips ─────────────────────────────────────────────────────────
  } else if (commandName === "activecoinflips") {
    try {
      const [active, total] = await Promise.all([
        Coinflips.countDocuments({ active: true }), Coinflips.countDocuments(),
      ]);
      const recent = await Coinflips.find({ active: false }).sort({ end: -1 }).limit(3).lean();
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle("🪙 Coinflip Status")
        .addFields(
          { name: "🟢 Active", value: String(active), inline: true },
          { name: "📊 Total Ever", value: String(total), inline: true }
        )
        .setDescription(recent.length ? recent.map((c) =>
          `• **${c.PlayerOne?.username || "?"}** vs **${c.PlayerTwo?.username || "?"}** — R$${fmt(c.PlayerOne?.value)}`
        ).join("\n") : "No recent games.")
        .setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /jackpotstats ────────────────────────────────────────────────────────────
  } else if (commandName === "jackpotstats") {
    try {
      const current = await Jackpot.findOne({ inactive: { $ne: true } }).sort({ _id: -1 }).lean();
      const lastWon  = await Jackpot.findOne({ inactive: true, winnerid: { $exists: true } }).sort({ _id: -1 }).lean();
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0xf59e0b).setTitle("🎰 Jackpot Status")
        .addFields(
          { name: "💰 Current Pot",   value: current ? `R$${fmt(current.value)}` : "No active jackpot", inline: true },
          { name: "⚙️ State",         value: current?.state || "N/A",              inline: true },
          { name: "🏆 Last Winner",   value: lastWon?.winnerusername || "N/A",      inline: true },
          { name: "💸 Last Pot Size", value: lastWon ? `R$${fmt(lastWon.value)}` : "N/A", inline: true }
        ).setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /recentgames ─────────────────────────────────────────────────────────────
  } else if (commandName === "recentgames") {
    try {
      const recent = await Coinflips.find({ active: false, winner: { $ne: null } }).sort({ end: -1 }).limit(5).lean();
      if (!recent.length) return interaction.editReply("No completed coinflips yet.");
      const lines = recent.map((c, i) => {
        const pot = (c.PlayerOne?.value || 0) + (c.PlayerTwo?.value || 0);
        const winnerName = c.winner === c.PlayerOne?.id ? c.PlayerOne?.username : c.PlayerTwo?.username;
        return `**#${i+1}** 🏆 **${winnerName}** won R$${fmt(pot)} (${c.PlayerOne?.username} vs ${c.PlayerTwo?.username})`;
      });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(0x8b5cf6).setTitle("🪙 Recent Coinflips")
        .setDescription(lines.join("\n"))
        .setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /ping ────────────────────────────────────────────────────────────────────
  } else if (commandName === "ping") {
    const sent = Date.now();
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle("🏓 Pong!")
      .addFields(
        { name: "⚡ Roundtrip", value: `${Date.now() - sent}ms`, inline: true },
        { name: "💓 WebSocket", value: `${client.ws.ping}ms`,    inline: true }
      ).setFooter({ text: "GemTide" })] });

  // ── /help ────────────────────────────────────────────────────────────────────
  } else if (commandName === "help") {
    await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
      .setColor(0x8b5cf6).setTitle("📖 GemTide Bot — All Commands")
      .addFields(
        { name: "👤 Account", value:
            "`/link` `/unlink` — Link or unlink Discord\n`/balance` `/stats` `/profit` `/wager`\n" +
            "`/inventory [page]` `/history [page]`\n`/withdraws` `/cancelallwithdraws`\n`/daily` `/profile @user`", inline: false },
        { name: "🏆 Leaderboards", value:
            "`/leaderboard` `/richest` `/topprofit` `/toplosers` `/toplevel`", inline: false },
        { name: "🎮 Games & Site", value:
            "`/deposit` `/games` `/sitestats`\n`/activecoinflips` `/jackpotstats` `/recentgames`", inline: false },
        { name: "🛠️ Utility", value:
            "`/ping` `/help` `/support` `/invite` `/botinfo` `/serverinfo`\n" +
            "`/avatar` `/roll` `/flip` `/8ball` `/rps` `/poll` `/remind` `/calc` `/say`", inline: false },
        { name: "🎉 Giveaways", value: "`/giveaway start` `/end` `/reroll` `/list`", inline: false },
        { name: "🔧 Admin — Users", value:
            "`/ban` `/unban` `/banid` `/unbanid` `/listbanned`\n" +
            "`/userinfo` `/userinfobyid` `/finduser`\n" +
            "`/addbalance` `/setbalance` `/addwager` `/setlevel` `/resetstats` `/transferbalance`\n" +
            "`/give` `/clearwithdrawals` `/clearwithdrawalsbyid`\n" +
            "`/pendingwithdrawals` `/addwithdrawal` `/withdrawstats`", inline: false },
        { name: "🎒 Admin — Inventory & Items", value:
            "`/inventoryof` `/clearinventory` `/removeitem` `/searchinventory` `/givemass`\n" +
            "`/iteminfo` `/itemlist` `/createitem` `/updateitemvalue` `/deleteitem`", inline: false },
        { name: "🤖 Admin — Bots & Site", value:
            "`/create` `/toggle` `/botstatus` `/editbot`\n`/announce` `/listalllinked` `/locktipping`", inline: false },
        { name: "🛡️ Discord Moderation", value:
            "`/kick` `/discordban` `/timeout` `/untimeout`\n" +
            "`/warn` `/warnings` `/clearwarnings`\n`/purge` `/slowmode` `/lock` `/unlock` `/nick`", inline: false }
      ).setFooter({ text: "GemTide • /link to get started" }))] });

  // ── /support ─────────────────────────────────────────────────────────────────
  } else if (commandName === "support") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Open Support").setEmoji("🎫").setStyle(ButtonStyle.Link).setURL(SITE_URL)
    );
    await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle("🎫 GemTide Support")
      .setDescription("Need help? Use the ticket system in the support channel.\n\n• **Site Support** — balance, account, withdrawals\n• **Scam Reports** — unfair trades\n• **Discord Support** — roles, verification\n• **Claim GW** — Discord giveaway prizes")
      .setFooter({ text: "GemTide Support" }))], components: [row] });

  // ── /invite ──────────────────────────────────────────────────────────────────
  } else if (commandName === "invite") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Visit GemTide.Win").setEmoji("💎").setStyle(ButtonStyle.Link).setURL(SITE_URL)
    );
    await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle("💎 GemTide.Win")
      .setDescription(`Play coinflip, dice, jackpot, mines, upgrader, and cases on **[GemTide.Win](${SITE_URL})**!\n\nDeposit via our Roblox bots and withdraw your winnings.`)
      .setFooter({ text: "GemTide" }))], components: [row] });

  // ── /serverinfo ──────────────────────────────────────────────────────────────
  } else if (commandName === "serverinfo") {
    try {
      const guild = interaction.guild;
      if (!guild) return interaction.editReply("This command must be used in a server.");
      await guild.fetch();
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle(`📊 ${guild.name}`)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: "👥 Members",     value: fmt(guild.memberCount),                                 inline: true },
          { name: "📅 Created",     value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,    inline: true },
          { name: "💬 Channels",    value: String(guild.channels.cache.size),                       inline: true },
          { name: "🎭 Roles",       value: String(guild.roles.cache.size),                          inline: true },
          { name: "😀 Emojis",      value: String(guild.emojis.cache.size),                         inline: true },
          { name: "Owner",          value: `<@${guild.ownerId}>`,                                   inline: true }
        ).setFooter({ text: `ID: ${guild.id}` }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /botinfo ─────────────────────────────────────────────────────────────────
  } else if (commandName === "botinfo") {
    const uptime = fmtMs(Date.now() - BOT_START_TIME);
    await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle("🤖 GemTide Bot Info")
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: "📛 Tag",      value: client.user.tag,                   inline: true },
        { name: "🆔 Bot ID",   value: client.user.id,                    inline: true },
        { name: "⏱️ Uptime",   value: uptime,                             inline: true },
        { name: "💓 Ping",     value: `${client.ws.ping}ms`,             inline: true },
        { name: "🖥️ Commands", value: "87 slash commands",               inline: true },
        { name: "🌐 Site",     value: `[GemTide.Win](${SITE_URL})`,      inline: true }
      ).setFooter({ text: "GemTide Bot" }))] });

  // ── /avatar ──────────────────────────────────────────────────────────────────
  } else if (commandName === "avatar") {
    const target = interaction.options.getUser("user") || interaction.user;
    const url = target.displayAvatarURL({ size: 512 });
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6)
      .setTitle(`${target.username}'s Avatar`).setImage(url).setFooter({ text: "GemTide" })],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Full Size").setEmoji("🖼️").setStyle(ButtonStyle.Link).setURL(url)
      )] });

  // ── /roll ────────────────────────────────────────────────────────────────────
  } else if (commandName === "roll") {
    const sides = interaction.options.getInteger("sides") || 100;
    const result = Math.floor(Math.random() * sides) + 1;
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle("🎲 Dice Roll")
      .setDescription(`You rolled a **${result}** / ${sides}`).setFooter({ text: "GemTide" })] });

  // ── /flip ────────────────────────────────────────────────────────────────────
  } else if (commandName === "flip") {
    const result = Math.random() < 0.5 ? "Heads 🌕" : "Tails 🌑";
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle("🪙 Coin Flip")
      .setDescription(`It's **${result}**!`).setFooter({ text: "GemTide" })] });

  // ── /8ball ───────────────────────────────────────────────────────────────────
  } else if (commandName === "8ball") {
    const answers = [
      "It is certain.","It is decidedly so.","Without a doubt.","Yes definitely.",
      "You may rely on it.","As I see it, yes.","Most likely.","Outlook good.","Yes.",
      "Signs point to yes.","Reply hazy, try again.","Ask again later.",
      "Better not tell you now.","Cannot predict now.","Concentrate and ask again.",
      "Don't count on it.","My reply is no.","My sources say no.",
      "Outlook not so good.","Very doubtful."
    ];
    const q = interaction.options.getString("question");
    const a = answers[Math.floor(Math.random() * answers.length)];
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle("🎱 Magic 8-Ball")
      .addFields({ name: "❓ Question", value: q }, { name: "🎱 Answer", value: `**${a}**` })
      .setFooter({ text: "GemTide" })] });

  // ── /rps ─────────────────────────────────────────────────────────────────────
  } else if (commandName === "rps") {
    const choices = ["rock","paper","scissors"];
    const emojis  = { rock: "🪨", paper: "📄", scissors: "✂️" };
    const beats   = { rock: "scissors", paper: "rock", scissors: "paper" };
    const player  = interaction.options.getString("choice");
    const bot_c   = choices[Math.floor(Math.random() * 3)];
    const result  = player === bot_c ? "Draw! 🤝" : beats[player] === bot_c ? "You win! 🎉" : "Bot wins! 🤖";
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle("✂️ Rock Paper Scissors")
      .addFields(
        { name: "Your choice",  value: `${emojis[player]} ${player}`, inline: true },
        { name: "Bot's choice", value: `${emojis[bot_c]} ${bot_c}`,   inline: true },
        { name: "Result",       value: result,                         inline: true }
      ).setFooter({ text: "GemTide" })] });

  // ── /poll ────────────────────────────────────────────────────────────────────
  } else if (commandName === "poll") {
    const question = interaction.options.getString("question");
    const opts = interaction.options.getString("options").split("|").map((o) => o.trim()).filter(Boolean).slice(0, 10);
    if (opts.length < 2) return interaction.editReply("❌ Provide at least 2 options separated by `|`.");
    const numEmoji = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
    const embed = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`📊 ${question}`)
      .setDescription(opts.map((o, i) => `${numEmoji[i]} ${o}`).join("\n"))
      .setFooter({ text: `Poll by ${interaction.user.username} • GemTide` }).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    const realMsg = await interaction.fetchReply();
    for (let i = 0; i < opts.length; i++) await realMsg.react(numEmoji[i]).catch(() => {});

  // ── /remind ──────────────────────────────────────────────────────────────────
  } else if (commandName === "remind") {
    const minutes = interaction.options.getInteger("minutes");
    const message = interaction.options.getString("message");
    await interaction.editReply(`✅ I'll DM you in **${minutes}** minute${minutes !== 1 ? "s" : ""}!`);
    setTimeout(async () => {
      try {
        await interaction.user.send({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle("⏰ Reminder!")
          .setDescription(message).setFooter({ text: `Set ${minutes}m ago • GemTide` }).setTimestamp()] });
      } catch {}
    }, minutes * 60 * 1000);

  // ── /calc ────────────────────────────────────────────────────────────────────
  } else if (commandName === "calc") {
    const expr = interaction.options.getString("expression");
    try {
      const safe = expr.replace(/[^0-9+\-*/.() %]/g, "");
      if (!safe) return interaction.editReply("❌ Invalid expression.");
      const result = Function('"use strict"; return (' + safe + ')')();
      if (!isFinite(result)) return interaction.editReply("❌ Result is not a finite number.");
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle("🧮 Calculator")
        .addFields({ name: "Expression", value: `\`${safe}\`` }, { name: "Result", value: `\`${result}\`` })
        .setFooter({ text: "GemTide" })] });
    } catch { interaction.editReply("❌ Could not evaluate that expression."); }

  // ── /say ─────────────────────────────────────────────────────────────────────
  } else if (commandName === "say") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const message = interaction.options.getString("message");
    const target  = interaction.options.getChannel("channel") || interaction.channel;
    try { await target.send(message); await interaction.editReply(`✅ Message sent to ${target}.`);
    } catch (e) { interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /giveaway ────────────────────────────────────────────────────────────────
  } else if (commandName === "giveaway") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const sub = interaction.options.getSubcommand();
    if (sub === "start") {
      try {
        const prize = interaction.options.getString("prize");
        const durationMins = interaction.options.getInteger("duration");
        const winnersCount = interaction.options.getInteger("winners") || 1;
        const targetCh = interaction.options.getChannel("channel") || interaction.channel;
        const gwId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const endTime = Date.now() + durationMins * 60 * 1000;
        const enterRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`giveaway_enter_${gwId}`).setLabel("Enter Giveaway").setEmoji("🎉").setStyle(ButtonStyle.Success)
        );
        const gwMsg = await targetCh.send({ embeds: [buildGiveawayEmbed(prize, endTime, winnersCount, 0)], components: [enterRow] });
        const timer = setTimeout(() => endGiveaway(gwId), durationMins * 60 * 1000);
        activeGiveaways.set(gwId, { prize, winnersCount, endTime, entrants: new Set(), timer, channelId: targetCh.id, messageId: gwMsg.id });
        await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0xf59e0b).setTitle("✅ Giveaway Started")
          .addFields(
            { name: "Prize",    value: prize,                     inline: true },
            { name: "Duration", value: `${durationMins} minutes`, inline: true },
            { name: "Winners",  value: String(winnersCount),       inline: true },
            { name: "Channel",  value: targetCh.toString(),        inline: true },
            { name: "ID",       value: `\`${gwId}\``,             inline: false }
          ).setFooter({ text: "GemTide Giveaways" }))] });
      } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }
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
      } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }
    } else if (sub === "list") {
      if (!activeGiveaways.size) return interaction.editReply("No active giveaways right now.");
      const lines = [...activeGiveaways.entries()].map(([id, gw]) =>
        `• **${gw.prize}** — ends <t:${Math.floor(gw.endTime / 1000)}:R> — ${gw.entrants.size} entries (\`${id}\`)`
      );
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setTitle("🎉 Active Giveaways")
        .setDescription(lines.join("\n")).setFooter({ text: "GemTide" })] });
    }

  // ── /ban ─────────────────────────────────────────────────────────────────────
  } else if (commandName === "ban") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "No reason provided";
      const user   = await users.findOne({ discordid: target.id });
      if (!user) return interaction.editReply(`❌ No linked GemTide account for **${target.username}**.`);
      if (user.banned) return interaction.editReply(`⚠️ **${user.username}** is already banned.`);
      await users.updateOne({ _id: user._id }, { $set: { banned: true } });
      logger.logEvent({ type: "🔨 User Banned", color: 0xff0000,
        description: `**${user.username}** banned by **${interaction.user.username}**. Reason: ${reason}`,
        fields: [{ name: "Discord", value: `<@${target.id}>`, inline: true },
                 { name: "Roblox ID", value: String(user.userid), inline: true }],
        thumbnail: user.thumbnail });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0xff0000).setTitle("🔨 User Banned")
        .addFields({ name: "User", value: `${user.username} (<@${target.id}>)`, inline: true },
                   { name: "Roblox ID", value: String(user.userid), inline: true },
                   { name: "Reason", value: reason, inline: false })
        .setThumbnail(user.thumbnail || null).setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /unban ───────────────────────────────────────────────────────────────────
  } else if (commandName === "unban") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target = interaction.options.getUser("user");
      const user   = await users.findOne({ discordid: target.id });
      if (!user)        return interaction.editReply(`❌ No linked GemTide account for **${target.username}**.`);
      if (!user.banned) return interaction.editReply(`⚠️ **${user.username}** is not banned.`);
      await users.updateOne({ _id: user._id }, { $set: { banned: false } });
      logger.logEvent({ type: "✅ User Unbanned", color: 0x4ade80,
        description: `**${user.username}** unbanned by **${interaction.user.username}**.`, thumbnail: user.thumbnail });
      await interaction.editReply(`✅ Unbanned **${user.username}**.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /banid ───────────────────────────────────────────────────────────────────
  } else if (commandName === "banid") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      const reason   = interaction.options.getString("reason") || "No reason";
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      if (user.banned) return interaction.editReply(`⚠️ **${user.username}** is already banned.`);
      await users.updateOne({ userid: robloxId }, { $set: { banned: true } });
      logger.logEvent({ type: "🔨 Banned (by ID)", color: 0xff0000,
        description: `**${user.username}** (${robloxId}) banned by **${interaction.user.username}**. ${reason}` });
      await interaction.editReply(`✅ Banned **${user.username}** (Roblox ID: ${robloxId}).`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /unbanid ─────────────────────────────────────────────────────────────────
  } else if (commandName === "unbanid") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user)        return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      if (!user.banned) return interaction.editReply(`⚠️ **${user.username}** is not banned.`);
      await users.updateOne({ userid: robloxId }, { $set: { banned: false } });
      await interaction.editReply(`✅ Unbanned **${user.username}** (Roblox ID: ${robloxId}).`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /listbanned ──────────────────────────────────────────────────────────────
  } else if (commandName === "listbanned") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const page = Math.max(1, interaction.options.getInteger("page") || 1), perPage = 15;
      const total = await users.countDocuments({ banned: true });
      if (!total) return interaction.editReply("✅ No banned users.");
      const banned = await users.find({ banned: true }).skip((page - 1) * perPage).limit(perPage).lean();
      const totalPages = Math.ceil(total / perPage);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0xff0000)
        .setTitle(`🔨 Banned Users (${total} total)`)
        .setDescription(banned.map((u, i) => `**${(page-1)*perPage+i+1}.** ${u.username} \`${u.userid}\``).join("\n"))
        .setFooter({ text: `Page ${page}/${totalPages} • GemTide` }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /userinfo ────────────────────────────────────────────────────────────────
  } else if (commandName === "userinfo") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target = interaction.options.getUser("user");
      const user   = await users.findOne({ discordid: target.id });
      if (!user) return interaction.editReply(`❌ No linked GemTide account for **${target.username}**.`);
      const [pendingW, invCount] = await Promise.all([
        withdraws.countDocuments({ userid: user.userid }),
        inventorys.countDocuments({ owner: user.userid, locked: false }),
      ]);
      const profit = (user.won || 0) - (user.lost || 0);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(user.banned ? 0xff0000 : 0x8b5cf6)
        .setTitle(`🔍 ${user.username}${user.banned ? " 🔨 [BANNED]" : ""}`)
        .setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "Roblox ID",  value: String(user.userid),  inline: true },
          { name: "Discord",    value: `<@${target.id}>`,    inline: true },
          { name: "⭐ Level",   value: String(user.level || 0), inline: true },
          { name: "💰 Balance", value: `R$${fmt(user.balance)}`, inline: true },
          { name: "📈 Wagered", value: `R$${fmt(user.wager)}`,   inline: true },
          { name: "📊 Profit",  value: `R$${fmt(profit)}`,        inline: true },
          { name: "✅ Won",     value: `R$${fmt(user.won)}`,      inline: true },
          { name: "❌ Lost",    value: `R$${fmt(user.lost)}`,     inline: true },
          { name: "🎒 Inventory", value: String(invCount),        inline: true },
          { name: "📤 Withdrawals", value: String(pendingW),      inline: true },
          { name: "Status",     value: user.banned ? "🔨 Banned" : "✅ Active", inline: true }
        ).setFooter({ text: "GemTide Admin" }).setTimestamp())] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /userinfobyid ────────────────────────────────────────────────────────────
  } else if (commandName === "userinfobyid") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      const [pendingW, invCount] = await Promise.all([
        withdraws.countDocuments({ userid: user.userid }),
        inventorys.countDocuments({ owner: user.userid, locked: false }),
      ]);
      const profit = (user.won || 0) - (user.lost || 0);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder()
        .setColor(user.banned ? 0xff0000 : 0x8b5cf6)
        .setTitle(`🔍 ${user.username}${user.banned ? " 🔨 [BANNED]" : ""}`)
        .setThumbnail(user.thumbnail || null)
        .addFields(
          { name: "Roblox ID",  value: String(user.userid),  inline: true },
          { name: "Discord",    value: user.discordid ? `<@${user.discordid}>` : "Not linked", inline: true },
          { name: "⭐ Level",   value: String(user.level || 0), inline: true },
          { name: "💰 Balance", value: `R$${fmt(user.balance)}`, inline: true },
          { name: "📈 Wagered", value: `R$${fmt(user.wager)}`,   inline: true },
          { name: "📊 Profit",  value: `R$${fmt(profit)}`,        inline: true },
          { name: "✅ Won",     value: `R$${fmt(user.won)}`,      inline: true },
          { name: "❌ Lost",    value: `R$${fmt(user.lost)}`,     inline: true },
          { name: "🎒 Inventory", value: String(invCount),        inline: true },
          { name: "📤 Withdrawals", value: String(pendingW),      inline: true },
          { name: "Status",     value: user.banned ? "🔨 Banned" : "✅ Active", inline: true }
        ).setFooter({ text: "GemTide Admin" }).setTimestamp())] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /finduser ────────────────────────────────────────────────────────────────
  } else if (commandName === "finduser") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const query = interaction.options.getString("query");
      const re = new RegExp(escapeRegex(query), "i");
      const found = await users.find({ username: { $regex: re } }).limit(10).lean();
      if (!found.length) return interaction.editReply(`❌ No users matching **${query}**.`);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6)
        .setTitle(`🔍 Users matching "${query}"`)
        .setDescription(found.map((u) => `**${u.username}** \`${u.userid}\` — R$${fmt(u.balance)} ${u.banned ? "🔨" : ""}`).join("\n"))
        .setFooter({ text: "GemTide Admin" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /addbalance ──────────────────────────────────────────────────────────────
  } else if (commandName === "addbalance") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      const amount   = interaction.options.getInteger("amount");
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      const newBalance = Math.max(0, (user.balance || 0) + amount);
      await users.updateOne({ userid: robloxId }, { $set: { balance: newBalance } });
      logger.logEvent({ type: amount >= 0 ? "💸 Balance Added" : "💸 Balance Removed", color: amount >= 0 ? 0x4ade80 : 0xff6b6b,
        description: `**${user.username}** balance ${amount >= 0 ? "+" : ""}${amount} by ${interaction.user.username}.` });
      await interaction.editReply(`✅ **${user.username}**: R$${fmt(user.balance)} → R$${fmt(newBalance)} (${amount >= 0 ? "+" : ""}${fmt(Math.abs(amount))})`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /setbalance ──────────────────────────────────────────────────────────────
  } else if (commandName === "setbalance") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId  = Number(interaction.options.getString("roblox_id"));
      const newAmount = interaction.options.getInteger("amount");
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      await users.updateOne({ userid: robloxId }, { $set: { balance: newAmount } });
      logger.logEvent({ type: "⚙️ Balance Set", color: 0x8b5cf6,
        description: `**${user.username}** balance set to R$${fmt(newAmount)} by ${interaction.user.username}.` });
      await interaction.editReply(`✅ **${user.username}**: balance set to R$${fmt(newAmount)}.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /addwager ────────────────────────────────────────────────────────────────
  } else if (commandName === "addwager") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      const amount   = interaction.options.getInteger("amount");
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      await users.updateOne({ userid: robloxId }, { $inc: { wager: amount } });
      await interaction.editReply(`✅ Added R$${fmt(amount)} wager to **${user.username}**. New total: R$${fmt((user.wager || 0) + amount)}`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /setlevel ────────────────────────────────────────────────────────────────
  } else if (commandName === "setlevel") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      const level    = interaction.options.getInteger("level");
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      await users.updateOne({ userid: robloxId }, { $set: { level } });
      await interaction.editReply(`✅ Set **${user.username}**'s level to **${level}**.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /resetstats ──────────────────────────────────────────────────────────────
  } else if (commandName === "resetstats") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      await users.updateOne({ userid: robloxId }, { $set: { won: 0, lost: 0, wager: 0 } });
      logger.logEvent({ type: "🔄 Stats Reset", color: 0xfbbf24,
        description: `**${user.username}** stats reset by **${interaction.user.username}**.` });
      await interaction.editReply(`✅ Reset won/lost/wager to 0 for **${user.username}**.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /transferbalance ─────────────────────────────────────────────────────────
  } else if (commandName === "transferbalance") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const fromId = Number(interaction.options.getString("from_id"));
      const toId   = Number(interaction.options.getString("to_id"));
      const amount = interaction.options.getInteger("amount");
      if (!fromId || !toId) return interaction.editReply("❌ Invalid Roblox ID(s).");
      const [fromUser, toUser] = await Promise.all([users.findOne({ userid: fromId }), users.findOne({ userid: toId })]);
      if (!fromUser) return interaction.editReply(`❌ No account for **${fromId}**.`);
      if (!toUser)   return interaction.editReply(`❌ No account for **${toId}**.`);
      if ((fromUser.balance || 0) < amount) return interaction.editReply(`❌ **${fromUser.username}** only has R$${fmt(fromUser.balance)}.`);
      await Promise.all([
        users.updateOne({ userid: fromId }, { $inc: { balance: -amount } }),
        users.updateOne({ userid: toId },   { $inc: { balance: amount  } }),
      ]);
      logger.logEvent({ type: "💸 Balance Transferred", color: 0x8b5cf6,
        description: `R$${fmt(amount)} from **${fromUser.username}** → **${toUser.username}** by ${interaction.user.username}.` });
      await interaction.editReply(`✅ Transferred R$${fmt(amount)}: **${fromUser.username}** → **${toUser.username}**.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /give ────────────────────────────────────────────────────────────────────
  } else if (commandName === "give") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      const itemName = interaction.options.getString("item_name");
      const qty      = interaction.options.getInteger("quantity") || 1;
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for Roblox ID **${robloxId}**.`);
      const item = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(itemName) + "$", "i") } });
      if (!item) return interaction.editReply(`❌ Item **${itemName}** not found.`);
      const toInsert = Array.from({ length: qty }, () => ({ itemid: item.itemid, owner: robloxId, locked: false }));
      await inventorys.insertMany(toInsert);
      logger.logEvent({ type: "🎁 Item Given", color: 0x4ade80,
        description: `**${user.username}** received **${qty}x ${item.itemname}** from ${interaction.user.username}.`,
        thumbnail: user.thumbnail });
      await interaction.editReply(`✅ Gave **${qty}x ${item.itemname}** (R$${fmt((item.itemvalue || 0) * qty)} total) to **${user.username}**.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /clearwithdrawals ────────────────────────────────────────────────────────
  } else if (commandName === "clearwithdrawals") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target = interaction.options.getUser("user");
      const user   = await users.findOne({ discordid: target.id });
      if (!user) return interaction.editReply(`❌ No linked account for **${target.username}**.`);
      const count = await withdraws.countDocuments({ userid: user.userid });
      if (!count) return interaction.editReply(`✅ **${user.username}** has no pending withdrawals.`);
      await withdraws.deleteMany({ userid: user.userid });
      logger.logEvent({ type: "🗑️ Withdrawals Cleared", color: 0xff6b6b,
        description: `**${interaction.user.username}** cleared ${count} withdrawal(s) for **${user.username}**.` });
      await interaction.editReply(`✅ Cleared **${count}** withdrawal(s) for **${user.username}**.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /clearwithdrawalsbyid ────────────────────────────────────────────────────
  } else if (commandName === "clearwithdrawalsbyid") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for **${robloxId}**.`);
      const count = await withdraws.countDocuments({ userid: robloxId });
      if (!count) return interaction.editReply(`✅ **${user.username}** has no pending withdrawals.`);
      await withdraws.deleteMany({ userid: robloxId });
      await interaction.editReply(`✅ Cleared **${count}** withdrawal(s) for **${user.username}**.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /pendingwithdrawals ──────────────────────────────────────────────────────
  } else if (commandName === "pendingwithdrawals") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const page = Math.max(1, interaction.options.getInteger("page") || 1), perPage = 15;
      const total = await withdraws.countDocuments();
      if (!total) return interaction.editReply("✅ No pending withdrawals site-wide.");
      const totalPages = Math.ceil(total / perPage);
      const pending = await withdraws.find({}).skip((page - 1) * perPage).limit(perPage).lean();
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0xfbbf24)
        .setTitle(`📤 All Pending Withdrawals (${total} total)`)
        .setDescription(pending.map((w) => `• \`${w.userid}\` — **${w.itemname || w.itemid}**`).join("\n"))
        .setFooter({ text: `Page ${page}/${totalPages} • GemTide Admin` }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /addwithdrawal ───────────────────────────────────────────────────────────
  } else if (commandName === "addwithdrawal") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      const itemName = interaction.options.getString("item_name");
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for **${robloxId}**.`);
      const item = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(itemName) + "$", "i") } });
      if (!item) return interaction.editReply(`❌ Item **${itemName}** not found.`);
      await withdraws.create({ userid: robloxId, itemid: String(item.itemid), itemname: item.itemname });
      await interaction.editReply(`✅ Added **${item.itemname}** to **${user.username}**'s withdrawal queue.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /withdrawstats ───────────────────────────────────────────────────────────
  } else if (commandName === "withdrawstats") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const total = await withdraws.countDocuments();
      const agg   = await withdraws.aggregate([{ $group: { _id: "$itemname", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]);
      const top = agg.map((a) => `• **${a._id}** — ${a.count}x`).join("\n") || "None";
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6)
        .setTitle("📤 Withdrawal Statistics")
        .addFields({ name: "Total Pending", value: String(total), inline: true },
                   { name: "Top 5 Items Pending", value: top, inline: false })
        .setFooter({ text: "GemTide Admin" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /inventoryof ─────────────────────────────────────────────────────────────
  } else if (commandName === "inventoryof") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      const page = Math.max(1, interaction.options.getInteger("page") || 1), perPage = 10;
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user  = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for **${robloxId}**.`);
      const total = await inventorys.countDocuments({ owner: robloxId, locked: false });
      if (!total) return interaction.editReply(`🎒 **${user.username}** has an empty inventory.`);
      const totalPages = Math.ceil(total / perPage);
      const rawItems = await inventorys.find({ owner: robloxId, locked: false }).skip((page - 1) * perPage).limit(perPage).lean();
      const itemIds  = rawItems.map((i) => Number(i.itemid)).filter(Boolean);
      const itemDocs = itemIds.length ? await items.find({ itemid: { $in: itemIds } }).lean() : [];
      const itemMap  = {};
      itemDocs.forEach((d) => { itemMap[d.itemid] = d; });
      const lines = rawItems.map((inv) => {
        const doc = itemMap[Number(inv.itemid)];
        return doc ? `• **${doc.itemname}** — R$${fmt(doc.itemvalue)}` : `• Item \`${inv.itemid}\``;
      });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6)
        .setTitle(`🎒 ${user.username}'s Inventory (${total} items)`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: `Page ${page}/${totalPages} • GemTide Admin` }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /clearinventory ──────────────────────────────────────────────────────────
  } else if (commandName === "clearinventory") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for **${robloxId}**.`);
      const { deletedCount } = await inventorys.deleteMany({ owner: robloxId, locked: false });
      logger.logEvent({ type: "🗑️ Inventory Cleared", color: 0xff6b6b,
        description: `**${user.username}** inventory cleared (${deletedCount} items) by **${interaction.user.username}**.` });
      await interaction.editReply(`✅ Cleared **${deletedCount}** item(s) from **${user.username}**'s inventory.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /removeitem ──────────────────────────────────────────────────────────────
  } else if (commandName === "removeitem") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const robloxId = Number(interaction.options.getString("roblox_id"));
      const itemName = interaction.options.getString("item_name");
      if (!robloxId || isNaN(robloxId)) return interaction.editReply("❌ Invalid Roblox ID.");
      const user = await users.findOne({ userid: robloxId });
      if (!user) return interaction.editReply(`❌ No account for **${robloxId}**.`);
      const item = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(itemName) + "$", "i") } });
      if (!item) return interaction.editReply(`❌ Item **${itemName}** not found.`);
      const found = await inventorys.findOne({ owner: robloxId, itemid: String(item.itemid), locked: false });
      if (!found) return interaction.editReply(`❌ **${user.username}** doesn't have **${item.itemname}**.`);
      await inventorys.deleteOne({ _id: found._id });
      await interaction.editReply(`✅ Removed one **${item.itemname}** from **${user.username}**'s inventory.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /searchinventory ─────────────────────────────────────────────────────────
  } else if (commandName === "searchinventory") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const itemName = interaction.options.getString("item_name");
      const item = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(itemName) + "$", "i") } });
      if (!item) return interaction.editReply(`❌ Item **${itemName}** not found.`);
      const holdings = await inventorys.find({ itemid: String(item.itemid), locked: false }).lean();
      if (!holdings.length) return interaction.editReply(`No one currently holds **${item.itemname}**.`);
      const countByUser = {};
      holdings.forEach((h) => { countByUser[h.owner] = (countByUser[h.owner] || 0) + 1; });
      const ownerIds  = Object.keys(countByUser).map(Number);
      const ownerDocs = await users.find({ userid: { $in: ownerIds } }).lean();
      const ownerMap  = {};
      ownerDocs.forEach((u) => { ownerMap[u.userid] = u.username; });
      const lines = Object.entries(countByUser).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([id, c]) => `• **${ownerMap[Number(id)] || id}** — ${c}x`);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6)
        .setTitle(`🔍 Who holds "${item.itemname}"?`)
        .setDescription(lines.join("\n"))
        .addFields({ name: "In Circulation", value: String(holdings.length), inline: true },
                   { name: "Value Each", value: `R$${fmt(item.itemvalue)}`, inline: true })
        .setFooter({ text: "GemTide Admin" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /givemass ────────────────────────────────────────────────────────────────
  } else if (commandName === "givemass") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const itemName = interaction.options.getString("item_name");
      const qty      = interaction.options.getInteger("quantity") || 1;
      const item = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(itemName) + "$", "i") } });
      if (!item) return interaction.editReply(`❌ Item **${itemName}** not found.`);
      const allUsers = await users.find({}).lean();
      if (!allUsers.length) return interaction.editReply("No users found.");
      const docs = [];
      for (const u of allUsers) {
        for (let i = 0; i < qty; i++) docs.push({ itemid: item.itemid, owner: u.userid, locked: false });
      }
      await inventorys.insertMany(docs, { ordered: false }).catch(() => {});
      logger.logEvent({ type: "🎁 Mass Give", color: 0x4ade80,
        description: `**${qty}x ${item.itemname}** given to **${allUsers.length}** users by **${interaction.user.username}**.` });
      await interaction.editReply(`✅ Gave **${qty}x ${item.itemname}** to **${allUsers.length}** users (${docs.length} items total).`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /iteminfo ────────────────────────────────────────────────────────────────
  } else if (commandName === "iteminfo") {
    try {
      const name = interaction.options.getString("name");
      const item = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(name) + "$", "i") } });
      if (!item) {
        const partial = await items.find({ itemname: { $regex: new RegExp(escapeRegex(name), "i") } }).limit(5).lean();
        if (!partial.length) return interaction.editReply(`❌ No item matching **${name}**.`);
        return interaction.editReply(`❌ No exact match. Did you mean:\n${partial.map((i) => `• ${i.itemname}`).join("\n")}`);
      }
      const count = await inventorys.countDocuments({ itemid: String(item.itemid), locked: false });
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle(`📦 ${item.itemname}`)
        .setThumbnail(item.itemimage || null)
        .addFields(
          { name: "Item ID",        value: String(item.itemid),   inline: true },
          { name: "Value",          value: `R$${fmt(item.itemvalue)}`, inline: true },
          { name: "Game",           value: item.game || "N/A",    inline: true },
          { name: "In Circulation", value: String(count),         inline: true }
        ).setFooter({ text: "GemTide" })] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /itemlist ────────────────────────────────────────────────────────────────
  } else if (commandName === "itemlist") {
    try {
      const game = interaction.options.getString("game");
      const page = Math.max(1, interaction.options.getInteger("page") || 1), perPage = 10;
      const filter = game ? { game: { $regex: new RegExp(escapeRegex(game), "i") } } : {};
      const total = await items.countDocuments(filter);
      if (!total) return interaction.editReply(`No items found${game ? ` for **${game}**` : ""}.`);
      const totalPages = Math.ceil(total / perPage);
      const list = await items.find(filter).skip((page - 1) * perPage).limit(perPage).lean();
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6)
        .setTitle(`📦 Item List${game ? ` — ${game}` : ""}`)
        .setDescription(list.map((i) => `• **${i.itemname}** — R$${fmt(i.itemvalue)} *(${i.game || "?"})*`).join("\n"))
        .setFooter({ text: `Page ${page}/${totalPages} • ${total} items • GemTide` }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /createitem ──────────────────────────────────────────────────────────────
  } else if (commandName === "createitem") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const name  = interaction.options.getString("name");
      const value = interaction.options.getInteger("value");
      const game  = interaction.options.getString("game");
      const existing = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(name) + "$", "i") } });
      if (existing) return interaction.editReply(`❌ Item **${existing.itemname}** already exists.`);
      const maxItem = await items.findOne({}).sort({ itemid: -1 }).lean();
      const newId   = (maxItem?.itemid || 0) + 1;
      await items.create({ itemid: newId, itemname: name, itemvalue: value, game, itemimage: "" });
      logger.logEvent({ type: "📦 Item Created", color: 0x4ade80,
        description: `**${name}** (ID:${newId}, R$${fmt(value)}, ${game}) by **${interaction.user.username}**.` });
      await interaction.editReply(`✅ Created **${name}** (ID: ${newId}, R$${fmt(value)}, ${game}).`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /updateitemvalue ─────────────────────────────────────────────────────────
  } else if (commandName === "updateitemvalue") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const name  = interaction.options.getString("name");
      const value = interaction.options.getInteger("value");
      const item  = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(name) + "$", "i") } });
      if (!item) return interaction.editReply(`❌ Item **${name}** not found.`);
      const old = item.itemvalue;
      await items.updateOne({ _id: item._id }, { $set: { itemvalue: value } });
      logger.logEvent({ type: "✏️ Item Updated", color: 0x8b5cf6,
        description: `**${item.itemname}** R$${fmt(old)} → R$${fmt(value)} by **${interaction.user.username}**.` });
      await interaction.editReply(`✅ **${item.itemname}**: R$${fmt(old)} → R$${fmt(value)}.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /deleteitem ──────────────────────────────────────────────────────────────
  } else if (commandName === "deleteitem") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const name = interaction.options.getString("name");
      const item = await items.findOne({ itemname: { $regex: new RegExp("^" + escapeRegex(name) + "$", "i") } });
      if (!item) return interaction.editReply(`❌ Item **${name}** not found.`);
      await items.deleteOne({ _id: item._id });
      logger.logEvent({ type: "🗑️ Item Deleted", color: 0xff6b6b,
        description: `**${item.itemname}** deleted by **${interaction.user.username}**.` });
      await interaction.editReply(`🗑️ Deleted **${item.itemname}** (ID: ${item.itemid}).`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /create ──────────────────────────────────────────────────────────────────
  } else if (commandName === "create") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const name = interaction.options.getString("name"), pfp = interaction.options.getString("pfp");
      const userid = interaction.options.getInteger("userid"), game = interaction.options.getString("game");
      const link = interaction.options.getString("link") || "";
      if (await bots.findOne({ userid })) return interaction.editReply(`❌ Bot **${userid}** already exists.`);
      const newBot = await bots.create({ name, pfp, userid, game, link, online: true, showJoin: true, showProfile: true, showId: false });
      logger.logEvent({ type: "🤖 Bot Created", color: 0x4ade80,
        description: `**${name}** (${game}) created by **${interaction.user.username}**.`, thumbnail: pfp });
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x4ade80).setTitle("✅ Bot Created")
        .setThumbnail(pfp)
        .addFields({ name: "Name", value: name, inline: true }, { name: "Game", value: game, inline: true },
                   { name: "Roblox ID", value: String(userid), inline: true }, { name: "DB ID", value: String(newBot._id), inline: false })
        .setFooter({ text: "GemTide" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /toggle ──────────────────────────────────────────────────────────────────
  } else if (commandName === "toggle") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const sub = interaction.options.getSubcommand();
    if (sub === "list") {
      try {
        const all = await bots.find({});
        if (!all.length) return interaction.editReply("No bots registered.");
        await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle("Registered Bots")
          .setDescription(all.map((b) => `**${b.name}** (\`${b._id}\`) — ${b.online ? "🟢" : "🔴"} | ${b.game}`).join("\n"))
          .setFooter({ text: "GemTide" }))] });
      } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }
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
      } catch (e) { console.error(e); interaction.editReply("Invalid bot ID."); }
    } else if (sub === "delete") {
      try {
        const bot = await bots.findByIdAndDelete(interaction.options.getString("botid"));
        if (!bot) return interaction.editReply("Bot not found.");
        await interaction.editReply(`🗑️ Bot **${bot.name}** deleted.`);
      } catch (e) { console.error(e); interaction.editReply("Invalid bot ID."); }
    } else if (sub === "cancelwithdraws") {
      const action = interaction.options.getString("action");
      settings.cancelWithdrawsEnabled = action === "enable";
      logger.logEvent({ type: "⚙️ Setting Changed", color: settings.cancelWithdrawsEnabled ? 0x4ade80 : 0xff6b6b,
        description: `**${interaction.user.username}** ${action}d cancel-withdraws.` });
      await interaction.editReply(`Cancel Withdrawals is now **${settings.cancelWithdrawsEnabled ? "✅ Enabled" : "❌ Disabled"}**.`);
    }

  // ── /botstatus ───────────────────────────────────────────────────────────────
  } else if (commandName === "botstatus") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const all = await bots.find({}).lean();
      if (!all.length) return interaction.editReply("No bots registered.");
      const online  = all.filter((b) => b.online);
      const offline = all.filter((b) => !b.online);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle("🤖 Bot Status")
        .addFields(
          { name: `🟢 Online (${online.length})`,   value: online.length  ? online.map((b)  => `• **${b.name}** — ${b.game}`).join("\n") : "None", inline: false },
          { name: `🔴 Offline (${offline.length})`,  value: offline.length ? offline.map((b) => `• **${b.name}** — ${b.game}`).join("\n") : "None", inline: false }
        ).setFooter({ text: "GemTide Admin" }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /editbot ─────────────────────────────────────────────────────────────────
  } else if (commandName === "editbot") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const botId = interaction.options.getString("botid");
      const field = interaction.options.getString("field");
      const value = interaction.options.getString("value");
      const bot = await bots.findByIdAndUpdate(botId, { $set: { [field]: value } }, { new: true });
      if (!bot) return interaction.editReply("❌ Bot not found.");
      await interaction.editReply(`✅ Updated **${bot.name}**'s \`${field}\` to \`${value}\`.`);
    } catch (e) { console.error(e); interaction.editReply("Invalid bot ID."); }

  // ── /announce ────────────────────────────────────────────────────────────────
  } else if (commandName === "announce") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const message = interaction.options.getString("message");
      const target  = interaction.options.getChannel("channel") || interaction.channel;
      await target.send({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle("📢 GemTide Announcement")
        .setDescription(message).setFooter({ text: `Announced by ${interaction.user.username} • GemTide` }).setTimestamp())] });
      await interaction.editReply(`✅ Announcement sent to ${target}.`);
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /listalllinked ───────────────────────────────────────────────────────────
  } else if (commandName === "listalllinked") {
    if (!OWNER_DISCORD_ID || interaction.user.id !== OWNER_DISCORD_ID)
      return interaction.editReply({ content: "❌ Owner only.", ephemeral: true });
    try {
      const page = Math.max(1, interaction.options.getInteger("page") || 1), perPage = 15;
      const filter = { discordid: { $exists: true, $nin: [null, ""] } };
      const [linked, total] = await Promise.all([users.find(filter).skip((page - 1) * perPage).limit(perPage), users.countDocuments(filter)]);
      if (!linked.length) return interaction.editReply("No linked accounts found.");
      const totalPages = Math.ceil(total / perPage);
      await interaction.editReply({ embeds: [applyBanner(new EmbedBuilder().setColor(0x8b5cf6)
        .setTitle(`🔗 Linked Accounts (${total} total)`)
        .setDescription(linked.map((u, i) => `**${(page-1)*perPage+i+1}.** ${u.username} ↔ @${u.discordusername || "?"}`).join("\n"))
        .setFooter({ text: `Page ${page}/${totalPages} • GemTide` }))] });
    } catch (e) { console.error(e); interaction.editReply("Something went wrong."); }

  // ── /locktipping ─────────────────────────────────────────────────────────────
  } else if (commandName === "locktipping") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const action = interaction.options.getString("action");
    settings.tippingLocked = action === "disable";
    logger.logEvent({ type: "⚙️ Tipping Changed", color: settings.tippingLocked ? 0xff6b6b : 0x4ade80,
      description: `**${interaction.user.username}** ${settings.tippingLocked ? "locked" : "unlocked"} tipping.` });
    await interaction.editReply(`Tipping is now **${settings.tippingLocked ? "🔒 Locked" : "🔓 Unlocked"}**.`);

  // ── /kick ────────────────────────────────────────────────────────────────────
  } else if (commandName === "kick") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "No reason";
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.editReply(`❌ **${target.username}** is not in this server.`);
      await member.kick(reason);
      logger.logEvent({ type: "👢 Member Kicked", color: 0xff6b6b,
        description: `**${target.username}** kicked by **${interaction.user.username}**. Reason: ${reason}` });
      await interaction.editReply(`✅ Kicked **${target.username}**.`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /discordban ──────────────────────────────────────────────────────────────
  } else if (commandName === "discordban") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target     = interaction.options.getUser("user");
      const reason     = interaction.options.getString("reason") || "No reason";
      const deleteDays = interaction.options.getInteger("delete_days") || 0;
      await interaction.guild.members.ban(target.id, { reason, deleteMessageDays: deleteDays });
      logger.logEvent({ type: "🔨 Discord Ban", color: 0xff0000,
        description: `**${target.username}** Discord-banned by **${interaction.user.username}**. Reason: ${reason}` });
      await interaction.editReply(`✅ Discord-banned **${target.username}**.`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /timeout ─────────────────────────────────────────────────────────────────
  } else if (commandName === "timeout") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target  = interaction.options.getUser("user");
      const minutes = interaction.options.getInteger("minutes");
      const reason  = interaction.options.getString("reason") || "No reason";
      const member  = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.editReply(`❌ **${target.username}** is not in this server.`);
      await member.timeout(minutes * 60 * 1000, reason);
      await interaction.editReply(`✅ Timed out **${target.username}** for **${minutes}** minute${minutes !== 1 ? "s" : ""}.`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /untimeout ───────────────────────────────────────────────────────────────
  } else if (commandName === "untimeout") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target = interaction.options.getUser("user");
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.editReply(`❌ **${target.username}** is not in this server.`);
      await member.timeout(null);
      await interaction.editReply(`✅ Removed timeout from **${target.username}**.`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /warn ────────────────────────────────────────────────────────────────────
  } else if (commandName === "warn") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");
    if (!warnings.has(target.id)) warnings.set(target.id, []);
    warnings.get(target.id).push({ reason, by: interaction.user.username, ts: Date.now() });
    const count = warnings.get(target.id).length;
    logger.logEvent({ type: `⚠️ Warning #${count}`, color: 0xfbbf24,
      description: `**${target.username}** warned by **${interaction.user.username}**: ${reason}` });
    await interaction.editReply(`⚠️ **${target.username}** warned. *(Total: ${count})*\nReason: ${reason}`);

  // ── /warnings ────────────────────────────────────────────────────────────────
  } else if (commandName === "warnings") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const target = interaction.options.getUser("user");
    const list   = warnings.get(target.id) || [];
    if (!list.length) return interaction.editReply(`✅ **${target.username}** has no warnings.`);
    const lines = list.map((w, i) => `**#${i+1}** — ${w.reason} *(${w.by}, <t:${Math.floor(w.ts/1000)}:R>)*`);
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xfbbf24)
      .setTitle(`⚠️ Warnings for ${target.username}`)
      .setDescription(lines.join("\n")).setFooter({ text: "GemTide Moderation" })] });

  // ── /clearwarnings ───────────────────────────────────────────────────────────
  } else if (commandName === "clearwarnings") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    const target = interaction.options.getUser("user");
    const count  = (warnings.get(target.id) || []).length;
    warnings.delete(target.id);
    await interaction.editReply(`✅ Cleared **${count}** warning(s) for **${target.username}**.`);

  // ── /purge ───────────────────────────────────────────────────────────────────
  } else if (commandName === "purge") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const count   = interaction.options.getInteger("count");
      const deleted = await interaction.channel.bulkDelete(count, true);
      await interaction.editReply(`🗑️ Deleted **${deleted.size}** message(s).`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /slowmode ────────────────────────────────────────────────────────────────
  } else if (commandName === "slowmode") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const seconds = interaction.options.getInteger("seconds");
      const target  = interaction.options.getChannel("channel") || interaction.channel;
      await target.setRateLimitPerUser(seconds);
      await interaction.editReply(seconds === 0 ? `✅ Slowmode disabled in ${target}.` : `✅ Slowmode set to **${seconds}s** in ${target}.`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /lock ────────────────────────────────────────────────────────────────────
  } else if (commandName === "lock") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target = interaction.options.getChannel("channel") || interaction.channel;
      await target.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      await interaction.editReply(`🔒 Locked ${target} — members cannot send messages.`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /unlock ──────────────────────────────────────────────────────────────────
  } else if (commandName === "unlock") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target = interaction.options.getChannel("channel") || interaction.channel;
      await target.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      await interaction.editReply(`🔓 Unlocked ${target} — members can send messages again.`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }

  // ── /nick ────────────────────────────────────────────────────────────────────
  } else if (commandName === "nick") {
    if (!isOwner(interaction)) return interaction.editReply("❌ You don't have permission.");
    try {
      const target   = interaction.options.getUser("user");
      const nickname = interaction.options.getString("nickname") || null;
      const member   = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.editReply(`❌ **${target.username}** is not in this server.`);
      await member.setNickname(nickname);
      await interaction.editReply(nickname
        ? `✅ Set **${target.username}**'s nickname to **${nickname}**.`
        : `✅ Reset **${target.username}**'s nickname.`);
    } catch (e) { console.error(e); interaction.editReply(`❌ Failed: ${e.message}`); }
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
    if (existing) return interaction.editReply({ content: `❌ You already have an open ticket: ${existing}`, ephemeral: true });
    const ticketChannel = await guild.channels.create({
      name: safeName, type: ChannelType.GuildText, parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: client.user.id,       allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
      ],
    });
    const emojiKeyMap = {
      ticket_site_support: "siteSupport", ticket_scams: "scamReport",
      ticket_discord_support: "discordSupport", ticket_claim_gw: "claimGiveaway",
    };
    const labelMap = {
      ticket_site_support: "Site Support", ticket_scams: "Scams / Unfair Trades",
      ticket_discord_support: "Discord Support", ticket_claim_gw: "Claim DC GWs",
    };
    await ticketChannel.send({
      content: interaction.user.toString(),
      embeds: [applyTicketBanner(new EmbedBuilder().setColor(0x8b5cf6)
        .setTitle(`${ticketEmoji(emojiKeyMap[customId])} ${labelMap[customId]} Ticket`)
        .setDescription(`Hello ${interaction.user}! A staff member will be with you shortly.\n\n**Category:** ${categoryName}\n\nPlease describe your issue below.`)
        .setFooter({ text: "GemTide Support" }).setTimestamp())],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setEmoji(ticketEmojiButton("ticketClosed")).setStyle(ButtonStyle.Danger)
      )],
    });
    await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
  } catch (e) {
    console.error("Ticket creation error:", e.message);
    try { await interaction.editReply({ content: "Something went wrong.", ephemeral: true }); } catch {}
  }
}

async function handleTicketClose(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) && interaction.user.id !== OWNER_DISCORD_ID)
    return interaction.reply({ content: "❌ Only staff can close tickets.", ephemeral: true });
  try {
    await interaction.reply({ content: `${ticketEmoji("ticketClosed")} Closing in 5 seconds...` });
    setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000);
  } catch (e) { console.error("Ticket close error:", e.message); }
}

async function handleGiveawayEnter(interaction, giveawayId) {
  const gw = activeGiveaways.get(giveawayId);
  if (!gw) return interaction.reply({ content: "❌ This giveaway has ended.", ephemeral: true });
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
  const loginTimeout = setTimeout(() => { console.error("Bot login timed out after 30s."); }, 30000);
  client.once("ready", () => clearTimeout(loginTimeout));
  client.login(BOT_TOKEN).catch((err) => { clearTimeout(loginTimeout); console.error("Bot login failed:", err.message); });
} else {
  console.warn("No bot token set — paste it into HARD_CODED_BOT_TOKEN at the top of bot.js");
}
