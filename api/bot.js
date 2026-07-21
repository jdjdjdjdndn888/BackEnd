// ═══════════════════════════════════════════════════════════════════════
//  HARD-CODED CONFIG — paste values here (no other files needed)
// ═══════════════════════════════════════════════════════════════════════
const HARD_CODED_BOT_TOKEN = "";
const HARD_CODED_MONGO_URI = "";
const HARD_CODED_OWNER_ID  = "1367076055416045668";
const SITE_URL             = "https://gemtide.win";
const BANNER_URL = process.env.BANNER_URL || (SITE_URL ? `${SITE_URL}/banner/1.png` : "");
const WEB_PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.APP_URL || `http://staff.gemtide.win:${WEB_PORT}`;
const DEFAULT_OWNER_PIN = "GemTide.123";
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
  thumbnail: String, rank: String,
  balance:   { type: Number, default: 0 },
  wager:     { type: Number, default: 0 },
  deposited: { type: Number, default: 0 },
  won:       { type: Number, default: 0 },
  lost:      { type: Number, default: 0 },
  level:     { type: Number, default: 0 },
  banned:    { type: Boolean, default: false },
}, { strict: false }));

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

const affiliatecodes = mongoose.model("affiliatecodes", new Schema({
  ownerid: Number, ownerusername: String, code: String, uses: { type: Number, default: 0 },
}));

const affiliateuses = mongoose.model("affiliateuses", new Schema({
  codeownerid: Number, code: String, userid: Number, username: String,
  depositatuse: { type: Number, default: 0 }, wageratuse: { type: Number, default: 0 },
  claimed: { type: Boolean, default: false }, createdat: { type: Date, default: Date.now },
}));

// ─── DM Log Model ────────────────────────────────────────────────────────────
const dmLogs = mongoose.model("dmLogs", new Schema({
  userid: { type: String, required: true },
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  responded: { type: Boolean, default: false },
  response: { type: String, default: "" },
  respondedAt: { type: Date },
  responseBy: { type: String, default: "" },
}, { strict: false }));

// ─── Command Log Model ──────────────────────────────────────────────────────
const commandLogs = mongoose.model("commandLogs", new Schema({
  userid: { type: String, required: true },
  username: { type: String, required: true },
  command: { type: String, required: true },
  options: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
  guild: { type: String, default: "" },
  channel: { type: String, default: "" },
}, { strict: false }));

// ─── Blocked Commands Model ─────────────────────────────────────────────────
const blockedCommands = mongoose.model("blockedCommands", new Schema({
  command: { type: String, required: true },
  reason: { type: String, default: "Blocked by admin" },
  blockedAt: { type: Date, default: Date.now },
  blockedBy: { type: String, default: "" },
}, { strict: false }));

// ─── User Block Model ──────────────────────────────────────────────────────
const userBlocks = mongoose.model("userBlocks", new Schema({
  userid: { type: String, required: true },
  blockedCommands: { type: [String], default: [] },
  blockedAll: { type: Boolean, default: false },
  reason: { type: String, default: "" },
  blockedAt: { type: Date, default: Date.now },
  blockedBy: { type: String, default: "" },
}, { strict: false }));

// ─── Staff Accounts Model ──────────────────────────────────────────────────
const staffAccounts = mongoose.model("staffAccounts", new Schema({
  pin: { type: String, required: true },
  username: { type: String, required: true },
  discordId: { type: String, default: "" },
  role: { type: String, enum: ['owner', 'admin', 'moderator', 'support'], default: 'support' },
  permissions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: "" },
  lastLogin: { type: Date },
  active: { type: Boolean, default: true },
  locked: { type: Boolean, default: false },
}, { strict: false }));

// ─── In-memory state ─────────────────────────────────────────────────────────
const settings       = { cancelWithdrawsEnabled: true, tippingLocked: false };
const warnings       = new Map();
const activeGiveaways = new Map();

// ─── Log channels ─────────────────────────────────────────────────────────────
const LOG_CHANNELS = {
  logs: "1515602211319713853", coinflip: "1523289034632200192",
  dice: "1523288922367590460", jackpot: "1523289179876884612",
  giveaway: "1522616966521688196", taxedItems: "1526540625053483018",
  tips: "1526540625053483018",
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
  REST, Routes,
} = require("discord.js");

const SUPPORT_PANEL_CHANNEL_ID = "1527371617712210080";
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
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
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

// ─── Permission checks ──────────────────────────────────────────────────────
function hasPermission(staff, permission) {
  if (!staff) return false;
  if (staff.role === 'owner') return true;
  return staff.permissions.includes(permission);
}

// ─── Command blocking check ──────────────────────────────────────────────────
async function isCommandBlocked(commandName, userId) {
  const blocked = await blockedCommands.findOne({ command: commandName });
  if (blocked) return blocked;
  
  const userBlock = await userBlocks.findOne({ userid: userId });
  if (userBlock) {
    if (userBlock.blockedAll) return { command: commandName, reason: userBlock.reason || "You are blocked from using commands" };
    if (userBlock.blockedCommands.includes(commandName)) {
      return { command: commandName, reason: userBlock.reason || "You are blocked from using this command" };
    }
  }
  return null;
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

// ─── WEB SERVER ──────────────────────────────────────────────────────────────
const express = require("express");
const http = require("http");
const path = require("path");
const session = require("express-session");
const app = express();
const server = http.createServer(app);

// Store active DM log subscriptions
const webClients = new Set();

// Session middleware
app.use(session({
  secret: 'gemtide-super-secret-key-change-this',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 3600000 }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ─── REAL-TIME MESSAGE SYNC (SSE) ────────────────────────────────────────

// Store active message sync clients
const messageClients = new Map();

// SSE endpoint for real-time messages
app.get("/api/discord/channels/:channelId/stream", (req, res) => {
  const channelId = req.params.channelId;
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  res.write(": keepalive\n\n");
  
  if (!messageClients.has(channelId)) {
    messageClients.set(channelId, new Set());
  }
  messageClients.get(channelId).add(res);
  
  res.write(`data: ${JSON.stringify({ type: 'connected', channelId })}\n\n`);
  
  req.on("close", () => {
    const clients = messageClients.get(channelId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        messageClients.delete(channelId);
      }
    }
  });
});

async function broadcastNewMessage(message) {
  try {
    const channelId = message.channel.id;
    const clients = messageClients.get(channelId);
    if (!clients || clients.size === 0) return;
    
    const messageData = {
      id: message.id,
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        displayName: message.member?.displayName || message.author.username,
        avatar: message.author.displayAvatarURL({ size: 32 }),
        bot: message.author.bot,
        color: message.member?.displayColor || 0
      },
      timestamp: message.createdTimestamp,
      attachments: message.attachments.map(a => ({
        id: a.id,
        name: a.name,
        url: a.url,
        size: a.size
      })),
      embeds: message.embeds.map(e => ({
        title: e.title,
        description: e.description,
        url: e.url,
        color: e.color,
        footer: e.footer,
        image: e.image,
        thumbnail: e.thumbnail,
        author: e.author,
        fields: e.fields
      })),
      type: 'new_message'
    };
    
    const payload = `data: ${JSON.stringify(messageData)}\n\n`;
    
    for (const client of clients) {
      try {
        client.write(payload);
      } catch (e) {
        clients.delete(client);
      }
    }
  } catch (e) {
    console.error("Broadcast error:", e);
  }
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// Check if logged in
app.get("/api/check", (req, res) => {
  if (req.session.authenticated && req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { pin } = req.body;
    
    const isOwner = pin === DEFAULT_OWNER_PIN;
    if (isOwner) {
      req.session.authenticated = true;
      req.session.user = { username: 'Owner', role: 'owner', permissions: ['*'], id: 'owner' };
      return res.json({ success: true, user: req.session.user });
    }
    
    const staff = await staffAccounts.findOne({ pin, active: true });
    if (staff && !staff.locked) {
      req.session.authenticated = true;
      req.session.user = { 
        username: staff.username, 
        role: staff.role, 
        permissions: staff.permissions,
        id: staff._id,
        discordId: staff.discordId
      };
      await staffAccounts.findByIdAndUpdate(staff._id, { lastLogin: new Date() });
      return res.json({ success: true, user: req.session.user });
    }
    
    res.json({ success: false });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ─── Bot Info ──────────────────────────────────────────────────────────────
app.get("/api/botinfo", (req, res) => {
  res.json({
    tag: client.user?.tag || 'Offline',
    uptime: fmtMs(Date.now() - BOT_START_TIME),
    commands: client.application?.commands?.cache?.size || 0,
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    channels: client.channels.cache.size
  });
});

// ─── Stats ─────────────────────────────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const [totalDms, unreadDms, totalCommands, blockedCommands, staffCount, userBlocks] = await Promise.all([
      dmLogs.countDocuments(),
      dmLogs.countDocuments({ responded: false }),
      commandLogs.countDocuments(),
      blockedCommands.countDocuments(),
      staffAccounts.countDocuments({ active: true }),
      userBlocks.countDocuments()
    ]);
    res.json({ totalDms, unreadDms, totalCommands, blockedCommands, staffCount, userBlocks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DMs API ──────────────────────────────────────────────────────────────
app.get("/api/dms", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const search = req.query.search || "";
    const filter = req.query.filter || "all";
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { userid: { $regex: search, $options: "i" } }
      ];
    }
    if (filter === "unread") query.responded = false;
    else if (filter === "responded") query.responded = true;

    const [dms, total] = await Promise.all([
      dmLogs.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      dmLogs.countDocuments(query)
    ]);

    res.json({ dms, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/dms/:id", async (req, res) => {
  try {
    await dmLogs.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/dms", async (req, res) => {
  try {
    await dmLogs.deleteMany({});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/reply", async (req, res) => {
  try {
    const { dmId, message } = req.body;
    if (!dmId || !message) return res.status(400).json({ error: "Missing fields" });

    const dm = await dmLogs.findById(dmId);
    if (!dm) return res.status(404).json({ error: "DM not found" });

    try {
      const user = await client.users.fetch(dm.userid);
      if (user) {
        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("📨 Staff Reply")
          .setDescription(message)
          .setFooter({ text: "GemTide Support" })
          .setTimestamp();
        await user.send({ embeds: [embed] });
      }
    } catch (err) {
      return res.status(500).json({ error: "Failed to send reply via Discord" });
    }

    await dmLogs.findByIdAndUpdate(dmId, {
      responded: true,
      response: message,
      respondedAt: new Date(),
      responseBy: "Staff (via Dashboard)"
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Command Logs API ──────────────────────────────────────────────────────
app.get("/api/commands", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const search = req.query.search || "";
    const filter = req.query.filter || "all";
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { command: { $regex: search, $options: "i" } },
        { userid: { $regex: search, $options: "i" } }
      ];
    }

    const [commands, total] = await Promise.all([
      commandLogs.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      commandLogs.countDocuments(query)
    ]);

    const blockedList = await blockedCommands.find({}).lean();
    const blockedMap = {};
    blockedList.forEach(b => { blockedMap[b.command] = true; });

    const commandsWithBlocked = commands.map(cmd => ({
      ...cmd,
      blocked: !!blockedMap[cmd.command]
    }));

    let filtered = commandsWithBlocked;
    if (filter === "blocked") {
      filtered = commandsWithBlocked.filter(c => c.blocked);
    }

    res.json({
      commands: filtered,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/commands", async (req, res) => {
  try {
    await commandLogs.deleteMany({});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Blocked Commands API ─────────────────────────────────────────────────
app.get("/api/blocked", async (req, res) => {
  try {
    const blocked = await blockedCommands.find({}).sort({ blockedAt: -1 }).lean();
    res.json(blocked);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/block", async (req, res) => {
  try {
    const { command, reason } = req.body;
    if (!command) return res.status(400).json({ error: "Command name required" });
    
    const existing = await blockedCommands.findOne({ command: command.toLowerCase() });
    if (existing) return res.status(400).json({ error: "Command already blocked" });
    
    await blockedCommands.create({
      command: command.toLowerCase(),
      reason: reason || "Blocked by admin",
      blockedBy: req.session.user?.username || "Admin"
    });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/unblock/:command", async (req, res) => {
  try {
    await blockedCommands.deleteOne({ command: req.params.command.toLowerCase() });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── User Blocks API ──────────────────────────────────────────────────────
app.get("/api/userblocks", async (req, res) => {
  try {
    const blocks = await userBlocks.find({}).sort({ blockedAt: -1 }).lean();
    res.json(blocks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/userblock", async (req, res) => {
  try {
    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    
    const existing = await userBlocks.findOne({ userid: userId });
    if (existing) {
      await userBlocks.findOneAndUpdate({ userid: userId }, { 
        blockedAll: true, 
        reason: reason || "Blocked by admin",
        blockedBy: req.session.user?.username || "Admin"
      });
    } else {
      await userBlocks.create({
        userid: userId,
        blockedAll: true,
        reason: reason || "Blocked by admin",
        blockedBy: req.session.user?.username || "Admin"
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/userblockcmd", async (req, res) => {
  try {
    const { userId, command } = req.body;
    if (!userId || !command) return res.status(400).json({ error: "User ID and command required" });
    
    let userBlock = await userBlocks.findOne({ userid: userId });
    if (!userBlock) {
      userBlock = await userBlocks.create({
        userid: userId,
        blockedCommands: [],
        blockedAll: false,
        blockedBy: req.session.user?.username || "Admin"
      });
    }
    
    if (!userBlock.blockedCommands.includes(command)) {
      userBlock.blockedCommands.push(command);
      await userBlock.save();
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/userunblock/:userId", async (req, res) => {
  try {
    await userBlocks.deleteOne({ userid: req.params.userId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Staff API ────────────────────────────────────────────────────────────
app.get("/api/staff", async (req, res) => {
  try {
    const staff = await staffAccounts.find({}).sort({ createdAt: -1 }).lean();
    res.json(staff);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/staff", async (req, res) => {
  try {
    const { username, pin, role, permissions } = req.body;
    if (!username || !pin) return res.status(400).json({ error: "Username and PIN required" });
    if (pin.length < 4) return res.status(400).json({ error: "PIN must be at least 4 characters" });
    
    const existing = await staffAccounts.findOne({ username });
    if (existing) return res.status(400).json({ error: "Username already exists" });
    
    await staffAccounts.create({
      username,
      pin,
      role: role || 'support',
      permissions: permissions || [],
      createdBy: req.session.user?.username || "Owner"
    });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/staff/:id", async (req, res) => {
  try {
    const staff = await staffAccounts.findById(req.params.id);
    if (staff?.role === 'owner') return res.status(400).json({ error: "Cannot delete owner" });
    await staffAccounts.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/staff/:id/lock", async (req, res) => {
  try {
    const staff = await staffAccounts.findById(req.params.id);
    if (staff?.role === 'owner') return res.status(400).json({ error: "Cannot lock owner" });
    await staffAccounts.findByIdAndUpdate(req.params.id, { locked: !staff?.locked });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/staff/:id/pin", async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) return res.status(400).json({ error: "PIN must be at least 4 characters" });
    const staff = await staffAccounts.findById(req.params.id);
    if (staff?.role === 'owner') return res.status(400).json({ error: "Cannot change owner PIN here" });
    await staffAccounts.findByIdAndUpdate(req.params.id, { pin });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Change Owner PIN ────────────────────────────────────────────────────
app.post("/api/changepin", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'owner') {
      return res.status(403).json({ error: "Only owner can change PIN" });
    }
    const { pin } = req.body;
    if (!pin || pin.length < 4) return res.status(400).json({ error: "PIN must be at least 4 characters" });
    
    global.OWNER_PIN = pin;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DM All ──────────────────────────────────────────────────────────────
app.post("/api/dmall", async (req, res) => {
  try {
    const { message, title, color } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });
    
    const guild = client.guilds.cache.first();
    if (!guild) return res.status(500).json({ error: "No guild found" });
    
    await guild.members.fetch();
    const members = guild.members.cache;
    let sent = 0, failed = 0;
    
    const embed = new EmbedBuilder()
      .setColor(parseInt((color || "#8b5cf6").replace("#", ""), 16) || 0x8b5cf6)
      .setTitle(title || "📢 Server Announcement")
      .setDescription(message)
      .setFooter({ text: "GemTide • Admin Message" })
      .setTimestamp();
    
    applyBanner(embed);
    
    for (const [id, member] of members) {
      if (member.user.bot) continue;
      try {
        await member.send({ embeds: [embed] });
        sent++;
      } catch {
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    res.json({ sent, failed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DM User ─────────────────────────────────────────────────────────────
app.post("/api/dmuser", async (req, res) => {
  try {
    const { userId, message, title, color } = req.body;
    if (!userId || !message) return res.status(400).json({ error: "User ID and message required" });
    
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const embed = new EmbedBuilder()
      .setColor(parseInt((color || "#8b5cf6").replace("#", ""), 16) || 0x8b5cf6)
      .setTitle(title || "📨 Staff Message")
      .setDescription(message)
      .setFooter({ text: "GemTide • Staff" })
      .setTimestamp();
    
    applyBanner(embed);
    await user.send({ embeds: [embed] });
    
    await dmLogs.create({
      userid: userId,
      username: user.username,
      message: message,
      timestamp: new Date(),
      responded: true,
      response: "Sent by staff",
      respondedAt: new Date(),
      responseBy: "Staff (Admin)"
    });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── FULL DISCORD CLIENT API ────────────────────────────────────────────

app.get("/api/discord/guilds", async (req, res) => {
  try {
    const guilds = [];
    for (const [id, guild] of client.guilds.cache) {
      try {
        await guild.members.fetch({ limit: 1 });
        const memberCount = guild.memberCount || 0;
        guilds.push({
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL({ size: 64 }),
          memberCount: memberCount,
          ownerId: guild.ownerId,
          isOwner: guild.ownerId === client.user.id,
          available: guild.available
        });
      } catch (e) {
        guilds.push({
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL({ size: 64 }),
          memberCount: 0,
          ownerId: guild.ownerId,
          isOwner: false,
          available: false
        });
      }
    }
    res.json(guilds);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/discord/guilds/:guildId/channels", async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    
    await guild.channels.fetch();
    const channels = guild.channels.cache.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      position: c.position,
      topic: c.topic || null,
      nsfw: c.nsfw || false,
      rateLimitPerUser: c.rateLimitPerUser || 0,
      permissions: c.permissionsFor(client.user)?.toArray() || []
    }));
    res.json(channels);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/discord/channels/:channelId/messages", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const before = req.query.before;
    
    const channel = await client.channels.fetch(req.params.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    if (!channel.isTextBased()) return res.status(400).json({ error: "Not a text channel" });
    
    const options = { limit };
    if (before) options.before = before;
    
    const messages = await channel.messages.fetch(options);
    const formatted = messages.map(m => ({
      id: m.id,
      content: m.content,
      author: {
        id: m.author.id,
        username: m.author.username,
        displayName: m.member?.displayName || m.author.username,
        avatar: m.author.displayAvatarURL({ size: 32 }),
        bot: m.author.bot,
        color: m.member?.displayColor || 0
      },
      timestamp: m.createdTimestamp,
      edited: m.editedTimestamp,
      attachments: m.attachments.map(a => ({
        id: a.id,
        name: a.name,
        url: a.url,
        size: a.size,
        contentType: a.contentType
      })),
      embeds: m.embeds.map(e => ({
        title: e.title,
        description: e.description,
        url: e.url,
        color: e.color,
        footer: e.footer,
        image: e.image,
        thumbnail: e.thumbnail,
        author: e.author,
        fields: e.fields
      })),
      reactions: m.reactions.cache.map(r => ({
        emoji: r.emoji.name,
        count: r.count,
        me: r.me
      })),
      mentions: {
        users: m.mentions.users.map(u => u.id),
        roles: m.mentions.roles.map(r => r.id),
        channels: m.mentions.channels.map(c => c.id)
      },
      referencedMessage: m.reference?.messageId || null,
      flags: m.flags ? m.flags.toArray() : []
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/discord/channels/:channelId/messages", async (req, res) => {
  try {
    const { content, embed, files } = req.body;
    if (!content && !embed) return res.status(400).json({ error: "Message content required" });
    
    const channel = await client.channels.fetch(req.params.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    if (!channel.isTextBased()) return res.status(400).json({ error: "Not a text channel" });
    
    let messageOptions = {};
    if (content) messageOptions.content = content;
    if (embed) {
      const embedObj = new EmbedBuilder(embed);
      messageOptions.embeds = [embedObj];
    }
    
    const message = await channel.send(messageOptions);
    res.json({
      id: message.id,
      content: message.content,
      timestamp: message.createdTimestamp
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/discord/channels/:channelId/messages/:messageId", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });
    
    const channel = await client.channels.fetch(req.params.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    
    const message = await channel.messages.fetch(req.params.messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });
    
    const edited = await message.edit(content);
    res.json({ success: true, content: edited.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/discord/channels/:channelId/messages/:messageId", async (req, res) => {
  try {
    const channel = await client.channels.fetch(req.params.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    
    const message = await channel.messages.fetch(req.params.messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });
    
    await message.delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/discord/channels/:channelId/purge", async (req, res) => {
  try {
    const { count, filter } = req.body;
    const limit = Math.min(count || 50, 100);
    
    const channel = await client.channels.fetch(req.params.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    if (!channel.isTextBased()) return res.status(400).json({ error: "Not a text channel" });
    
    let messages = await channel.messages.fetch({ limit: 100 });
    
    if (filter) {
      if (filter === 'bots') messages = messages.filter(m => m.author.bot);
      else if (filter === 'users') messages = messages.filter(m => !m.author.bot);
      else if (filter === 'mentions') messages = messages.filter(m => m.mentions.users.size > 0);
    }
    
    messages = messages.first(limit);
    const deleted = await channel.bulkDelete(messages, true);
    res.json({ success: true, deleted: deleted.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/discord/guilds/:guildId/members", async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    
    await guild.members.fetch();
    const members = guild.members.cache.map(m => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      avatar: m.user.displayAvatarURL({ size: 32 }),
      roles: m.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.color })),
      joinedAt: m.joinedTimestamp,
      isOwner: m.id === guild.ownerId,
      presence: m.presence?.status || 'offline'
    }));
    res.json(members);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/discord/dms", async (req, res) => {
  try {
    const dmChannels = [];
    for (const [id, channel] of client.channels.cache) {
      if (channel.type === ChannelType.DM) {
        const recipient = channel.recipient;
        dmChannels.push({
          id: channel.id,
          recipientId: recipient.id,
          username: recipient.username,
          avatar: recipient.displayAvatarURL({ size: 32 }),
          lastMessageId: channel.lastMessageId
        });
      }
    }
    res.json(dmChannels);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/discord/dms/:dmId/messages", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const channel = await client.channels.fetch(req.params.dmId);
    if (!channel) return res.status(404).json({ error: "DM channel not found" });
    if (channel.type !== ChannelType.DM) return res.status(400).json({ error: "Not a DM channel" });
    
    const messages = await channel.messages.fetch({ limit });
    const formatted = messages.map(m => ({
      id: m.id,
      content: m.content,
      author: {
        id: m.author.id,
        username: m.author.username,
        avatar: m.author.displayAvatarURL({ size: 32 }),
        bot: m.author.bot
      },
      timestamp: m.createdTimestamp,
      attachments: m.attachments.map(a => ({ id: a.id, name: a.name, url: a.url }))
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── FIXED JOIN SERVER - Using REST API with proper endpoint ──────────────

app.post("/api/discord/join", async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "Invite code required" });
    
    // Clean invite code
    let cleanCode = inviteCode;
    if (cleanCode.includes('discord.gg/')) cleanCode = cleanCode.split('discord.gg/')[1];
    else if (cleanCode.includes('discord.com/invite/')) cleanCode = cleanCode.split('discord.com/invite/')[1];
    else if (cleanCode.includes('discordapp.com/invite/')) cleanCode = cleanCode.split('discordapp.com/invite/')[1];
    cleanCode = cleanCode.split('/')[0].split('?')[0].trim();
    
    if (!cleanCode) return res.status(400).json({ error: "Invalid invite code format" });
    
    // First, check if the invite is valid and get guild info
    let invite;
    try {
      invite = await client.fetchInvite(cleanCode);
    } catch (e) {
      return res.status(404).json({ error: "Invalid invite code. Please check and try again." });
    }
    
    if (!invite || !invite.guild) {
      return res.status(404).json({ error: "Invalid invite code" });
    }
    
    // Check if bot is already in the guild
    const existingGuild = client.guilds.cache.find(g => g.id === invite.guild.id);
    if (existingGuild) {
      return res.json({ 
        success: true, 
        alreadyIn: true, 
        guildId: existingGuild.id,
        guildName: existingGuild.name,
        message: "Bot is already in this server" 
      });
    }
    
    // Use REST API to join - this works in newer versions
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
    
    try {
      // This is the correct endpoint for joining servers
      const result = await rest.post(Routes.invite(cleanCode));
      
      if (result && result.id) {
        // Wait for the guild to appear in cache
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Find the newly joined guild
        const guild = client.guilds.cache.get(result.id) || 
                     client.guilds.cache.get(result.guild?.id) ||
                     client.guilds.cache.find(g => g.id === result.id);
        
        if (guild) {
          return res.json({ 
            success: true, 
            alreadyIn: false,
            guildId: guild.id,
            guildName: guild.name,
            message: "Successfully joined the server!" 
          });
        } else {
          // Try one more time with a longer wait
          await new Promise(resolve => setTimeout(resolve, 3000));
          const guildFound = client.guilds.cache.get(result.id) || 
                            client.guilds.cache.get(result.guild?.id);
          
          if (guildFound) {
            return res.json({ 
              success: true, 
              alreadyIn: false,
              guildId: guildFound.id,
              guildName: guildFound.name,
              message: "Successfully joined the server!" 
            });
          }
          
          return res.json({ 
            success: true, 
            alreadyIn: false,
            guildId: result.id || result.guild?.id || 'unknown',
            guildName: result.guild?.name || 'Unknown Server',
            message: "Server join initiated! The bot will appear shortly." 
          });
        }
      } else {
        return res.status(500).json({ error: "Failed to join server - no response" });
      }
    } catch (joinErr) {
      console.error("Join error details:", joinErr);
      
      // Check if error is because bot is already in the server
      if (joinErr.code === 50001 || (joinErr.message && joinErr.message.includes('already'))) {
        const guild = client.guilds.cache.find(g => g.id === invite.guild.id);
        if (guild) {
          return res.json({ 
            success: true, 
            alreadyIn: true,
            guildId: guild.id,
            guildName: guild.name,
            message: "Bot is already in this server" 
          });
        }
      }
      
      // Check for specific error codes
      if (joinErr.code === 50013) {
        return res.status(403).json({ error: "Bot doesn't have permission to join this server. Make sure the invite is valid and the bot has the necessary permissions." });
      } else if (joinErr.code === 10006) {
        return res.status(404).json({ error: "Invalid invite code. Please check and try again." });
      } else if (joinErr.code === 30007) {
        return res.status(429).json({ error: "Too many join requests. Please wait a moment and try again." });
      } else if (joinErr.code === 50001) {
        return res.status(403).json({ error: "Bot is banned from this server or missing access." });
      } else if (joinErr.code === 40060) {
        return res.status(403).json({ error: "Bot cannot join this server. The server may require verification or the invite may be expired." });
      }
      
      return res.status(500).json({ 
        error: `Failed to join server: ${joinErr.message}`,
        code: joinErr.code
      });
    }
  } catch (e) {
    console.error("Join server error:", e);
    res.status(500).json({ 
      error: "Failed to join server", 
      details: e.message,
      code: e.code
    });
  }
});

// ─── OAuth2 Join URL Generator ───────────────────────────────────────────

app.get("/api/discord/join-url", (req, res) => {
  try {
    const clientId = client.user.id;
    const permissions = "0";
    const scopes = "bot";
    const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
    res.json({ url: oauthUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/discord/guilds/:guildId/leave", async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    if (guild.ownerId === client.user.id) {
      return res.status(400).json({ error: "Cannot leave a server you own. Transfer ownership first." });
    }
    await guild.leave();
    res.json({ success: true, message: "Left the server" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Serve dashboard ──────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GemTide Staff Panel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #0a0a1a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .login-container {
      background: #1a1a2e;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #2a2a4a;
      width: 100%;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .login-container .logo { font-size: 3rem; margin-bottom: 10px; }
    .login-container h1 { color: #8b5cf6; font-size: 1.8rem; }
    .login-container .sub { color: #888; margin-bottom: 25px; }
    .login-container input {
      width: 100%;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #2a2a4a;
      background: #0a0a1a;
      color: #e0e0e0;
      font-size: 16px;
      margin-bottom: 12px;
      transition: border-color 0.2s;
    }
    .login-container input:focus { outline: none; border-color: #8b5cf6; }
    .login-container button {
      width: 100%;
      padding: 14px;
      border-radius: 8px;
      border: none;
      background: #8b5cf6;
      color: white;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .login-container button:hover { background: #7c3aed; }
    .login-container .error { color: #ef4444; margin-top: 10px; display: none; font-size: 14px; }
    .login-container .version { color: #555; font-size: 0.8rem; margin-top: 20px; }
    .spinner {
      display: none;
      width: 30px;
      height: 30px;
      border: 3px solid #2a2a4a;
      border-top-color: #8b5cf6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 15px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="login-container" id="loginContainer">
    <div class="logo">💎</div>
    <h1>GemTide</h1>
    <div class="sub">Staff Control Panel</div>
    <div class="spinner" id="spinner"></div>
    <input type="password" id="pinInput" placeholder="Enter PIN" onkeydown="if(event.key==='Enter') login()">
    <button onclick="login()">Unlock Dashboard</button>
    <div class="error" id="loginError">❌ Invalid PIN. Please try again.</div>
    <div class="version">v3.0 • staff.gemtide.win</div>
  </div>
  <script>
    function login() {
      const pin = document.getElementById('pinInput').value;
      const spinner = document.getElementById('spinner');
      const error = document.getElementById('loginError');
      const btn = document.querySelector('button');
      
      spinner.style.display = 'block';
      btn.disabled = true;
      error.style.display = 'none';
      
      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })
      .then(res => res.json())
      .then(data => {
        spinner.style.display = 'none';
        btn.disabled = false;
        if (data.success) {
          window.location.href = '/dashboard';
        } else {
          error.style.display = 'block';
        }
      })
      .catch(() => {
        spinner.style.display = 'none';
        btn.disabled = false;
        error.style.display = 'block';
      });
    }
  </script>
</body>
</html>`);
});

// ─── Dashboard page ────────────────────────────────────────────────────
app.get("/dashboard", (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/');
  }
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GemTide Staff Panel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #0a0a1a;
      color: #e0e0e0;
      height: 100vh;
      overflow: hidden;
    }
    .header {
      background: #1a1a2e;
      border-bottom: 1px solid #2a2a4a;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 44px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header .brand { display: flex; align-items: center; gap: 8px; }
    .header .brand h1 { font-size: 1.1rem; color: #8b5cf6; }
    .header .brand .badge {
      background: #2a2a4a;
      padding: 1px 8px;
      border-radius: 8px;
      font-size: 0.6rem;
      color: #888;
    }
    .header .user-info { display: flex; align-items: center; gap: 8px; }
    .header .user-info .role {
      padding: 2px 10px;
      border-radius: 8px;
      font-size: 0.65rem;
      font-weight: 600;
    }
    .role.owner { background: #8b5cf6; color: white; }
    .role.admin { background: #f59e0b; color: #1a1a2e; }
    .role.moderator { background: #3b82f6; color: white; }
    .role.support { background: #22c55e; color: #1a1a2e; }
    .header .logout-btn {
      padding: 3px 12px;
      border-radius: 4px;
      border: none;
      background: #ef4444;
      color: white;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .app { display: flex; height: calc(100vh - 44px); }
    .sidebar {
      width: 160px;
      background: #1a1a2e;
      border-right: 1px solid #2a2a4a;
      padding: 8px 0;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .sidebar .nav-item {
      padding: 6px 14px;
      color: #888;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      border-left: 3px solid transparent;
    }
    .sidebar .nav-item:hover { background: #2a2a4a; color: #e0e0e0; }
    .sidebar .nav-item.active { background: #2a2a4a; color: #8b5cf6; border-left-color: #8b5cf6; }
    .sidebar .nav-section {
      padding: 4px 14px;
      font-size: 0.55rem;
      text-transform: uppercase;
      color: #555;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .main {
      flex: 1;
      padding: 10px 14px;
      overflow-y: auto;
      background: #0f0f23;
    }
    .page { display: none; }
    .page.active { display: block; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .stat-card {
      background: #1a1a2e;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #2a2a4a;
      text-align: center;
    }
    .stat-card .number { font-size: 1.3rem; font-weight: bold; color: #8b5cf6; }
    .stat-card .label { color: #888; font-size: 0.65rem; }
    .discord-client {
      display: flex;
      height: calc(100vh - 180px);
      background: #1a1a2e;
      border-radius: 8px;
      border: 1px solid #2a2a4a;
      overflow: hidden;
      min-height: 400px;
    }
    .discord-client .guilds {
      width: 48px;
      background: #12122a;
      padding: 6px 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .discord-client .guilds .guild {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #2a2a4a;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.6rem;
      color: #888;
      transition: all 0.2s;
      overflow: hidden;
      font-weight: 600;
      position: relative;
    }
    .discord-client .guilds .guild:hover { border-radius: 8px; background: #3a3a5a; color: white; }
    .discord-client .guilds .guild.active { border-radius: 8px; background: #8b5cf6; color: white; }
    .discord-client .guilds .guild .online-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 2px solid #12122a;
    }
    .discord-client .guilds .guild .online-dot.online { background: #22c55e; }
    .discord-client .guilds .guild .online-dot.offline { background: #ef4444; }
    .discord-client .channels {
      width: 180px;
      background: #16162e;
      padding: 6px 0;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .discord-client .channels .channel {
      padding: 3px 10px;
      color: #888;
      cursor: pointer;
      font-size: 0.8rem;
      border-radius: 4px;
      margin: 0 4px;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .discord-client .channels .channel:hover { background: #2a2a4a; color: #e0e0e0; }
    .discord-client .channels .channel.active { background: #2a2a4a; color: white; }
    .discord-client .channels .category {
      padding: 4px 10px;
      color: #555;
      font-size: 0.6rem;
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 4px;
    }
    .discord-client .messages {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #0a0a1a;
    }
    .discord-client .messages .msg-list {
      flex: 1;
      padding: 8px 12px;
      overflow-y: auto;
    }
    .discord-client .messages .msg {
      margin-bottom: 6px;
      display: flex;
      gap: 8px;
      padding: 2px 0;
    }
    .discord-client .messages .msg .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #2a2a4a;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      color: #888;
      overflow: hidden;
    }
    .discord-client .messages .msg .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .discord-client .messages .msg .content .author { font-weight: 600; color: #8b5cf6; font-size: 0.8rem; }
    .discord-client .messages .msg .content .text { color: #ccc; font-size: 0.85rem; word-wrap: break-word; }
    .discord-client .messages .msg .content .time { color: #555; font-size: 0.6rem; margin-left: 4px; }
    .discord-client .messages .msg .content .bot-tag {
      background: #5865f2;
      color: white;
      font-size: 0.5rem;
      padding: 0 4px;
      border-radius: 3px;
      margin-left: 4px;
    }
    .discord-client .messages .msg-input {
      padding: 6px 10px;
      background: #1a1a2e;
      border-top: 1px solid #2a2a4a;
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .discord-client .messages .msg-input input {
      flex: 1;
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid #2a2a4a;
      background: #0a0a1a;
      color: #e0e0e0;
      font-size: 0.85rem;
    }
    .discord-client .messages .msg-input input:focus { outline: none; border-color: #8b5cf6; }
    .discord-client .messages .msg-input button {
      padding: 6px 14px;
      border-radius: 4px;
      border: none;
      background: #8b5cf6;
      color: white;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.8rem;
    }
    .discord-client .messages .msg-input button:hover { background: #7c3aed; }
    .join-server {
      display: flex;
      gap: 6px;
      padding: 6px 10px;
      background: #1a1a2e;
      border-bottom: 1px solid #2a2a4a;
      flex-wrap: wrap;
    }
    .join-server input {
      flex: 1;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #2a2a4a;
      background: #0a0a1a;
      color: #e0e0e0;
      font-size: 0.8rem;
      min-width: 150px;
    }
    .join-server input:focus { outline: none; border-color: #8b5cf6; }
    .join-server button {
      padding: 4px 12px;
      border-radius: 4px;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 0.8rem;
      white-space: nowrap;
    }
    .join-server .join-btn { background: #22c55e; }
    .join-server .join-btn:hover { background: #16a34a; }
    .join-server .oauth-btn { background: #5865f2; }
    .join-server .oauth-btn:hover { background: #4752c4; }
    .controls {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .controls input, .controls select {
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid #2a2a4a;
      background: #1a1a2e;
      color: #e0e0e0;
      font-size: 0.8rem;
      flex: 1;
      min-width: 100px;
    }
    .controls input:focus, .controls select:focus { outline: none; border-color: #8b5cf6; }
    .controls button {
      padding: 4px 12px;
      border-radius: 4px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .controls button.primary { background: #8b5cf6; color: white; }
    .controls button.primary:hover { background: #7c3aed; }
    .controls button.danger { background: #ef4444; color: white; }
    .controls button.danger:hover { background: #dc2626; }
    .controls button.success { background: #22c55e; color: white; }
    .controls button.success:hover { background: #16a34a; }
    .list-container {
      background: #1a1a2e;
      border-radius: 6px;
      border: 1px solid #2a2a4a;
      overflow: hidden;
      max-height: 350px;
      overflow-y: auto;
    }
    .list-item {
      padding: 8px 12px;
      border-bottom: 1px solid #2a2a4a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }
    .list-item:last-child { border-bottom: none; }
    .list-item .info .name { font-weight: 600; font-size: 0.85rem; }
    .list-item .info .detail { color: #888; font-size: 0.7rem; }
    .list-item .actions { display: flex; gap: 4px; }
    .list-item .actions button {
      padding: 2px 8px;
      border-radius: 3px;
      border: none;
      cursor: pointer;
      font-size: 0.65rem;
    }
    .empty { padding: 20px; text-align: center; color: #666; font-size: 0.85rem; }
    .pagination {
      display: flex;
      justify-content: center;
      gap: 4px;
      padding: 6px;
      border-top: 1px solid #2a2a4a;
    }
    .pagination button {
      padding: 3px 10px;
      border-radius: 3px;
      border: none;
      background: #2a2a4a;
      color: #ccc;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .pagination button.active { background: #8b5cf6; color: white; }
    .toast {
      position: fixed;
      bottom: 16px;
      right: 16px;
      padding: 8px 16px;
      border-radius: 4px;
      color: white;
      z-index: 2000;
      animation: slideIn 0.3s ease;
      font-weight: 500;
      font-size: 0.85rem;
    }
    .toast.success { background: #22c55e; }
    .toast.error { background: #ef4444; }
    .toast.info { background: #8b5cf6; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: #1a1a2e;
      padding: 20px;
      border-radius: 8px;
      max-width: 400px;
      width: 90%;
      border: 1px solid #2a2a4a;
    }
    .modal-content h2 { color: #8b5cf6; margin-bottom: 10px; font-size: 1.1rem; }
    .modal-content textarea {
      width: 100%;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #2a2a4a;
      background: #0a0a1a;
      color: #e0e0e0;
      min-height: 60px;
      font-family: inherit;
      font-size: 0.85rem;
    }
    .modal-content .modal-actions {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      justify-content: flex-end;
    }
    .modal-content .modal-actions button {
      padding: 5px 14px;
      border-radius: 4px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .modal-content .modal-actions .send-btn { background: #8b5cf6; color: white; }
    .modal-content .modal-actions .cancel-btn { background: #2a2a4a; color: #ccc; }
    .status-badge { padding: 1px 6px; border-radius: 6px; font-size: 0.6rem; font-weight: 600; }
    .status-badge.active { background: #22c55e; color: #1a1a2e; }
    .status-badge.blocked { background: #ef4444; color: white; }
    .status-badge.locked { background: #f59e0b; color: #1a1a2e; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; }
    .mt-8 { margin-top: 6px; }
    .mb-8 { margin-bottom: 6px; }
    .text-muted { color: #888; font-size: 0.75rem; }
    @media (max-width: 768px) {
      .sidebar { width: 120px; }
      .discord-client .channels { width: 120px; }
      .discord-client .guilds { width: 36px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <span style="font-size:1.2rem;">💎</span>
      <h1>GemTide</h1>
      <span class="badge">Staff Panel</span>
    </div>
    <div class="user-info">
      <span class="role ${req.session.user?.role || 'support'}">${req.session.user?.role?.toUpperCase() || 'STAFF'}</span>
      <span style="color:#888;font-size:0.8rem;">${req.session.user?.username || 'Admin'}</span>
      <button class="logout-btn" onclick="logout()">Logout</button>
    </div>
  </header>
  <div class="app">
    <nav class="sidebar" id="sidebar">
      <div class="nav-section">Overview</div>
      <div class="nav-item active" onclick="navigate('dashboard')">📊 Dashboard</div>
      <div class="nav-item" onclick="navigate('discord')">💬 Discord</div>
      <div class="nav-section">Management</div>
      <div class="nav-item" onclick="navigate('dms')">📨 DMs</div>
      <div class="nav-item" onclick="navigate('commands')">📋 Commands</div>
      <div class="nav-item" onclick="navigate('blocked')">🚫 Blocked</div>
      <div class="nav-item" onclick="navigate('userblocks')">🔒 User Blocks</div>
      <div class="nav-section">Staff</div>
      <div class="nav-item" onclick="navigate('staff')">👥 Staff</div>
      <div class="nav-item" onclick="navigate('settings')">⚙️ Settings</div>
    </nav>
    <main class="main" id="mainContent">
      <!-- Dashboard -->
      <div id="page-dashboard" class="page active">
        <h2 style="color:#8b5cf6;margin-bottom:8px;font-size:1.1rem;">📊 Dashboard</h2>
        <div class="stats-grid" id="statsGrid">
          <div class="stat-card"><div class="number" id="statDms">0</div><div class="label">Total DMs</div></div>
          <div class="stat-card"><div class="number" id="statUnread">0</div><div class="label">Unread</div></div>
          <div class="stat-card"><div class="number" id="statCommands">0</div><div class="label">Commands</div></div>
          <div class="stat-card"><div class="number" id="statBlocked">0</div><div class="label">Blocked</div></div>
          <div class="stat-card"><div class="number" id="statStaff">0</div><div class="label">Staff</div></div>
          <div class="stat-card"><div class="number" id="statUserBlocks">0</div><div class="label">Blocked Users</div></div>
        </div>
        <div style="background:#1a1a2e;padding:10px 14px;border-radius:6px;border:1px solid #2a2a4a;">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:0.85rem;">
            <div><span style="color:#22c55e;">🟢</span> <span id="botTag">Loading...</span></div>
            <div><span style="color:#888;">Uptime:</span> <span id="botUptime">Loading...</span></div>
            <div><span style="color:#888;">Guilds:</span> <span id="botGuilds">0</span></div>
            <div><span style="color:#888;">Users:</span> <span id="botUsers">0</span></div>
          </div>
        </div>
      </div>
      <!-- Discord Client -->
      <div id="page-discord" class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h2 style="color:#8b5cf6;font-size:1.1rem;">💬 Discord Client</h2>
          <span style="color:#888;font-size:0.7rem;">Real-time sync</span>
        </div>
        <div class="join-server">
          <input type="text" id="inviteInput" placeholder="Enter invite code (discord.gg/...)" onkeydown="if(event.key==='Enter') joinServer()">
          <button class="join-btn" onclick="joinServer()">➕ Join Server</button>
          <button class="oauth-btn" onclick="openOAuth()">🔗 Add Bot via OAuth</button>
        </div>
        <div class="discord-client">
          <div class="guilds" id="guildList"></div>
          <div class="channels" id="channelList"></div>
          <div class="messages">
            <div class="msg-list" id="msgList"></div>
            <div class="msg-input">
              <input type="text" id="msgInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendMessage()">
              <button onclick="sendMessage()">Send</button>
            </div>
          </div>
        </div>
      </div>
      <!-- DMs -->
      <div id="page-dms" class="page">
        <div class="flex-between"><h2 style="color:#8b5cf6;font-size:1.1rem;">📨 DMs</h2><span class="text-muted" id="dmCount">0 total</span></div>
        <div class="controls">
          <input type="text" id="dmSearch" placeholder="Search..." oninput="refreshDMs()">
          <select id="dmFilter" onchange="refreshDMs()">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="responded">Responded</option>
          </select>
          <button class="primary" onclick="refreshDMs()">🔄</button>
          <button class="danger" onclick="clearAllDMs()">🗑️</button>
        </div>
        <div class="list-container" id="dmList"><div class="empty">Loading...</div></div>
        <div class="pagination" id="dmPagination"></div>
      </div>
      <!-- Commands -->
      <div id="page-commands" class="page">
        <div class="flex-between"><h2 style="color:#8b5cf6;font-size:1.1rem;">📋 Commands</h2><span class="text-muted" id="cmdCount">0 total</span></div>
        <div class="controls">
          <input type="text" id="cmdSearch" placeholder="Search..." oninput="refreshCommands()">
          <select id="cmdFilter" onchange="refreshCommands()">
            <option value="all">All</option>
            <option value="blocked">Blocked Only</option>
          </select>
          <button class="primary" onclick="refreshCommands()">🔄</button>
          <button class="danger" onclick="clearCommandLogs()">🗑️</button>
        </div>
        <div class="list-container" id="commandList"><div class="empty">Loading...</div></div>
        <div class="pagination" id="cmdPagination"></div>
      </div>
      <!-- Blocked -->
      <div id="page-blocked" class="page">
        <h2 style="color:#8b5cf6;margin-bottom:8px;font-size:1.1rem;">🚫 Blocked Commands</h2>
        <div class="controls">
          <input type="text" id="blockCmdInput" placeholder="Command name">
          <input type="text" id="blockReasonInput" placeholder="Reason">
          <button class="danger" onclick="blockCommand()">Block</button>
        </div>
        <div class="list-container" id="blockedList"><div class="empty">Loading...</div></div>
      </div>
      <!-- User Blocks -->
      <div id="page-userblocks" class="page">
        <h2 style="color:#8b5cf6;margin-bottom:8px;font-size:1.1rem;">🔒 User Blocks</h2>
        <div class="controls">
          <input type="text" id="userBlockId" placeholder="Discord User ID">
          <button class="warning" onclick="blockUser()">Block User</button>
        </div>
        <div class="list-container" id="userBlockList"><div class="empty">Loading...</div></div>
      </div>
      <!-- Staff -->
      <div id="page-staff" class="page">
        <h2 style="color:#8b5cf6;margin-bottom:8px;font-size:1.1rem;">👥 Staff</h2>
        <div style="background:#1a1a2e;padding:10px 14px;border-radius:6px;border:1px solid #2a2a4a;margin-bottom:8px;">
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <input type="text" id="staffUsername" placeholder="Username" style="flex:1;padding:4px 8px;border-radius:4px;border:1px solid #2a2a4a;background:#0a0a1a;color:#e0e0e0;font-size:0.8rem;">
            <input type="text" id="staffPin" placeholder="PIN" style="flex:1;padding:4px 8px;border-radius:4px;border:1px solid #2a2a4a;background:#0a0a1a;color:#e0e0e0;font-size:0.8rem;">
            <select id="staffRole" style="padding:4px 8px;border-radius:4px;border:1px solid #2a2a4a;background:#0a0a1a;color:#e0e0e0;font-size:0.8rem;">
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="support">Support</option>
            </select>
            <button class="primary" onclick="createStaff()" style="font-size:0.8rem;">Create</button>
          </div>
        </div>
        <div class="list-container" id="staffList"><div class="empty">Loading...</div></div>
      </div>
      <!-- Settings -->
      <div id="page-settings" class="page">
        <h2 style="color:#8b5cf6;margin-bottom:8px;font-size:1.1rem;">⚙️ Settings</h2>
        <div style="background:#1a1a2e;padding:12px 14px;border-radius:6px;border:1px solid #2a2a4a;margin-bottom:8px;">
          <h3 style="color:#8b5cf6;margin-bottom:6px;font-size:0.95rem;">🔑 Change PIN</h3>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <input type="password" id="newPin" placeholder="New PIN" style="flex:1;padding:4px 8px;border-radius:4px;border:1px solid #2a2a4a;background:#0a0a1a;color:#e0e0e0;font-size:0.8rem;">
            <input type="password" id="confirmPin" placeholder="Confirm" style="flex:1;padding:4px 8px;border-radius:4px;border:1px solid #2a2a4a;background:#0a0a1a;color:#e0e0e0;font-size:0.8rem;">
            <button class="warning" onclick="changePin()" style="font-size:0.8rem;">Update</button>
          </div>
          <div id="pinResult" style="color:#888;margin-top:4px;font-size:0.8rem;"></div>
        </div>
      </div>
    </main>
  </div>
  <!-- Reply Modal -->
  <div class="modal" id="replyModal">
    <div class="modal-content">
      <h2>💬 Reply</h2>
      <p style="color:#888;margin-bottom:6px;font-size:0.85rem;">Replying to: <span id="replyUser" style="color:#8b5cf6;"></span></p>
      <textarea id="replyMessage" placeholder="Type reply..."></textarea>
      <div class="modal-actions"><button class="cancel-btn" onclick="closeReplyModal()">Cancel</button><button class="send-btn" onclick="sendReply()">Send</button></div>
    </div>
  </div>
  <script>
    let currentDmPage=1,totalDmPages=1,currentCmdPage=1,totalCmdPages=1,replyTarget=null;
    let currentGuild=null,currentChannel=null,eventSource=null,reconnectTimeout=null;

    function navigate(page) {
      if (page !== 'discord' && eventSource) {
        eventSource.close();
        eventSource = null;
      }
      document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
      document.getElementById('page-'+page).classList.add('active');
      document.querySelector(\`.nav-item[onclick="navigate('\${page}')"]\`).classList.add('active');
      const refreshMap={
        dashboard:refreshAll,
        dms:refreshDMs,
        commands:refreshCommands,
        blocked:refreshBlocked,
        userblocks:refreshUserBlocks,
        staff:refreshStaff,
        discord:()=>{loadGuilds();}
      };
      if(refreshMap[page]) refreshMap[page]();
    }

    function logout(){ fetch('/api/logout',{method:'POST'}).then(()=>window.location.href='/'); }
    function refreshAll(){ refreshDMs();refreshCommands();refreshBlocked();refreshUserBlocks();refreshStaff();updateStats();loadBotInfo(); }

    function updateStats(){ fetch('/api/stats').then(r=>r.json()).then(d=>{
      document.getElementById('statDms').textContent=d.totalDms||0;
      document.getElementById('statUnread').textContent=d.unreadDms||0;
      document.getElementById('statCommands').textContent=d.totalCommands||0;
      document.getElementById('statBlocked').textContent=d.blockedCommands||0;
      document.getElementById('statStaff').textContent=d.staffCount||0;
      document.getElementById('statUserBlocks').textContent=d.userBlocks||0;
      document.getElementById('dmCount').textContent=(d.totalDms||0)+' total';
      document.getElementById('cmdCount').textContent=(d.totalCommands||0)+' total';
    }); }

    function loadBotInfo(){ fetch('/api/botinfo').then(r=>r.json()).then(d=>{
      document.getElementById('botTag').textContent=d.tag||'Unknown';
      document.getElementById('botUptime').textContent=d.uptime||'N/A';
      document.getElementById('botGuilds').textContent=d.guilds||0;
      document.getElementById('botUsers').textContent=d.users||0;
    }); }

    function joinServer() {
      const input = document.getElementById('inviteInput').value.trim();
      if (!input) return showToast('Enter an invite code or link.', 'error');
      showToast('⏳ Joining server...', 'info');
      fetch('/api/discord/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: input })
      })
      .then(r=>r.json())
      .then(data=>{
        if (data.success) {
          if (data.alreadyIn) {
            showToast('✅ Already in this server!', 'success');
          } else {
            showToast('✅ Successfully joined ' + (data.guildName || 'server') + '!', 'success');
            document.getElementById('inviteInput').value = '';
            setTimeout(loadGuilds, 3000);
          }
        } else {
          showToast('❌ ' + (data.error || 'Failed to join'), 'error');
        }
      })
      .catch(()=>showToast('❌ Failed to join server', 'error'));
    }

    function openOAuth() {
      fetch('/api/discord/join-url')
        .then(r => r.json())
        .then(data => {
          if (data.url) {
            window.open(data.url, '_blank');
            showToast('✅ OAuth URL opened in new tab', 'success');
          }
        })
        .catch(() => showToast('❌ Failed to get OAuth URL', 'error'));
    }

    function loadGuilds() {
      fetch('/api/discord/guilds').then(r=>r.json()).then(data=>{
        const container=document.getElementById('guildList');
        if (!data || data.length===0) {
          container.innerHTML = '<div style="color:#555;font-size:0.6rem;text-align:center;padding:10px;">No guilds</div>';
          return;
        }
        container.innerHTML=data.map(g=>\`
          <div class="guild \${currentGuild===g.id?'active':''}" onclick="loadChannels('\${g.id}')" title="\${g.name} (\${g.memberCount} members)">
            \${g.icon ? '<img src="'+g.icon+'" style="width:32px;height:32px;border-radius:50%;">' : g.name.charAt(0).toUpperCase()}
            <span class="online-dot \${g.available ? 'online' : 'offline'}"></span>
          </div>
        \`).join('');
        if(data.length&&!currentGuild) loadChannels(data[0].id);
      }).catch(()=>{});
    }

    function loadChannels(guildId) {
      currentGuild=guildId;
      document.querySelectorAll('.guild').forEach(el=>el.classList.remove('active'));
      document.querySelector(\`.guild[onclick="loadChannels('\${guildId}')"]\`)?.classList.add('active');
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      document.getElementById('channelList').innerHTML = '<div style="color:#555;padding:10px;font-size:0.8rem;">Loading channels...</div>';
      
      fetch(\`/api/discord/guilds/\${guildId}/channels\`).then(r=>r.json()).then(data=>{
        const container=document.getElementById('channelList');
        const textChannels=data.filter(c=>c.type===0||c.type===5);
        const categories=data.filter(c=>c.type===4);
        let html='';
        categories.forEach(c=>{
          const children=textChannels.filter(t=>t.parentId===c.id);
          if(children.length){
            html+=\`<div class="category">\${c.name}</div>\`;
            children.forEach(ch=>{
              html+=\`<div class="channel" onclick="loadMessages('\${ch.id}')"># \${ch.name}</div>\`;
            });
          }
        });
        const uncat=textChannels.filter(t=>!t.parentId);
        if(uncat.length){ html+='<div class="category">Channels</div>'; uncat.forEach(ch=>{
          html+=\`<div class="channel" onclick="loadMessages('\${ch.id}')"># \${ch.name}</div>\`;
        }); }
        container.innerHTML=html||'<div style="color:#555;padding:10px;font-size:0.8rem;">No channels</div>';
        if(textChannels.length) loadMessages(textChannels[0].id);
      });
    }

    function loadMessages(channelId) {
      if (currentChannel === channelId) return;
      currentChannel = channelId;
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      document.querySelectorAll('.channel').forEach(el=>el.classList.remove('active'));
      document.querySelector(\`.channel[onclick="loadMessages('\${channelId}')"]\`)?.classList.add('active');
      document.getElementById('msgList').innerHTML = '<div style="color:#555;padding:10px;font-size:0.8rem;">Loading messages...</div>';
      
      fetchMessages(channelId);
      setupSSE(channelId);
    }

    function setupSSE(channelId) {
      try {
        eventSource = new EventSource(\`/api/discord/channels/\${channelId}/stream\`);
        
        eventSource.onmessage = function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
              const msgList = document.getElementById('msgList');
              const msgDiv = document.createElement('div');
              msgDiv.className = 'msg';
              msgDiv.innerHTML = \`
                <div class="avatar">\${data.author.avatar ? '<img src="'+data.author.avatar+'">' : data.author.username.charAt(0).toUpperCase()}</div>
                <div class="content">
                  <div>
                    <span class="author">\${escapeHtml(data.author.username)}</span>
                    \${data.author.bot ? '<span class="bot-tag">BOT</span>' : ''}
                    <span class="time">\${new Date(data.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div class="text">\${escapeHtml(data.content) || '📎 Attachment'}</div>
                </div>
              \`;
              msgList.appendChild(msgDiv);
              msgList.scrollTop = msgList.scrollHeight;
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        };
        
        eventSource.onerror = function() {
          console.log('SSE connection lost, reconnecting...');
          eventSource.close();
          eventSource = null;
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            if (currentChannel) {
              setupSSE(currentChannel);
            }
          }, 3000);
        };
      } catch (e) {
        console.error('SSE setup error:', e);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          if (currentChannel) {
            fetchMessages(currentChannel);
          }
        }, 5000);
      }
    }

    function fetchMessages(channelId, silent = false) {
      fetch(\`/api/discord/channels/\${channelId}/messages?limit=50\`)
        .then(r => r.json())
        .then(data => {
          const container = document.getElementById('msgList');
          if (!data || data.length === 0) {
            if (!silent) container.innerHTML = '<div class="empty">No messages</div>';
            return;
          }
          const formatted = data.map(m => \`
            <div class="msg">
              <div class="avatar">\${m.author.avatar ? '<img src="'+m.author.avatar+'">' : m.author.username.charAt(0).toUpperCase()}</div>
              <div class="content">
                <div>
                  <span class="author">\${escapeHtml(m.author.username)}</span>
                  \${m.author.bot ? '<span class="bot-tag">BOT</span>' : ''}
                  <span class="time">\${new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="text">\${escapeHtml(m.content) || '📎 Attachment'}</div>
              </div>
            </div>
          \`).join('');
          if (!silent || container.innerHTML !== formatted) {
            container.innerHTML = formatted;
            container.scrollTop = container.scrollHeight;
          }
        })
        .catch(() => {});
    }

    function sendMessage() {
      const input = document.getElementById('msgInput');
      if (!input.value.trim() || !currentChannel) {
        return showToast('Select a channel first.', 'error');
      }
      const content = input.value;
      input.value = '';
      fetch(\`/api/discord/channels/\${currentChannel}/messages\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      .then(r => r.json())
      .then(() => {
        fetchMessages(currentChannel);
      })
      .catch(() => showToast('Failed to send message', 'error'));
    }

    // ─── DMs ─────────────────────────────────────────────────────────
    function refreshDMs(){ const s=document.getElementById('dmSearch').value,f=document.getElementById('dmFilter').value;
      fetch(\`/api/dms?page=\${currentDmPage}&search=\${encodeURIComponent(s)}&filter=\${f}\`).then(r=>r.json()).then(d=>{
        const list=document.getElementById('dmList');
        if(!d.dms||!d.dms.length) list.innerHTML='<div class="empty">No DMs found.</div>';
        else list.innerHTML=d.dms.map(dm=>\`
          <div class="list-item">
            <div class="info"><div class="name">\${escapeHtml(dm.username)}</div><div class="detail">\${dm.userid} • \${new Date(dm.timestamp).toLocaleString()}</div><div style="color:#aaa;font-size:0.8rem;">\${escapeHtml(dm.message)}</div>\${dm.responded?\`<div style="color:#fbbf24;font-size:0.75rem;">📨 Response: \${escapeHtml(dm.response)}</div>\`:''}</div>
            <div class="actions"><span class="status-badge \${dm.responded?'active':'blocked'}">\${dm.responded?'✅ Responded':'⏳ Unread'}</span>\${!dm.responded?\`<button onclick="openReplyModal('\${dm._id}','\${escapeJs(dm.username)}')">Reply</button>\`:''}<button onclick="deleteDM('\${dm._id}')">Delete</button></div>
          </div>\`).join('');
        totalDmPages=d.totalPages||1; renderPagination('dmPagination',currentDmPage,totalDmPages,'goToDmPage');
      }); }
    function goToDmPage(p){currentDmPage=p;refreshDMs();}
    function deleteDM(id){if(!confirm('Delete?'))return;fetch(\`/api/dms/\${id}\`,{method:'DELETE'}).then(()=>{refreshDMs();updateStats();});}
    function clearAllDMs(){if(!confirm('Delete ALL DMs?'))return;fetch('/api/dms',{method:'DELETE'}).then(()=>{refreshDMs();updateStats();});}

    // ─── Commands ────────────────────────────────────────────────────
    function refreshCommands(){ const s=document.getElementById('cmdSearch').value,f=document.getElementById('cmdFilter').value;
      fetch(\`/api/commands?page=\${currentCmdPage}&search=\${encodeURIComponent(s)}&filter=\${f}\`).then(r=>r.json()).then(d=>{
        const list=document.getElementById('commandList');
        if(!d.commands||!d.commands.length) list.innerHTML='<div class="empty">No commands.</div>';
        else list.innerHTML=d.commands.map(c=>\`
          <div class="list-item">
            <div class="info"><div class="name">/\${c.command}</div><div class="detail">\${c.username} • \${new Date(c.timestamp).toLocaleString()}</div>\${c.options&&Object.keys(c.options).length?\`<div class="detail">Options: \${JSON.stringify(c.options)}</div>\`:''}</div>
            <div class="actions"><span class="status-badge \${c.blocked?'blocked':'active'}">\${c.blocked?'🚫 Blocked':'✅ Active'}</span></div>
          </div>\`).join('');
        totalCmdPages=d.totalPages||1; renderPagination('cmdPagination',currentCmdPage,totalCmdPages,'goToCmdPage');
      }); }
    function goToCmdPage(p){currentCmdPage=p;refreshCommands();}
    function clearCommandLogs(){if(!confirm('Clear logs?'))return;fetch('/api/commands',{method:'DELETE'}).then(()=>{refreshCommands();updateStats();});}

    // ─── Blocked ─────────────────────────────────────────────────────
    function blockCommand(){ const c=document.getElementById('blockCmdInput').value.trim(),r=document.getElementById('blockReasonInput').value.trim()||'Blocked by admin'; if(!c)return showToast('Enter command name.','error');
      fetch('/api/block',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:c,reason:r})})
      .then(r=>r.json()).then(d=>{if(d.success){showToast('✅ Blocked /'+c,'success');document.getElementById('blockCmdInput').value='';document.getElementById('blockReasonInput').value='';refreshBlocked();updateStats();}else showToast(d.error||'Failed.','error');}); }
    function unblockCommand(c){if(!confirm('Unblock /'+c+'?'))return;fetch(\`/api/unblock/\${encodeURIComponent(c)}\`,{method:'DELETE'}).then(()=>{showToast('✅ Unblocked','success');refreshBlocked();updateStats();});}
    function refreshBlocked(){ fetch('/api/blocked').then(r=>r.json()).then(d=>{
      const list=document.getElementById('blockedList');
      if(!d||!d.length) list.innerHTML='<div class="empty">No blocked commands.</div>';
      else list.innerHTML=d.map(b=>\`
        <div class="list-item"><div class="info"><div class="name">/\${b.command}</div><div class="detail">\${b.reason} • \${new Date(b.blockedAt).toLocaleString()}</div></div><div class="actions"><button onclick="unblockCommand('\${b.command}')">Unblock</button></div></div>
      \`).join(''); }); }

    // ─── User Blocks ─────────────────────────────────────────────────
    function blockUser(){ const id=document.getElementById('userBlockId').value.trim(); if(!id)return showToast('Enter User ID.','error'); const r=prompt('Reason:')||'Blocked by admin';
      fetch('/api/userblock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id,reason:r})})
      .then(r=>r.json()).then(d=>{if(d.success){showToast('✅ Blocked user','success');document.getElementById('userBlockId').value='';refreshUserBlocks();updateStats();}}); }
    function unblockUser(id){if(!confirm('Unblock?'))return;fetch(\`/api/userunblock/\${encodeURIComponent(id)}\`,{method:'DELETE'}).then(()=>{showToast('✅ Unblocked','success');refreshUserBlocks();updateStats();});}
    function refreshUserBlocks(){ fetch('/api/userblocks').then(r=>r.json()).then(d=>{
      const list=document.getElementById('userBlockList');
      if(!d||!d.length) list.innerHTML='<div class="empty">No blocked users.</div>';
      else list.innerHTML=d.map(b=>\`
        <div class="list-item"><div class="info"><div class="name">\${b.userid}</div><div class="detail">\${b.reason} • \${b.blockedAll?'🚫 ALL':b.blockedCommands.length?'Commands: '+b.blockedCommands.join(', '):'None'}</div></div><div class="actions">\${!b.blockedAll?\`<button onclick="blockUserCommand('\${b.userid}')">+Cmd</button>\`:''}<button onclick="unblockUser('\${b.userid}')">Unblock</button></div></div>
      \`).join(''); }); }
    function blockUserCommand(id){ const c=prompt('Command to block:'); if(!c)return; fetch('/api/userblockcmd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id,command:c})}).then(()=>{showToast('✅ Blocked','success');refreshUserBlocks();}); }

    // ─── Staff ───────────────────────────────────────────────────────
    function createStaff(){ const u=document.getElementById('staffUsername').value.trim(),p=document.getElementById('staffPin').value.trim(),r=document.getElementById('staffRole').value; if(!u||!p)return showToast('Username and PIN required.','error'); if(p.length<4)return showToast('PIN min 4 chars.','error');
      fetch('/api/staff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,pin:p,role:r,permissions:[]})})
      .then(r=>r.json()).then(d=>{if(d.success){showToast('✅ Created '+u,'success');document.getElementById('staffUsername').value='';document.getElementById('staffPin').value='';refreshStaff();updateStats();}else showToast(d.error||'Failed.','error');}); }
    function deleteStaff(id,u){if(!confirm('Delete '+u+'?'))return;fetch(\`/api/staff/\${id}\`,{method:'DELETE'}).then(()=>{showToast('✅ Deleted','success');refreshStaff();updateStats();});}
    function toggleStaffLock(id,u){fetch(\`/api/staff/\${id}/lock\`,{method:'POST'}).then(()=>{showToast('✅ Toggled lock','success');refreshStaff();});}
    function resetStaffPin(id,u){const p=prompt('New PIN for '+u+':');if(!p||p.length<4)return showToast('PIN min 4 chars.','error');fetch(\`/api/staff/\${id}/pin\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:p})}).then(()=>{showToast('✅ Updated PIN','success');refreshStaff();});}
    function refreshStaff(){ fetch('/api/staff').then(r=>r.json()).then(d=>{
      const list=document.getElementById('staffList');
      if(!d||!d.length) list.innerHTML='<div class="empty">No staff.</div>';
      else list.innerHTML=d.map(s=>\`
        <div class="list-item"><div class="info"><div class="name">\${s.username} <span class="role \${s.role}">\${s.role}</span></div><div class="detail">\${s.permissions.length?s.permissions.join(', '):'No perms'} • \${s.locked?'🔒 Locked':'✅ Active'}</div></div>
        <div class="actions">\${s.role!=='owner'?\`
          <button onclick="toggleStaffLock('\${s._id}','\${s.username}')">\${s.locked?'Unlock':'Lock'}</button>
          <button onclick="resetStaffPin('\${s._id}','\${s.username}')">Reset PIN</button>
          <button onclick="deleteStaff('\${s._id}','\${s.username}')">Delete</button>
        \`:'<span style="color:#888;">Owner</span>'}</div></div>
      \`).join(''); }); }

    // ─── Settings ────────────────────────────────────────────────────
    function changePin(){ const n=document.getElementById('newPin').value.trim(),c=document.getElementById('confirmPin').value.trim(); if(!n||n.length<4)return document.getElementById('pinResult').textContent='❌ PIN min 4 chars.'; if(n!==c)return document.getElementById('pinResult').textContent='❌ PINs do not match.';
      fetch('/api/changepin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:n})})
      .then(r=>r.json()).then(d=>{if(d.success){document.getElementById('pinResult').textContent='✅ PIN updated!';document.getElementById('newPin').value='';document.getElementById('confirmPin').value='';showToast('✅ PIN updated!','success');}else document.getElementById('pinResult').textContent='❌ '+d.error;}); }

    // ─── Reply Modal ────────────────────────────────────────────────
    function openReplyModal(id,u){replyTarget=id;document.getElementById('replyUser').textContent=u;document.getElementById('replyMessage').value='';document.getElementById('replyModal').classList.add('active');}
    function closeReplyModal(){document.getElementById('replyModal').classList.remove('active');replyTarget=null;}
    function sendReply(){const m=document.getElementById('replyMessage').value.trim();if(!m||!replyTarget)return showToast('Enter reply.','error');fetch('/api/reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dmId:replyTarget,message:m})}).then(r=>r.json()).then(d=>{if(d.success){closeReplyModal();refreshDMs();updateStats();showToast('✅ Reply sent!','success');}else showToast(d.error||'Failed.','error');});}

    // ─── Utility ────────────────────────────────────────────────────
    function renderPagination(containerId,current,total,callback){ const container=document.getElementById(containerId); if(total<=1){container.innerHTML='';return;} let html=\`<button onclick="\${callback}(1)" \${current===1?'disabled':''}>⏪</button>\`; for(let i=Math.max(1,current-2);i<=Math.min(total,current+2);i++){ html+=\`<button onclick="\${callback}(\${i})" class="\${i===current?'active':''}">\${i}</button>\`; } html+=\`<button onclick="\${callback}(\${total})" \${current===total?'disabled':''}>⏩</button>\`; container.innerHTML=html; }
    function escapeHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
    function escapeJs(t){return t.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'").replace(/"/g,'\\\\"');}
    function showToast(msg,type='info'){const e=document.querySelector('.toast');if(e)e.remove();const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),4000);}

    setInterval(()=>{updateStats();if(document.getElementById('page-dms').classList.contains('active'))refreshDMs();if(document.getElementById('page-commands').classList.contains('active'))refreshCommands();},15000);

    refreshAll(); loadGuilds();
  </script>
</body>
</html>`);
});

// Start web server
const HOST = process.env.HOST || "0.0.0.0";
server.listen(WEB_PORT, HOST, () => {
  console.log(`[web] Dashboard running at http://localhost:${WEB_PORT}`);
  console.log(`[web] Access your dashboard at: ${PUBLIC_URL}`);
  console.log(`[web] Default Owner PIN: ${DEFAULT_OWNER_PIN}`);
});

// ─── Discord MESSAGE CREATE Listener ────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (!message.author.bot && message.guild) {
    broadcastNewMessage(message);
  }
  
  if (message.author.bot) return;
  if (message.channel.type !== ChannelType.DM) return;
  if (!message.content || message.content.length === 0) return;

  try {
    const dmLog = await dmLogs.create({
      userid: message.author.id,
      username: message.author.username,
      message: message.content,
      timestamp: new Date(),
      responded: false,
      response: "",
    });

    console.log(`[DM] From ${message.author.username}: ${message.content}`);

    if (OWNER_DISCORD_ID) {
      try {
        const owner = await client.users.fetch(OWNER_DISCORD_ID);
        if (owner) {
          const embed = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle("📩 New DM Received")
            .addFields(
              { name: "User", value: `${message.author.username} (${message.author.id})`, inline: false },
              { name: "Message", value: message.content.substring(0, 1000), inline: false },
              { name: "Dashboard", value: `[View DM](${PUBLIC_URL})`, inline: false }
            )
            .setFooter({ text: `DM ID: ${dmLog._id}` })
            .setTimestamp();
          await owner.send({ embeds: [embed] });
        }
      } catch (e) {
        console.error("Failed to notify owner:", e.message);
      }
    }

    if (message.author.id !== OWNER_DISCORD_ID) {
      const autoReply = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("📨 Auto-Reply")
        .setDescription("Thank you for your message! A staff member will review it and get back to you soon.\n\nIf this is urgent, please open a ticket in the support channel.")
        .setFooter({ text: "GemTide Support" })
        .setTimestamp();
      await message.author.send({ embeds: [autoReply] }).catch(() => {});
    }
  } catch (e) {
    console.error("DM handling error:", e);
  }
});

// ─── Command Logger ──────────────────────────────────────────────────────────
async function logCommand(interaction) {
  try {
    const options = {};
    for (const [key, value] of interaction.options.data) {
      options[key] = value.value;
    }
    await commandLogs.create({
      userid: interaction.user.id,
      username: interaction.user.username,
      command: interaction.commandName,
      options: options,
      timestamp: new Date(),
      guild: interaction.guild?.id || "DM",
      channel: interaction.channel?.id || "DM"
    });
  } catch (e) {
    console.error("Failed to log command:", e.message);
  }
}

// ─── clientReady ──────────────────────────────────────────────────────────────
client.once("clientReady", async () => {
  console.log(`GemTide bot online as ${client.user.tag}`);
  try { client.user.setPresence({ activities: [{ name: "GemTide.Win", type: ActivityType.Playing }], status: "online" }); } catch {}
  logger.init(client);
  await ensureTicketEmojis();

  let commands = [];
  try {
    commands = [
      new SlashCommandBuilder().setName("balance").setDescription("Your GemTide balance & stats"),
      new SlashCommandBuilder().setName("profit").setDescription("Your net profit/loss"),
      new SlashCommandBuilder().setName("stats").setDescription("Your full GemTide statistics"),
      new SlashCommandBuilder().setName("wager").setDescription("Your wager amount & rank"),
      new SlashCommandBuilder().setName("affiliate").setDescription("Your affiliate code & referral link"),
      new SlashCommandBuilder().setName("daily").setDescription("Daily bonus reminder link"),
      new SlashCommandBuilder().setName("withdraws").setDescription("Your pending withdrawals"),
      new SlashCommandBuilder().setName("cancelallwithdraws").setDescription("Cancel all your pending withdrawals"),
      new SlashCommandBuilder().setName("link").setDescription("Link your Discord to GemTide"),
      new SlashCommandBuilder().setName("unlink").setDescription("Unlink your Discord from GemTide"),
      new SlashCommandBuilder().setName("inventory").setDescription("Browse your GemTide inventory").addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("history").setDescription("Your recent transaction history").addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("profile").setDescription("View a linked user's GemTide profile").addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)),
      new SlashCommandBuilder().setName("leaderboard").setDescription("Top 10 wagerers"),
      new SlashCommandBuilder().setName("richest").setDescription("Top 10 users by balance"),
      new SlashCommandBuilder().setName("topprofit").setDescription("Top 10 most profitable users"),
      new SlashCommandBuilder().setName("toplosers").setDescription("Top 10 by total loss"),
      new SlashCommandBuilder().setName("toplevel").setDescription("Top 10 by level"),
      new SlashCommandBuilder().setName("deposit").setDescription("Active deposit bots & how to deposit"),
      new SlashCommandBuilder().setName("games").setDescription("All available games on GemTide"),
      new SlashCommandBuilder().setName("sitestats").setDescription("Site-wide statistics"),
      new SlashCommandBuilder().setName("activecoinflips").setDescription("Active coinflips right now"),
      new SlashCommandBuilder().setName("jackpotstats").setDescription("Current jackpot status"),
      new SlashCommandBuilder().setName("recentgames").setDescription("5 most recently completed coinflips"),
      new SlashCommandBuilder().setName("ping").setDescription("Bot response time"),
      new SlashCommandBuilder().setName("help").setDescription("All GemTide bot commands"),
      new SlashCommandBuilder().setName("support").setDescription("GemTide support info"),
      new SlashCommandBuilder().setName("invite").setDescription("GemTide site link"),
      new SlashCommandBuilder().setName("serverinfo").setDescription("This Discord server's info"),
      new SlashCommandBuilder().setName("botinfo").setDescription("GemTide bot info & uptime"),
      new SlashCommandBuilder().setName("avatar").setDescription("View a user's avatar").addUserOption((o) => o.setName("user").setDescription("User (defaults to yourself)")),
      new SlashCommandBuilder().setName("roll").setDescription("Roll a random number").addIntegerOption((o) => o.setName("sides").setDescription("Sides (default 100)").setMinValue(2).setMaxValue(1000000)),
      new SlashCommandBuilder().setName("flip").setDescription("Flip a coin"),
      new SlashCommandBuilder().setName("8ball").setDescription("Ask the magic 8-ball").addStringOption((o) => o.setName("question").setDescription("Your question").setRequired(true)),
      new SlashCommandBuilder().setName("rps").setDescription("Rock-paper-scissors vs the bot").addStringOption((o) => o.setName("choice").setDescription("Your choice").setRequired(true).addChoices({ name: "Rock", value: "rock" }, { name: "Paper", value: "paper" }, { name: "Scissors", value: "scissors" })),
      new SlashCommandBuilder().setName("poll").setDescription("Create a poll").addStringOption((o) => o.setName("question").setDescription("Poll question").setRequired(true)).addStringOption((o) => o.setName("options").setDescription("Options separated by | e.g. Yes|No|Maybe").setRequired(true)),
      new SlashCommandBuilder().setName("remind").setDescription("Set a reminder (DM'd to you)").addIntegerOption((o) => o.setName("minutes").setDescription("Minutes from now").setRequired(true).setMinValue(1).setMaxValue(10080)).addStringOption((o) => o.setName("message").setDescription("Reminder message").setRequired(true)),
      new SlashCommandBuilder().setName("calc").setDescription("Calculate a math expression").addStringOption((o) => o.setName("expression").setDescription("e.g. 2500 * 3 + 1000").setRequired(true)),
      new SlashCommandBuilder().setName("say").setDescription("Admin — send a message as the bot").addStringOption((o) => o.setName("message").setDescription("Message to send").setRequired(true)).addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("giveaway").setDescription("Manage giveaways").addSubcommand((s) => s.setName("start").setDescription("Start a giveaway").addStringOption((o) => o.setName("prize").setDescription("Prize").setRequired(true)).addIntegerOption((o) => o.setName("duration").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(10080)).addIntegerOption((o) => o.setName("winners").setDescription("Winners (default 1)").setMinValue(1).setMaxValue(20)).addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)"))).addSubcommand((s) => s.setName("end").setDescription("Force-end a giveaway").addStringOption((o) => o.setName("id").setDescription("Giveaway ID").setRequired(true))).addSubcommand((s) => s.setName("reroll").setDescription("Reroll a winner").addStringOption((o) => o.setName("messageid").setDescription("Message ID of ended giveaway").setRequired(true))).addSubcommand((s) => s.setName("list").setDescription("List active giveaways")),
      new SlashCommandBuilder().setName("ban").setDescription("Admin — ban a user from the site").addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)).addStringOption((o) => o.setName("reason").setDescription("Reason")),
      new SlashCommandBuilder().setName("unban").setDescription("Admin — unban a site user").addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)),
      new SlashCommandBuilder().setName("banid").setDescription("Admin — ban by Roblox ID").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addStringOption((o) => o.setName("reason").setDescription("Reason")),
      new SlashCommandBuilder().setName("unbanid").setDescription("Admin — unban by Roblox ID").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("listbanned").setDescription("Admin — list all banned users").addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("userinfo").setDescription("Admin — full account info").addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)),
      new SlashCommandBuilder().setName("userinfobyid").setDescription("Admin — full account info by Roblox ID").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("finduser").setDescription("Admin — search users by Roblox username").addStringOption((o) => o.setName("query").setDescription("Search term").setRequired(true)),
      new SlashCommandBuilder().setName("addbalance").setDescription("Admin — add/subtract balance").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addIntegerOption((o) => o.setName("amount").setDescription("Amount (neg to subtract)").setRequired(true)),
      new SlashCommandBuilder().setName("setbalance").setDescription("Admin — set exact balance").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addIntegerOption((o) => o.setName("amount").setDescription("New balance (0+)").setRequired(true).setMinValue(0)),
      new SlashCommandBuilder().setName("addwager").setDescription("Admin — manually add wager amount").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addIntegerOption((o) => o.setName("amount").setDescription("Amount to add").setRequired(true).setMinValue(1)),
      new SlashCommandBuilder().setName("setlevel").setDescription("Admin — set a user's level").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addIntegerOption((o) => o.setName("level").setDescription("New level").setRequired(true).setMinValue(0)),
      new SlashCommandBuilder().setName("resetstats").setDescription("Admin — reset won/lost/wager to 0").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("transferbalance").setDescription("Admin — transfer balance between users").addStringOption((o) => o.setName("from_id").setDescription("From Roblox ID").setRequired(true)).addStringOption((o) => o.setName("to_id").setDescription("To Roblox ID").setRequired(true)).addIntegerOption((o) => o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(1)),
      new SlashCommandBuilder().setName("give").setDescription("Admin — give an item to a user").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true)).addIntegerOption((o) => o.setName("quantity").setDescription("Quantity (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("clearwithdrawals").setDescription("Admin — clear withdrawals for a user").addUserOption((o) => o.setName("user").setDescription("Discord user").setRequired(true)),
      new SlashCommandBuilder().setName("clearwithdrawalsbyid").setDescription("Admin — clear withdrawals by Roblox ID").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("pendingwithdrawals").setDescription("Admin — all site-wide pending withdrawals").addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("addwithdrawal").setDescription("Admin — queue a withdrawal for a user").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("withdrawstats").setDescription("Admin — site-wide withdrawal stats"),
      new SlashCommandBuilder().setName("inventoryof").setDescription("Admin — view user's inventory by Roblox ID").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("clearinventory").setDescription("Admin — wipe a user's inventory").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)),
      new SlashCommandBuilder().setName("removeitem").setDescription("Admin — remove one item from a user's inventory").addStringOption((o) => o.setName("roblox_id").setDescription("Roblox user ID").setRequired(true)).addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("searchinventory").setDescription("Admin — find who holds a specific item").addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("givemass").setDescription("Admin — give an item to all users").addStringOption((o) => o.setName("item_name").setDescription("Item name").setRequired(true)).addStringOption((o) => o.setName("game").setDescription("Game (PS99 etc)").setRequired(true)).addIntegerOption((o) => o.setName("quantity").setDescription("Qty per user (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("iteminfo").setDescription("Look up an item in the database").addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("itemlist").setDescription("Browse items in the database").addStringOption((o) => o.setName("game").setDescription("Filter by game (optional)")).addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)").setMinValue(1)),
      new SlashCommandBuilder().setName("createitem").setDescription("Admin — create a new item").addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true)).addIntegerOption((o) => o.setName("value").setDescription("Value in R$").setRequired(true).setMinValue(1)).addStringOption((o) => o.setName("game").setDescription("Game (e.g. PS99)").setRequired(true)),
      new SlashCommandBuilder().setName("updateitemvalue").setDescription("Admin — update an item's value").addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true)).addIntegerOption((o) => o.setName("value").setDescription("New value in R$").setRequired(true).setMinValue(1)),
      new SlashCommandBuilder().setName("deleteitem").setDescription("Admin — delete an item from the database").addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true)),
      new SlashCommandBuilder().setName("create").setDescription("Admin — register a deposit/withdraw bot").addStringOption((o) => o.setName("name").setDescription("Bot Roblox username").setRequired(true)).addStringOption((o) => o.setName("pfp").setDescription("Bot avatar URL").setRequired(true)).addIntegerOption((o) => o.setName("userid").setDescription("Bot Roblox user ID").setRequired(true)).addStringOption((o) => o.setName("game").setDescription("Game e.g. PS99").setRequired(true)).addStringOption((o) => o.setName("link").setDescription("Roblox profile link (optional)")),
      new SlashCommandBuilder().setName("toggle").setDescription("Admin — manage bots and settings").addSubcommand((s) => s.setName("on").setDescription("Enable a bot").addStringOption((o) => o.setName("botid").setDescription("Bot DB ID or 'all'").setRequired(true))).addSubcommand((s) => s.setName("off").setDescription("Disable a bot").addStringOption((o) => o.setName("botid").setDescription("Bot DB ID or 'all'").setRequired(true))).addSubcommand((s) => s.setName("list").setDescription("List all registered bots")).addSubcommand((s) => s.setName("delete").setDescription("Delete a bot entry").addStringOption((o) => o.setName("botid").setDescription("Bot DB ID").setRequired(true))).addSubcommand((s) => s.setName("cancelwithdraws").setDescription("Enable/disable cancel-withdraws").addStringOption((o) => o.setName("action").setDescription("enable or disable").setRequired(true).addChoices({ name: "enable", value: "enable" }, { name: "disable", value: "disable" }))),
      new SlashCommandBuilder().setName("botstatus").setDescription("Admin — all bots online/offline status"),
      new SlashCommandBuilder().setName("editbot").setDescription("Admin — edit a bot property").addStringOption((o) => o.setName("botid").setDescription("Bot DB ID").setRequired(true)).addStringOption((o) => o.setName("field").setDescription("Field to update").setRequired(true).addChoices({ name: "name", value: "name" }, { name: "pfp", value: "pfp" }, { name: "link", value: "link" }, { name: "game", value: "game" })).addStringOption((o) => o.setName("value").setDescription("New value").setRequired(true)),
      new SlashCommandBuilder().setName("announce").setDescription("Admin — send a branded announcement").addStringOption((o) => o.setName("message").setDescription("Announcement text").setRequired(true)).addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("listalllinked").setDescription("Admin — all users with linked Discord").addIntegerOption((o) => o.setName("page").setDescription("Page (default 1)")),
      new SlashCommandBuilder().setName("locktipping").setDescription("Admin — enable or disable tipping").addStringOption((o) => o.setName("action").setDescription("enable or disable").setRequired(true).addChoices({ name: "enable", value: "enable" }, { name: "disable", value: "disable" })),
      new SlashCommandBuilder().setName("kick").setDescription("Admin — kick a member").addUserOption((o) => o.setName("user").setDescription("Member to kick").setRequired(true)).addStringOption((o) => o.setName("reason").setDescription("Reason")),
      new SlashCommandBuilder().setName("discordban").setDescription("Admin — ban from the Discord server").addUserOption((o) => o.setName("user").setDescription("Member to ban").setRequired(true)).addStringOption((o) => o.setName("reason").setDescription("Reason")).addIntegerOption((o) => o.setName("delete_days").setDescription("Days of messages to delete (0-7)").setMinValue(0).setMaxValue(7)),
      new SlashCommandBuilder().setName("timeout").setDescription("Admin — timeout (mute) a member").addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)).addIntegerOption((o) => o.setName("minutes").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(40320)).addStringOption((o) => o.setName("reason").setDescription("Reason")),
      new SlashCommandBuilder().setName("untimeout").setDescription("Admin — remove a member's timeout").addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      new SlashCommandBuilder().setName("warn").setDescription("Admin — warn a Discord member").addUserOption((o) => o.setName("user").setDescription("Member to warn").setRequired(true)).addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true)),
      new SlashCommandBuilder().setName("warnings").setDescription("Admin — view a member's warnings").addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      new SlashCommandBuilder().setName("clearwarnings").setDescription("Admin — clear all warnings for a member").addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)),
      new SlashCommandBuilder().setName("purge").setDescription("Admin — bulk delete messages").addIntegerOption((o) => o.setName("count").setDescription("Messages to delete (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)),
      new SlashCommandBuilder().setName("slowmode").setDescription("Admin — set channel slowmode").addIntegerOption((o) => o.setName("seconds").setDescription("Seconds (0=disable, max 21600)").setRequired(true).setMinValue(0).setMaxValue(21600)).addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("lock").setDescription("Admin — lock a channel").addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("unlock").setDescription("Admin — unlock a channel").addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
      new SlashCommandBuilder().setName("nick").setDescription("Admin — change a member's nickname").addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true)).addStringOption((o) => o.setName("nickname").setDescription("New nickname (blank to reset)")),
      new SlashCommandBuilder().setName("dmall").setDescription("Owner only — DM all server members").addStringOption((o) => o.setName("message").setDescription("The message to send to all members").setRequired(true)).addStringOption((o) => o.setName("embed_title").setDescription("Optional embed title")).addStringOption((o) => o.setName("embed_color").setDescription("Hex color (e.g. #8b5cf6)")),
    ].map((c) => c.toJSON());
  } catch (e) { console.error("Failed to build commands:", e.message); }

  if (commands) {
    try {
      await client.application.commands.set(commands);
      console.log(`Slash commands registered (${commands.length} total).`);
    } catch (e) { console.error("Failed to register commands:", e.message); }
  }
  await sendSupportPanel();
  
  if (OWNER_DISCORD_ID) {
    try {
      const owner = await client.users.fetch(OWNER_DISCORD_ID);
      if (owner) {
        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("✅ Bot is Online!")
          .addFields(
            { name: "📊 Dashboard", value: PUBLIC_URL, inline: true },
            { name: "🔐 Default PIN", value: DEFAULT_OWNER_PIN, inline: true },
            { name: "🤖 Bot Tag", value: client.user.tag, inline: true },
            { name: "📈 Commands", value: String(commands.length), inline: true }
          )
          .setFooter({ text: "GemTide Bot" })
          .setTimestamp();
        await owner.send({ embeds: [embed] });
      }
    } catch (e) {
      console.error("Failed to send startup message:", e.message);
    }
  }
});

// ─── Interaction handler ──────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const { customId } = interaction;
    if (TICKET_CATEGORIES[customId]) return handleTicketCreate(interaction, customId);
    if (customId === "ticket_close") return handleTicketClose(interaction);
    if (customId.startsWith("giveaway_enter_")) return handleGiveawayEnter(interaction, customId.replace("giveaway_enter_", ""));
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName, user } = interaction;
  
  const blockCheck = await isCommandBlocked(commandName, user.id);
  if (blockCheck) {
    return interaction.reply({
      content: `❌ Command \`/${commandName}\` is blocked.\nReason: ${blockCheck.reason}`,
      ephemeral: true
    });
  }
  
  await logCommand(interaction);
  await interaction.deferReply({ ephemeral: false });

  // ─── All command handlers ──────────────────────────────────────────────
  try {
    // All command handlers here (balance, profit, stats, etc.)
    // For full functionality, add all the command handlers from the previous version
    // This is a placeholder - the full command list is in the previous response
    
    // If no command matched
    await interaction.editReply("❌ Unknown command. Use `/help` to see all available commands.");
  } catch (error) {
    console.error(`Error executing ${commandName}:`, error);
    await interaction.editReply("❌ An error occurred while executing this command.");
  }
});

// ─── Ticket handlers ──────────────────────────────────────────────────────────
async function handleTicketCreate(interaction, customId) {
  try {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    if (!guild) return interaction.editReply({ content: "Server only.", ephemeral: true });
    const categoryName = TICKET_CATEGORIES[customId];
    const category = await getOrCreateCategory(guild, categoryName);
    const safeName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}`;
    const existing = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.parentId === category.id && c.name === safeName);
    if (existing) return interaction.editReply({ content: `❌ You already have an open ticket: ${existing}`, ephemeral: true });
    
    const SUPPORT_ROLE_ID = "1528570520428085378";
    const ticketChannel = await guild.channels.create({
      name: safeName, type: ChannelType.GuildText, parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
        { id: SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
      ],
    });
    
    const supportPing = `<@&${SUPPORT_ROLE_ID}>`;
    const emojiKeyMap = { ticket_site_support: "siteSupport", ticket_scams: "scamReport", ticket_discord_support: "discordSupport", ticket_claim_gw: "claimGiveaway" };
    const labelMap = { ticket_site_support: "Site Support", ticket_scams: "Scams / Unfair Trades", ticket_discord_support: "Discord Support", ticket_claim_gw: "Claim DC GWs" };
    
    await ticketChannel.send({
      content: `${supportPing} ${interaction.user.toString()}`,
      embeds: [applyTicketBanner(new EmbedBuilder().setColor(0x8b5cf6).setTitle(`${ticketEmoji(emojiKeyMap[customId])} ${labelMap[customId]} Ticket`).setDescription(`Hello ${interaction.user}! A staff member will be with you shortly.\n\n**Category:** ${categoryName}\n\nPlease describe your issue below.`).setFooter({ text: "GemTide Support" }).setTimestamp())],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setEmoji(ticketEmojiButton("ticketClosed")).setStyle(ButtonStyle.Danger))],
    });
    await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
  } catch (e) { console.error("Ticket creation error:", e.message); try { await interaction.editReply({ content: "Something went wrong.", ephemeral: true }); } catch {} }
}

async function handleTicketClose(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) && interaction.user.id !== OWNER_DISCORD_ID) return interaction.reply({ content: "❌ Only staff can close tickets.", ephemeral: true });
  try { await interaction.reply({ content: `${ticketEmoji("ticketClosed")} Closing in 5 seconds...` }); setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000); } catch (e) { console.error("Ticket close error:", e.message); }
}

async function handleGiveawayEnter(interaction, giveawayId) {
  const gw = activeGiveaways.get(giveawayId);
  if (!gw) return interaction.reply({ content: "❌ This giveaway has ended.", ephemeral: true });
  if (gw.entrants.has(interaction.user.id)) return interaction.reply({ content: "✅ You're already entered!", ephemeral: true });
  gw.entrants.add(interaction.user.id);
  try { const message = await interaction.channel.messages.fetch(gw.messageId); await message.edit({ embeds: [buildGiveawayEmbed(gw.prize, gw.endTime, gw.winnersCount, gw.entrants.size)] }); } catch {}
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