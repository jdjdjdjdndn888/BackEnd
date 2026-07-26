// ═══════════════════════════════════════════════════════════════════════
//  GEMTIDE BOT — Full Configuration (OWNER ROLE FIXED)
// ═══════════════════════════════════════════════════════════════════════

// ─── BOT CONFIG ──────────────────────────────────────────────────────────────
const BOT_TOKEN = "process.env.DISCORD_BOT_TOKEN";
const OWNER_ID = "1367076055416045668";
const OWNER_SITE_ID = 4144534949; // <-- THIS USER MUST HAVE "owner" ROLE IN DATABASE
const SITE_URL = "https://gemtide.win";
const BANNER_URL = "https://gemtide.win/banner/1.png";
const REQUIRED_INVITE_ROLE = "1513016389139697698";
const SAB_AUTO_CHANNEL_ID = "1529813962185768990";

// ─── API CONFIG ──────────────────────────────────────────────────────────────
const API_BASE_URL = "https://api.gemtide.win";
const API_JWT_TOKEN = process.env.API_JWT_TOKEN; // set via environment variable
const TRANSFER_ENDPOINT = "/admin/user-inventory/transfer";

// ─── SCAM DOMAINS TO BLOCK ──────────────────────────────────────────────────
const SCAM_DOMAINS = [
  "bloxyspin.org", "petbet99.com", "psxgems.com", "bloxyden.com",
  "bloxyrun.com", "bloxieflip.com", "bloxyspin", "petbet", "psxgems",
  "bloxyden", "bloxyrun", "bloxieflip", "bloxyflip.com", "bloxyflip.org",
  "petbet.net", "petbet.org", "psxgems.net", "bloxyden.net", "bloxyrun.net",
  "bloxieflip.net", "bloxyspin.net",
];

// ─── AUTO-MOD CONFIG ──────────────────────────────────────────────────────────
const BAD_WORDS = [
  /n[i1]gg[ae3]r?/i, /f[a4]gg[o0]t/i, /k[y7]k[e3]/i,
  /\bf[uú]ck\b/i, /\bsh[i1]t\b/i, /\bb[i1]tch\b/i, /\bc[uú]nt\b/i,
  /\bd[i1]ck\b/i, /\bp[i1]ss\b/i, /\bc[o0]ck\b/i, /\bsl[uú]t\b/i,
  /\bwh[o0]r[e3]\b/i, /\bd[a4]mn\b/i, /\bh[e3]ll\b/i,
  /f[uú]ck[i1]ng?/i, /sh[i1]tty?/i, /b[i1]tch[e3]s?/i,
];

// ─── MongoDB ─────────────────────────────────────────────────────────────────
const MONGO_URI = "process.env.MONGO_URI";
const DB_NAME = "petflippy";

const mongoose = require("mongoose");
mongoose.connect(MONGO_URI, { dbName: DB_NAME })
  .then(() => console.log("[bot] MongoDB connected"))
  .catch((err) => console.error("[bot] MongoDB failed:", err.message));

// ─── Models ───────────────────────────────────────────────────────────────────
const { Schema } = mongoose;

const users = mongoose.model("users", new Schema({
  userid: Number, username: String, discordid: String, discordusername: String,
  thumbnail: String, rank: String,
  balance: { type: Number, default: 0 },
  wager: { type: Number, default: 0 },
  deposited: { type: Number, default: 0 },
  won: { type: Number, default: 0 },
  lost: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  banned: { type: Boolean, default: false },
}, { strict: false }));

const items = mongoose.model("items", new Schema({
  itemid: Number, itemname: String, itemvalue: Number, itemimage: String, game: String,
}));

const bots = mongoose.model("bots", new Schema({
  name: { type: String, required: true }, pfp: { type: String, required: true },
  userid: { type: Number, required: true }, link: { type: String, default: "" },
  game: { type: String, required: true }, online: { type: Boolean, default: true },
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

// ─── Invite System Models ──────────────────────────────────────────────────
const inviteSettings = mongoose.model("inviteSettings", new Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: "" },
  logChannelId: { type: String, default: "" },
  rewardPerInvite: { type: Number, default: 0 },
  enabled: { type: Boolean, default: false },
  paused: { type: Boolean, default: false },
  panelMessageId: { type: String, default: "" },
}, { strict: false }));

const inviteRecord = mongoose.model("inviteRecord", new Schema({
  guildId: { type: String, required: true },
  inviterId: { type: String, required: true },
  inviteeId: { type: String, required: true },
  inviteCode: { type: String, default: "" },
  joinedAt: { type: Date, default: Date.now },
  claimed: { type: Boolean, default: false },
  isRejoin: { type: Boolean, default: false },
  leftAt: { type: Date, default: null },
  paid: { type: Boolean, default: false },
}, { strict: false }));

const memberHistory = mongoose.model("memberHistory", new Schema({
  guildId: { type: String, required: true },
  memberId: { type: String, required: true },
  firstJoinedAt: { type: Date, default: Date.now },
  hasEverLeft: { type: Boolean, default: false },
}, { strict: false }));

// ─── Auto-Mod Log Model ──────────────────────────────────────────────────────
const modLogs = mongoose.model("modLogs", new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  message: { type: String, required: true },
  channelId: { type: String, required: true },
  channelName: { type: String, required: true },
  matchedWord: { type: String, required: true },
  action: { type: String, default: "deleted" },
  timestamp: { type: Date, default: Date.now },
}, { strict: false }));

// ─── Transaction Log Model ──────────────────────────────────────────────────
const transactionLogs = mongoose.model("transactionLogs", new Schema({
  type: { type: String, enum: ['invite_claim', 'inventory_transfer', 'admin_action', 'api_test'], required: true },
  fromUserId: { type: Number, required: true },
  toUserId: { type: Number, required: true },
  itemId: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  value: { type: Number, required: true },
  discordUserId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  error: { type: String, default: "" },
  methodUsed: { type: String, default: "" },
}, { strict: false }));

// ─── In-memory state ─────────────────────────────────────────────────────────
const activeGiveaways = new Map();
const inviteCache = new Map();
const sabProcessing = new Set();
const userWarnings = new Map();

// ─── Discord.js ───────────────────────────────────────────────────────────────
const {
  Client, GatewayIntentBits, SlashCommandBuilder, ActivityType,
  EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ChannelType,
} = require("discord.js");

// ─── File System ────────────────────────────────────────────────────────────
const path = require("path");
const fs = require("fs");

// ─── Rejoin Tracking File ──────────────────────────────────────────────────
const REJOIN_FILE = path.join(__dirname, "rejoin_ids.json");
let rejoinIds = new Set();

function loadRejoinIds() {
  try {
    if (fs.existsSync(REJOIN_FILE)) {
      const data = fs.readFileSync(REJOIN_FILE, 'utf8');
      const parsed = JSON.parse(data);
      rejoinIds = new Set(parsed);
      console.log(`[Rejoin] Loaded ${rejoinIds.size} rejoin IDs from file`);
    } else {
      console.log('[Rejoin] No rejoin file found, creating new one');
      saveRejoinIds();
    }
  } catch (error) {
    console.error('[Rejoin] Failed to load rejoin IDs:', error);
    rejoinIds = new Set();
  }
}

function saveRejoinIds() {
  try {
    fs.writeFileSync(REJOIN_FILE, JSON.stringify([...rejoinIds]), 'utf8');
  } catch (error) {
    console.error('[Rejoin] Failed to save rejoin IDs:', error);
  }
}

function addRejoinId(memberId) {
  rejoinIds.add(memberId);
  saveRejoinIds();
}

function isRejoin(memberId) {
  return rejoinIds.has(memberId);
}

// ─── Save all existing members on startup ──────────────────────────────────
async function saveAllExistingMembers(guild) {
  try {
    await guild.members.fetch();
    const members = guild.members.cache;
    let count = 0;
    for (const [id, member] of members) {
      if (!member.user.bot) {
        addRejoinId(id);
        count++;
      }
    }
    console.log(`[Rejoin] Saved ${count} existing members to rejoin tracking for ${guild.name}`);
  } catch (error) {
    console.error('[Rejoin] Failed to save existing members:', error.message);
  }
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
    GatewayIntentBits.GuildInvites,
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
  return i.user.id === OWNER_ID;
}

function fmtBal(n) {
  if (!n || n === 0) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

function applyBanner(e) { if (BANNER_URL) e.setImage(BANNER_URL); return e; }
function fmt(n) { return (n || 0).toLocaleString(); }
function fmtMs(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ─── API Transfer Function ──────────────────────────────────────────────────
// Looks up N unlocked inventory items owned by OWNER_SITE_ID with the given
// itemid number, then calls the backend /admin/user-inventory/transfer endpoint
// with the real inventory document _ids. The backend does NOT accept itemId+quantity.
async function fetchOwnerInventoryItems(gemItemid, quantity) {
  return inventorys.find(
    { owner: OWNER_SITE_ID, itemid: String(gemItemid), locked: { $ne: true } },
    { _id: 1 }
  ).limit(quantity).lean();
}

async function transferGemsViaAPI(fromUserId, toUserId, inventoryIds) {
  try {
    const url = `${API_BASE_URL}${TRANSFER_ENDPOINT}`;
    console.log(`[API] Transferring ${inventoryIds.length} item(s) from ${fromUserId} to ${toUserId}`);
    console.log(`[API] URL: ${url}`);

    const bodyData = { fromUserId, toUserId, inventoryIds };
    console.log(`[API] Body:`, JSON.stringify(bodyData, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_JWT_TOKEN}`
      },
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[API] Transfer successful:', data);
      return { success: true, data };
    }

    console.log(`[API] Transfer failed with status ${response.status}:`, data);

    if (response.status === 403) {
      return {
        success: false,
        error: `Permission denied (403). User ${fromUserId} does not have admin/owner permissions.`,
        details: data
      };
    }

    return {
      success: false,
      error: `API Error (${response.status}): ${JSON.stringify(data)}`,
      details: data
    };

  } catch (error) {
    console.error('[API] Transfer failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── /checkowner Command ──────────────────────────────────────────────────
async function handleCheckOwner(interaction) {
  if (!isOwner(interaction)) {
    return interaction.editReply({ content: "❌ Owner only command.", ephemeral: true });
  }

  try {
    // Check the owner user in database
    const ownerUser = await users.findOne({ userid: OWNER_SITE_ID }).lean();
    
    const embed = new EmbedBuilder()
      .setColor(ownerUser ? 0x00FF00 : 0xFF4444)
      .setTitle("🔍 Owner Account Check")
      .addFields(
        { name: "Owner Site ID", value: String(OWNER_SITE_ID), inline: true },
        { name: "Found in Database", value: ownerUser ? "✅ Yes" : "❌ No", inline: true },
      )
      .setTimestamp();

    if (ownerUser) {
      embed.addFields(
        { name: "Username", value: ownerUser.username || "Unknown", inline: true },
        { name: "Rank", value: ownerUser.rank || "USER", inline: true },
        { name: "Has Owner Role", value: ownerUser.rank?.toLowerCase() === "owner" ? "✅ Yes" : "❌ No", inline: true },
        { name: "Discord Linked", value: ownerUser.discordid ? `✅ <@${ownerUser.discordid}>` : "❌ Not linked", inline: true },
        { name: "⚠️ Important", value: ownerUser.rank?.toLowerCase() !== "owner" ? "**This user does NOT have the 'owner' rank!** Set rank to 'owner' in database." : "✅ Owner rank is set correctly.", inline: false },
      );
    } else {
      embed.addFields(
        { name: "⚠️ Warning", value: `User ID ${OWNER_SITE_ID} not found in the users collection!`, inline: false }
      );
    }

    applyBanner(embed);
    return interaction.editReply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error("[ERROR] CheckOwner failed:", error);
    return interaction.editReply({ 
      content: `❌ Failed to check owner: ${error.message}`,
      ephemeral: true 
    });
  }
}

// ─── /setownerrank Command ──────────────────────────────────────────────────
async function handleSetOwnerRank(interaction) {
  if (!isOwner(interaction)) {
    return interaction.editReply({ content: "❌ Owner only command.", ephemeral: true });
  }

  try {
    // Update the user's rank to "owner"
    const result = await users.findOneAndUpdate(
      { userid: OWNER_SITE_ID },
      { $set: { rank: "owner" } },
      { new: true, upsert: true }
    ).lean();

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle("✅ Owner Rank Set")
      .addFields(
        { name: "User ID", value: String(OWNER_SITE_ID), inline: true },
        { name: "Username", value: result?.username || "Unknown", inline: true },
        { name: "Rank Set To", value: "owner ✅", inline: true },
        { name: "Status", value: "The user now has the 'owner' rank in the database!", inline: false },
      )
      .setTimestamp();

    applyBanner(embed);
    return interaction.editReply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error("[ERROR] SetOwnerRank failed:", error);
    return interaction.editReply({ 
      content: `❌ Failed to set owner rank: ${error.message}`,
      ephemeral: true 
    });
  }
}

// ─── Auto-Mod Functions ──────────────────────────────────────────────────────
function containsBadWord(text) {
  for (const pattern of BAD_WORDS) {
    if (pattern.test(text)) {
      return pattern.source;
    }
  }
  return null;
}

function containsScamLink(text) {
  const lowerText = text.toLowerCase();
  for (const domain of SCAM_DOMAINS) {
    if (lowerText.includes(domain.toLowerCase())) {
      return domain;
    }
    if (lowerText.includes('discord.gg/') || lowerText.includes('discord.com/invite/')) {
      return 'discord invite link';
    }
  }
  return null;
}

async function handleAutoMod(message) {
  if (message.author.bot) return;
  if (message.author.id === OWNER_ID) return;
  if (!message.content) return;
  
  const scamMatch = containsScamLink(message.content);
  if (scamMatch) {
    const member = message.member;
    if (member?.permissions?.has(PermissionFlagsBits.Administrator)) return;
    if (member?.permissions?.has(PermissionFlagsBits.ManageMessages)) return;
    
    await modLogs.create({
      userId: message.author.id,
      username: message.author.username,
      message: message.content,
      channelId: message.channel.id,
      channelName: message.channel.name,
      matchedWord: `SCAM LINK: ${scamMatch}`,
      action: "deleted",
      timestamp: new Date(),
    });
    
    try { await message.delete(); } catch (e) {}
    
    const key = `${message.guild?.id}_${message.author.id}`;
    if (!userWarnings.has(key)) userWarnings.set(key, []);
    userWarnings.get(key).push({
      reason: `Scam link: ${scamMatch}`,
      timestamp: new Date().toISOString(),
      channel: message.channel.name,
    });
    
    try {
      const warnEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle("⚠️ Auto-Mod Warning - Scam Link Detected")
        .setDescription(`Your message in **#${message.channel.name}** was removed for posting a scam link.`)
        .addFields(
          { name: "Detected Link", value: `\`${scamMatch}\``, inline: true },
          { name: "Warning Count", value: String(userWarnings.get(key).length), inline: true },
        )
        .setFooter({ text: "GemTide • Auto-Mod System" })
        .setTimestamp();
      await message.author.send({ embeds: [warnEmbed] }).catch(() => {});
    } catch {}
    
    try {
      const warningMsg = await message.channel.send({
        content: `⚠️ **${message.author.username}**, your message was removed for posting a scam link. (Warning #${userWarnings.get(key).length})`,
      });
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
    } catch {}
    return;
  }
  
  const matchedWord = containsBadWord(message.content);
  if (!matchedWord) return;
  
  const member = message.member;
  if (member?.permissions?.has(PermissionFlagsBits.Administrator)) return;
  if (member?.permissions?.has(PermissionFlagsBits.ManageMessages)) return;
  
  await modLogs.create({
    userId: message.author.id,
    username: message.author.username,
    message: message.content,
    channelId: message.channel.id,
    channelName: message.channel.name,
    matchedWord: matchedWord,
    action: "deleted",
    timestamp: new Date(),
  });
  
  try { await message.delete(); } catch (e) {}
  
  const key = `${message.guild?.id}_${message.author.id}`;
  if (!userWarnings.has(key)) userWarnings.set(key, []);
  userWarnings.get(key).push({
    reason: `Bad word: ${matchedWord}`,
    timestamp: new Date().toISOString(),
    channel: message.channel.name,
  });
  
  const warnCount = userWarnings.get(key).length;
  
  try {
    const warnEmbed = new EmbedBuilder()
      .setColor(0xFF4444)
      .setTitle("⚠️ Auto-Mod Warning")
      .setDescription(`Your message in **#${message.channel.name}** was removed for using inappropriate language.`)
      .addFields(
        { name: "Detected Word", value: `\`${matchedWord}\``, inline: true },
        { name: "Warning Count", value: String(warnCount), inline: true },
        { name: "Message", value: message.content.substring(0, 100), inline: false },
      )
      .setFooter({ text: "GemTide • Auto-Mod System" })
      .setTimestamp();
    await message.author.send({ embeds: [warnEmbed] }).catch(() => {});
  } catch {}
  
  try {
    const warningMsg = await message.channel.send({
      content: `⚠️ **${message.author.username}**, your message was removed for using inappropriate language. (Warning #${warnCount})`,
    });
    setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
  } catch {}
}

// ─── SAB Auto-Processing ─────────────────────────────────────────────────────
async function processSABImage(message) {
  if (message.channel.id !== SAB_AUTO_CHANNEL_ID) return;
  if (message.author.id !== OWNER_ID) return;
  if (sabProcessing.has(message.author.id)) return;
  
  const attachment = message.attachments.first();
  if (!attachment) return;
  
  const validExts = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  const ext = path.extname(attachment.name || ".png").toLowerCase();
  if (!validExts.includes(ext)) return;
  
  const content = message.content || "";
  
  let petName = "", petValue = 0, mutationsStr = "";
  
  const valueMatch = content.match(/[Vv]alue\s*:\s*([\d.]+)\s*([kmb])?/i) || 
                     content.match(/([\d.]+)\s*([kmb])\s*(?:\||$)/i) ||
                     content.match(/([\d.]+)\s*([kmb])?\s*$/i);
  
  if (!valueMatch) {
    await message.reply("❌ Please include a value like `5m`, `1b`, or `Value: 5000`\nExample: `lichi 5m`");
    return;
  }
  
  const num = parseFloat(valueMatch[1]);
  const suffix = valueMatch[2] ? valueMatch[2].toLowerCase() : '';
  
  if (suffix === 'k') petValue = num * 1000;
  else if (suffix === 'm') petValue = num * 1000000;
  else if (suffix === 'b') petValue = num * 1000000000;
  else petValue = num;
  
  petValue = Math.round(petValue);
  
  let cleanContent = content.replace(/[Vv]alue\s*:\s*[\d.]+[kmb]?\s*/i, "");
  cleanContent = cleanContent.replace(/\b[\d.]+[kmb]?\b/g, "").trim();
  
  const mutationsMatch = cleanContent.match(/[Mm]utations?\s*:\s*(.+?)(?:\s*\||\s*$)/);
  if (mutationsMatch) {
    mutationsStr = mutationsMatch[1].trim();
    cleanContent = cleanContent.replace(/[Mm]utations?\s*:\s*.+?(?:\s*\||\s*$)/, "").trim();
  }
  
  if (cleanContent.includes(" -- ")) {
    const parts = cleanContent.split(" -- ");
    if (!mutationsStr && parts[0].trim()) mutationsStr = parts[0].trim();
    petName = parts[1].trim();
  } else {
    petName = cleanContent.trim();
  }
  
  petName = petName.replace(/\s*\|\s*$/, "").trim();
  
  if (!petName) {
    await message.reply("❌ Could not extract pet name.\nExamples:\n- `lichi 5m`\n- `Diamond Cat 5m`\n- `Diamond, Rainbow -- Diamond Cat | Value: 5m`");
    return;
  }
  
  const existing = await items.findOne({ 
    itemname: new RegExp(`^${escapeRegex(petName)}$`, "i"), 
    game: "SAB" 
  }).lean();
  
  if (existing) {
    await message.reply(`❌ Pet **${petName}** already exists! (ID: ${existing.itemid})`);
    return;
  }
  
  sabProcessing.add(message.author.id);
  
  try {
    const filename = `sab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const sabDir = path.join(__dirname, "public", "sab-images");
    const savePath = path.join(sabDir, filename);
    const imageUrl = `https://api.gemtide.win/sab-images/${filename}`;
    
    if (!fs.existsSync(sabDir)) fs.mkdirSync(sabDir, { recursive: true });
    
    const imgRes = await fetch(attachment.url);
    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
    fs.writeFileSync(savePath, Buffer.from(await imgRes.arrayBuffer()));
    
    const maxItem = await items.findOne().sort({ itemid: -1 }).select("itemid").lean();
    const itemid = (maxItem?.itemid || 0) + 1;
    
    await items.create({
      itemid, itemname: petName, itemvalue: petValue, itemimage: imageUrl, game: "SAB"
    });
    
    let displayValue = petValue.toLocaleString();
    if (petValue >= 1e9) displayValue = (petValue / 1e9).toFixed(2) + 'B';
    else if (petValue >= 1e6) displayValue = (petValue / 1e6).toFixed(2) + 'M';
    else if (petValue >= 1e3) displayValue = (petValue / 1e3).toFixed(1) + 'K';
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle("✅ SAB Pet Auto-Added")
      .setThumbnail(attachment.url)
      .addFields(
        { name: "Name", value: petName, inline: true },
        { name: "Value", value: displayValue, inline: true },
        { name: "Game", value: "SAB", inline: true },
        { name: "Item ID", value: String(itemid), inline: true },
        { name: "Image", value: imageUrl, inline: false },
      )
      .setFooter({ text: `Auto-added in #${message.channel.name}` })
      .setTimestamp();
    
    if (mutationsStr) embed.addFields({ name: "Mutations", value: mutationsStr, inline: false });
    applyBanner(embed);
    
    await message.reply({ embeds: [embed] });
    console.log(`[SAB] Added: ${petName} (${petValue})`);
    
  } catch (error) {
    console.error("[SAB] Error:", error);
    await message.reply(`❌ Failed: ${error.message}`);
  } finally {
    sabProcessing.delete(message.author.id);
  }
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

// ─── Invite Claim Handler ──────────────────────────────────────────────────
async function handleInviteClaim(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) return interaction.editReply({ content: "❌ Server only.", ephemeral: true });

  const cfg = await inviteSettings.findOne({ guildId: guild.id }).lean();
  if (!cfg || !cfg.enabled) return interaction.editReply({ content: "❌ Invite rewards not active.", ephemeral: true });
  if (cfg.paused) return interaction.editReply({ content: "⏳ Invite rewards are paused. Please wait for restock.", ephemeral: true });

  const inviterAccount = await users.findOne({ discordid: interaction.user.id }).lean();
  if (!inviterAccount) {
    return interaction.editReply({ 
      content: `❌ Your Discord is not linked to a GemTide account. Use \`/link YOUR_USERNAME\` to link your account.`,
      ephemeral: true 
    });
  }

  const unclaimed = await inviteRecord.find({ 
    guildId: guild.id, 
    inviterId: interaction.user.id, 
    isRejoin: false, 
    claimed: false,
    paid: false
  }).lean();
  
  if (!unclaimed.length) return interaction.editReply({ content: "❌ No unclaimed invites. Invite friends and make sure they verify!", ephemeral: true });

  const validInvites = [];
  const pendingInvites = [];
  
  for (const rec of unclaimed) {
    try {
      const member = await guild.members.fetch(rec.inviteeId);
      if (member?.roles.cache.has(REQUIRED_INVITE_ROLE)) {
        validInvites.push(rec);
      } else {
        pendingInvites.push(rec);
      }
    } catch {
      await inviteRecord.findByIdAndUpdate(rec._id, { $set: { leftAt: new Date() } });
    }
  }

  if (!validInvites.length) {
    let msg = `❌ None of your invitees have the <@&${REQUIRED_INVITE_ROLE}> role yet.`;
    if (pendingInvites.length) {
      msg += `\n\n⏳ **${pendingInvites.length}** invitee${pendingInvites.length > 1 ? "s are" : " is"} still pending verification.`;
    }
    return interaction.editReply({ content: msg, ephemeral: true });
  }

  const reward = validInvites.length * cfg.rewardPerInvite;

  const allItems = await items.find({}).lean();
  let gemItem = null;
  for (const it of allItems) {
    if (it.itemname && /^100m\s*gems?$/i.test(it.itemname.trim())) {
      gemItem = it;
      break;
    }
  }

  if (!gemItem) {
    return interaction.editReply({ 
      content: "❌ '100m gems' item not found in the database. Please create it with `/createitem`.",
      ephemeral: true 
    });
  }

  const validIds = validInvites.map(r => r._id);

  // Look up actual inventory items owned by the site owner — the API needs their real _ids
  const invDocs = await fetchOwnerInventoryItems(gemItem.itemid, validInvites.length);
  if (invDocs.length < validInvites.length) {
    return interaction.editReply({
      content: `❌ Not enough 100m gems in the owner\'s inventory. Needed: **${validInvites.length}**, Available: **${invDocs.length}**. Please contact the owner to restock.`,
      ephemeral: true
    });
  }
  const inventoryIds = invDocs.map(d => d._id.toString());

  const transferResult = await transferGemsViaAPI(OWNER_SITE_ID, inviterAccount.userid, inventoryIds);

  if (!transferResult.success) {
    await transactionLogs.create({
      type: 'invite_claim',
      fromUserId: OWNER_SITE_ID,
      toUserId: inviterAccount.userid,
      itemId: gemItem._id.toString(),
      quantity: validInvites.length,
      value: reward,
      discordUserId: interaction.user.id,
      status: 'failed',
      error: transferResult.error,
    });
    
    return interaction.editReply({ 
      content: `❌ Failed to claim rewards: ${transferResult.error}\n\nPlease contact the owner. The invites are still available to claim once the issue is fixed.`,
      ephemeral: true 
    });
  }

  await inviteRecord.updateMany(
    { _id: { $in: validIds } },
    { $set: { paid: true, claimed: true } }
  );

  await transactionLogs.create({
    type: 'invite_claim',
    fromUserId: OWNER_SITE_ID,
    toUserId: inviterAccount.userid,
    itemId: gemItem._id.toString(),
    quantity: validInvites.length,
    value: reward,
    discordUserId: interaction.user.id,
    status: 'completed',
  });

  let responseMsg = `✅ Claimed **${validInvites.length} x 100m gems** (${fmtBal(reward)} value) for ${validInvites.length} invite${validInvites.length > 1 ? "s" : ""}!`;
  if (pendingInvites.length) {
    responseMsg += `\n\n⏳ ${pendingInvites.length} invitee${pendingInvites.length > 1 ? "s are" : " is"} still pending verification.`;
  }

  return interaction.editReply({ content: responseMsg, ephemeral: true });
}

// ─── /addvalidinvites Command ──────────────────────────────────────────────────
async function handleAddValidInvites(interaction) {
  if (!isOwner(interaction)) {
    return interaction.editReply({ content: "❌ Owner only command.", ephemeral: true });
  }
  
  const target = interaction.options.getUser("user");
  const count = interaction.options.getInteger("count");
  const guild = interaction.guild;
  
  if (!guild) return interaction.editReply({ content: "❌ Server only.", ephemeral: true });

  try {
    const user = await users.findOne({ discordid: target.id }).lean();
    if (!user) {
      return interaction.editReply({ 
        content: `❌ **${target.username}** is not linked to any GemTide account. Use \`/link\` first.`,
        ephemeral: true 
      });
    }

    const inviteDocs = [];
    for (let i = 0; i < count; i++) {
      inviteDocs.push({
        guildId: guild.id,
        inviterId: target.id,
        inviteeId: `valid_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        inviteCode: `valid_${Math.random().toString(36).slice(2, 8)}`,
        joinedAt: new Date(),
        claimed: false,
        paid: false,
        isRejoin: false,
        leftAt: null,
      });
    }
    
    await inviteRecord.insertMany(inviteDocs);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle("✅ Valid Invites Added")
      .setDescription(`Added **${count}** valid invites to **${target.username}**. They can now claim them via the invite panel.`)
      .addFields(
        { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
        { name: "Invites Added", value: String(count), inline: true },
        { name: "Linked Account", value: user.username, inline: true },
        { name: "💡 Note", value: "These invites are ready to be claimed. The user needs to click the Claim Rewards button.", inline: false },
      )
      .setFooter({ text: `Added by ${interaction.user.username}` })
      .setTimestamp();
    applyBanner(embed);
    
    return interaction.editReply({ embeds: [embed], ephemeral: true });
    
  } catch (error) {
    console.error("[ERROR] AddValidInvites failed:", error);
    return interaction.editReply({ 
      content: `❌ Failed to add valid invites: ${error.message}`,
      ephemeral: true 
    });
  }
}

// ─── /forceclaim Command ──────────────────────────────────────────────────
async function handleForceClaim(interaction) {
  if (!isOwner(interaction)) {
    return interaction.editReply({ content: "❌ Owner only command.", ephemeral: true });
  }
  
  const target = interaction.options.getUser("user");
  const guild = interaction.guild;
  
  if (!guild) return interaction.editReply({ content: "❌ Server only.", ephemeral: true });

  try {
    const user = await users.findOne({ discordid: target.id }).lean();
    if (!user) {
      return interaction.editReply({ 
        content: `❌ **${target.username}** is not linked to any GemTide account.`,
        ephemeral: true 
      });
    }

    const unclaimed = await inviteRecord.find({ 
      guildId: guild.id, 
      inviterId: target.id, 
      isRejoin: false, 
      claimed: false,
      paid: false
    }).lean();
    
    if (!unclaimed.length) {
      return interaction.editReply({ 
        content: `❌ **${target.username}** has no unclaimed invites.`,
        ephemeral: true 
      });
    }

    const validIds = unclaimed.map(r => r._id);
    
    const allItems = await items.find({}).lean();
    let gemItem = null;
    for (const it of allItems) {
      if (it.itemname && /^100m\s*gems?$/i.test(it.itemname.trim())) {
        gemItem = it;
        break;
      }
    }

    if (!gemItem) {
      return interaction.editReply({ 
        content: "❌ '100m gems' item not found in the database.",
        ephemeral: true 
      });
    }

    // Look up actual inventory items owned by the site owner — the API needs their real _ids
    const invDocs = await fetchOwnerInventoryItems(gemItem.itemid, unclaimed.length);
    if (invDocs.length < unclaimed.length) {
      return interaction.editReply({
        content: `❌ Not enough 100m gems in the owner\'s inventory. Needed: **${unclaimed.length}**, Available: **${invDocs.length}**. Please contact the owner to restock.`,
        ephemeral: true
      });
    }
    const inventoryIds = invDocs.map(d => d._id.toString());

    const transferResult = await transferGemsViaAPI(OWNER_SITE_ID, user.userid, inventoryIds);

    if (!transferResult.success) {
      return interaction.editReply({ 
        content: `❌ Failed to transfer gems: ${transferResult.error}`,
        ephemeral: true 
      });
    }

    await inviteRecord.updateMany(
      { _id: { $in: validIds } },
      { $set: { paid: true, claimed: true } }
    );

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle("✅ Force Claim Completed")
      .setDescription(`Manually claimed **${unclaimed.length} x 100m gems** for **${target.username}**.`)
      .addFields(
        { name: "User", value: `${target.tag} (<@${target.id}>)`, inline: true },
        { name: "Amount", value: `${unclaimed.length} x 100m gems`, inline: true },
        { name: "Status", value: "✅ Transferred", inline: true },
      )
      .setFooter({ text: `Force claimed by ${interaction.user.username}` })
      .setTimestamp();
    applyBanner(embed);
    
    return interaction.editReply({ embeds: [embed], ephemeral: true });
    
  } catch (error) {
    console.error("[ERROR] ForceClaim failed:", error);
    return interaction.editReply({ 
      content: `❌ Failed to force claim: ${error.message}`,
      ephemeral: true 
    });
  }
}

// ─── /link ──────────────────────────────────────────────────────────
async function handleLink(interaction) {
  const username = interaction.options.getString("username");
  
  const already = await users.findOne({ discordid: interaction.user.id }).lean();
  if (already) {
    return interaction.editReply(`✅ Already linked to **${already.username}** (Roblox ID: ${already.userid}). Use \`/unlink\` to disconnect.`);
  }
  
  const userToLink = await users.findOne({ 
    username: new RegExp(`^${escapeRegex(username)}$`, "i") 
  }).lean();
  
  if (!userToLink) {
    return interaction.editReply(`❌ User **${username}** not found on GemTide. Please check the username and try again.`);
  }
  
  if (userToLink.discordid) {
    let linkedUserInfo = "Unknown User";
    try {
      const linkedUser = await client.users.fetch(userToLink.discordid);
      if (linkedUser) {
        linkedUserInfo = `${linkedUser.tag} (<@${linkedUser.id}>)`;
      }
    } catch (error) {
      console.log(`[Link] Could not fetch Discord user ${userToLink.discordid}:`, error.message);
      linkedUserInfo = `Unknown User (ID: ${userToLink.discordid})`;
    }
    
    return interaction.editReply(`❌ **${username}** is already linked to another Discord account: **${linkedUserInfo}**.`);
  }
  
  await users.findOneAndUpdate(
    { userid: userToLink.userid },
    { 
      $set: { 
        discordid: interaction.user.id,
        discordusername: interaction.user.username 
      } 
    }
  );
  
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle("✅ Discord Linked Successfully!")
    .setDescription(
      `**${interaction.user.username}** has been linked to **${userToLink.username}**!\n\n` +
      `You can now use all GemTide commands:\n` +
      `• \`/balance\` - Check your balance\n` +
      `• \`/stats\` - View your stats\n` +
      `• \`/inventory\` - Browse your items\n` +
      `• \`/withdraws\` - Check withdrawals\n` +
      `• And more!`
    )
    .addFields(
      { name: "Linked Account", value: userToLink.username, inline: true },
      { name: "Roblox ID", value: String(userToLink.userid), inline: true },
      { name: "Rank", value: userToLink.rank || "USER", inline: true },
    )
    .setFooter({ text: "GemTide • Account Linked" })
    .setTimestamp();
  applyBanner(embed);
  
  return interaction.editReply({ embeds: [embed] });
}

// ─── Beautiful Invite Panel ──────────────────────────────────────────────────
function buildBeautifulInvitePanel(reward) {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("🎁 **GemTide Invite Rewards**")
    .setDescription(
      "═══════════════════════════════════\n" +
      "**EARN GEMS BY INVITING FRIENDS!**\n" +
      "═══════════════════════════════════\n\n" +
      `💎 **Reward:** ${fmtBal(reward)} gems per valid invite\n\n` +
      "**📋 How It Works:**\n" +
      "• Invite friends to the server\n" +
      "• They must receive the <@&" + REQUIRED_INVITE_ROLE + "> role\n" +
      "• Rejoins do **not** count\n" +
      "• **Claimed invites are reset** — invite again for more rewards!\n" +
      "• Pending invites stay until the user verifies\n\n" +
      "**📊 Invite Status:**\n" +
      "🟢 Verified & Claimable\n" +
      "🟡 Pending Verification\n" +
      "🔴 Left Server (Invalid)\n\n" +
      "Click **Claim Rewards** below to collect your gems!\n\n" +
      "═══════════════════════════════════"
    )
    .setFooter({ text: "GemTide Invite System • Click the button below to claim" })
    .setTimestamp();
  applyBanner(embed);
  return embed;
}

// ─── clientReady ──────────────────────────────────────────────────────────────
client.once("clientReady", async () => {
  console.log(`✅ GemTide bot online as ${client.user.tag}`);
  console.log(`🔍 Finding 100m gems by NAME`);
  console.log(`🌐 Using API for transfers: ${API_BASE_URL}${TRANSFER_ENDPOINT}`);
  console.log(`🛡️ Auto-Mod enabled with ${BAD_WORDS.length} patterns`);
  console.log(`🚫 Blocking ${SCAM_DOMAINS.length} scam domains`);
  
  loadRejoinIds();
  
  for (const [, guild] of client.guilds.cache) {
    await saveAllExistingMembers(guild);
  }
  
  console.log(`[Rejoin] Total tracked IDs: ${rejoinIds.size}`);
  
  client.user.setPresence({ activities: [{ name: "GemTide.Win", type: ActivityType.Playing }], status: "online" });

  const gemItem = await items.findOne({ 
    itemname: { $regex: /^100m\s*gems?$/i }
  }).lean();
  
  if (gemItem) {
    console.log(`✅ Found 100m gems item: "${gemItem.itemname}" (ID: ${gemItem.itemid}, _id: ${gemItem._id})`);
  } else {
    console.warn(`⚠️ WARNING: 100m gems item not found in database!`);
  }

  // Check owner's rank
  const ownerUser = await users.findOne({ userid: OWNER_SITE_ID }).lean();
  if (ownerUser) {
    console.log(`📊 Owner user: "${ownerUser.username}" (ID: ${ownerUser.userid})`);
    console.log(`📊 Owner rank: "${ownerUser.rank}"`);
    if (ownerUser.rank?.toLowerCase() !== "owner") {
      console.warn(`⚠️ WARNING: Owner user does NOT have "owner" rank! Set rank to "owner" in database.`);
    } else {
      console.log(`✅ Owner has "owner" rank correctly.`);
    }
  } else {
    console.warn(`⚠️ WARNING: Owner user ID ${OWNER_SITE_ID} not found in database!`);
  }

  if (API_JWT_TOKEN === "YOUR_JWT_TOKEN_HERE") {
    console.warn(`⚠️ WARNING: JWT Token not set! Please add your JWT token at the top of the file.`);
  } else {
    console.log(`✅ JWT Token is set (length: ${API_JWT_TOKEN.length} chars)`);
  }

  for (const [, guild] of client.guilds.cache) {
    try {
      const inv = await guild.invites.fetch();
      const m = new Map();
      for (const [code, i] of inv) m.set(code, i.uses || 0);
      inviteCache.set(guild.id, m);
    } catch {}
  }

  const commands = [
    // ── User Commands ────────────────────────────────────────────────────
    new SlashCommandBuilder().setName("balance").setDescription("Your GemTide balance"),
    new SlashCommandBuilder().setName("stats").setDescription("Your full GemTide statistics"),
    new SlashCommandBuilder().setName("inventory").setDescription("Browse your inventory").addIntegerOption(o => o.setName("page").setDescription("Page").setMinValue(1)),
    new SlashCommandBuilder().setName("history").setDescription("Your transaction history").addIntegerOption(o => o.setName("page").setDescription("Page").setMinValue(1)),
    new SlashCommandBuilder().setName("profile").setDescription("View a user's profile").addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Top wagerers"),
    new SlashCommandBuilder().setName("richest").setDescription("Top balances"),
    new SlashCommandBuilder().setName("withdraws").setDescription("Your pending withdrawals"),
    new SlashCommandBuilder().setName("cancelallwithdraws").setDescription("Cancel all pending withdrawals"),
    new SlashCommandBuilder().setName("deposit").setDescription("Active deposit bots"),
    new SlashCommandBuilder().setName("games").setDescription("All games on GemTide"),
    new SlashCommandBuilder().setName("sitestats").setDescription("Site-wide statistics"),
    new SlashCommandBuilder().setName("activecoinflips").setDescription("Active coinflips"),
    new SlashCommandBuilder().setName("jackpotstats").setDescription("Current jackpot"),
    
    // ── Invite Commands ──────────────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("invites")
      .setDescription("Manage your invites")
      .addSubcommand(s => s.setName("stats").setDescription("View your invite stats")),
    
    new SlashCommandBuilder()
      .setName("sendinvite")
      .setDescription("Owner — Set up invite rewards")
      .addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true))
      .addIntegerOption(o => o.setName("reward_millions").setDescription("Gems per invite (millions)").setRequired(true).addChoices(
        { name: "100M", value: 100 }, { name: "200M", value: 200 },
        { name: "300M", value: 300 }, { name: "400M", value: 400 },
        { name: "500M", value: 500 }, { name: "600M", value: 600 },
        { name: "700M", value: 700 }, { name: "800M", value: 800 },
        { name: "900M", value: 900 }, { name: "1B", value: 1000 }
      )),
    
    new SlashCommandBuilder()
      .setName("pauseinvites")
      .setDescription("Owner — Pause/resume invites")
      .addStringOption(o => o.setName("action").setDescription("pause or resume").setRequired(true).addChoices(
        { name: "Pause", value: "pause" }, { name: "Resume", value: "resume" }
      )),
    
    new SlashCommandBuilder()
      .setName("setlogchannel")
      .setDescription("Owner — Set invite log channel")
      .addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true)),
    
    // ── Reset Invites Commands ────────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("resetinvites")
      .setDescription("Owner — Reset a user's invites")
      .addUserOption(o => o.setName("user").setDescription("User to reset").setRequired(true)),
    
    new SlashCommandBuilder()
      .setName("resetallinvites")
      .setDescription("Owner — Reset ALL invites for everyone"),
    
    // ── Add Valid Invites Command ────────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("addvalidinvites")
      .setDescription("Owner — Add valid invites to a user (ready to claim)")
      .addUserOption(o => o.setName("user").setDescription("User to add invites to").setRequired(true))
      .addIntegerOption(o => o.setName("count").setDescription("Number of valid invites to add").setRequired(true).setMinValue(1).setMaxValue(50)),
    
    // ── Force Claim Command ────────────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("forceclaim")
      .setDescription("Owner — Force claim invites for a user")
      .addUserOption(o => o.setName("user").setDescription("User to force claim for").setRequired(true)),
    
    // ── Owner Management Commands ──────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("checkowner")
      .setDescription("Owner — Check if owner account has proper rank"),
    
    new SlashCommandBuilder()
      .setName("setownerrank")
      .setDescription("Owner — Set the owner account rank to 'owner' in database"),
    
    // ── Auto-Mod Commands ──────────────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("warnings")
      .setDescription("View a user's auto-mod warnings")
      .addUserOption(o => o.setName("user").setDescription("User to check").setRequired(true)),
    
    new SlashCommandBuilder()
      .setName("clearwarnings")
      .setDescription("Clear a user's auto-mod warnings")
      .addUserOption(o => o.setName("user").setDescription("User to clear").setRequired(true)),
    
    // ── Link Commands ────────────────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("link")
      .setDescription("Link your Discord to a GemTide account")
      .addStringOption(o => o.setName("username").setDescription("Your GemTide username").setRequired(true)),
    
    new SlashCommandBuilder().setName("unlink").setDescription("Unlink your Discord from GemTide"),
    
    // ── Fun Commands ────────────────────────────────────────────────────
    new SlashCommandBuilder().setName("roll").setDescription("Roll a number").addIntegerOption(o => o.setName("sides").setDescription("Sides").setMinValue(2).setMaxValue(1000000)),
    new SlashCommandBuilder().setName("flip").setDescription("Flip a coin"),
    new SlashCommandBuilder().setName("8ball").setDescription("Ask the magic 8-ball").addStringOption(o => o.setName("question").setDescription("Question").setRequired(true)),
    new SlashCommandBuilder().setName("rps").setDescription("Rock-paper-scissors").addStringOption(o => o.setName("choice").setDescription("Choice").setRequired(true).addChoices(
      { name: "Rock", value: "rock" }, { name: "Paper", value: "paper" }, { name: "Scissors", value: "scissors" }
    )),
    
    // ── Info Commands ────────────────────────────────────────────────────
    new SlashCommandBuilder().setName("ping").setDescription("Bot response time"),
    new SlashCommandBuilder().setName("help").setDescription("All GemTide commands"),
    new SlashCommandBuilder().setName("serverinfo").setDescription("Server info"),
    new SlashCommandBuilder().setName("botinfo").setDescription("Bot info & uptime"),
    new SlashCommandBuilder().setName("avatar").setDescription("View avatar").addUserOption(o => o.setName("user").setDescription("User")),
    
    // ── Giveaway Commands ──────────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("giveaway")
      .setDescription("Manage giveaways")
      .addSubcommand(s => s.setName("start").setDescription("Start a giveaway").addStringOption(o => o.setName("prize").setDescription("Prize").setRequired(true)).addIntegerOption(o => o.setName("duration").setDescription("Minutes").setRequired(true).setMinValue(1).setMaxValue(10080)).addIntegerOption(o => o.setName("winners").setDescription("Winners").setMinValue(1).setMaxValue(20)).addChannelOption(o => o.setName("channel").setDescription("Channel")))
      .addSubcommand(s => s.setName("end").setDescription("Force-end a giveaway").addStringOption(o => o.setName("id").setDescription("Giveaway ID").setRequired(true)))
      .addSubcommand(s => s.setName("list").setDescription("List active giveaways")),
    
    // ── Webhook Command ──────────────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("webhook")
      .setDescription("Send a message via webhook")
      .addStringOption(o => o.setName("message").setDescription("Message to send").setRequired(true))
      .addStringOption(o => o.setName("url").setDescription("Webhook URL").setRequired(true))
      .addStringOption(o => o.setName("username").setDescription("Override username"))
      .addStringOption(o => o.setName("avatar_url").setDescription("Override avatar URL")),
    
    // ── Admin Commands ────────────────────────────────────────────────────
    new SlashCommandBuilder().setName("addbalance").setDescription("Owner — Add balance").addStringOption(o => o.setName("roblox_id").setDescription("Roblox ID").setRequired(true)).addIntegerOption(o => o.setName("amount").setDescription("Amount").setRequired(true)),
    new SlashCommandBuilder().setName("setbalance").setDescription("Owner — Set balance").addStringOption(o => o.setName("roblox_id").setDescription("Roblox ID").setRequired(true)).addIntegerOption(o => o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(0)),
    new SlashCommandBuilder().setName("createitem").setDescription("Owner — Create an item").addStringOption(o => o.setName("name").setDescription("Item name").setRequired(true)).addIntegerOption(o => o.setName("value").setDescription("Item value").setRequired(true).setMinValue(1)).addStringOption(o => o.setName("game").setDescription("Game").setRequired(true)),
    new SlashCommandBuilder().setName("giveitem").setDescription("Owner — Give item to user").addStringOption(o => o.setName("roblox_id").setDescription("Roblox ID").setRequired(true)).addStringOption(o => o.setName("item_name").setDescription("Item name").setRequired(true)).addIntegerOption(o => o.setName("quantity").setDescription("Quantity").setMinValue(1).setMaxValue(100)),
    new SlashCommandBuilder().setName("create").setDescription("Owner — Register bot").addStringOption(o => o.setName("name").setDescription("Bot name").setRequired(true)).addStringOption(o => o.setName("pfp").setDescription("Avatar URL").setRequired(true)).addIntegerOption(o => o.setName("userid").setDescription("Roblox ID").setRequired(true)).addStringOption(o => o.setName("game").setDescription("Game").setRequired(true)).addStringOption(o => o.setName("link").setDescription("Profile link")),
    new SlashCommandBuilder().setName("toggle").setDescription("Owner — Toggle bot").addSubcommand(s => s.setName("on").setDescription("Enable bot").addStringOption(o => o.setName("botid").setDescription("Bot ID or 'all'").setRequired(true))).addSubcommand(s => s.setName("off").setDescription("Disable bot").addStringOption(o => o.setName("botid").setDescription("Bot ID or 'all'").setRequired(true))).addSubcommand(s => s.setName("list").setDescription("List bots")).addSubcommand(s => s.setName("delete").setDescription("Delete bot").addStringOption(o => o.setName("botid").setDescription("Bot ID").setRequired(true))),
    new SlashCommandBuilder().setName("botstatus").setDescription("Owner — All bots status"),
    new SlashCommandBuilder().setName("say").setDescription("Owner — Send message").addStringOption(o => o.setName("message").setDescription("Message").setRequired(true)).addChannelOption(o => o.setName("channel").setDescription("Channel")),
    new SlashCommandBuilder().setName("announce").setDescription("Owner — Send announcement").addStringOption(o => o.setName("message").setDescription("Message").setRequired(true)).addChannelOption(o => o.setName("channel").setDescription("Channel")),
  ].map(c => c.toJSON());

  try {
    await client.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands`);
  } catch (e) {
    console.error("Failed to register commands:", e.message);
  }

  if (OWNER_ID) {
    try {
      const owner = await client.users.fetch(OWNER_ID);
      if (owner) {
        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("✅ Bot is Online!")
          .addFields(
            { name: "Bot Tag", value: client.user.tag, inline: true },
            { name: "Commands", value: String(commands.length), inline: true },
            { name: "Website", value: SITE_URL, inline: true },
            { name: "Auto-Mod", value: "🛡️ Active", inline: true },
            { name: "Scam Links Blocked", value: String(SCAM_DOMAINS.length), inline: true },
            { name: "Transfer Method", value: "API ✅", inline: true },
            { name: "Rejoin Tracking", value: `${rejoinIds.size} tracked`, inline: true },
          )
          .setTimestamp();
        await owner.send({ embeds: [embed] });
      }
    } catch {}
  }
});

// ─── Interaction handler ──────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === "claim_invite_reward") return handleInviteClaim(interaction);
    if (interaction.customId.startsWith("giveaway_enter_")) {
      const gwId = interaction.customId.replace("giveaway_enter_", "");
      const gw = activeGiveaways.get(gwId);
      if (!gw) return interaction.reply({ content: "❌ Giveaway ended.", ephemeral: true });
      if (gw.entrants.has(interaction.user.id)) return interaction.reply({ content: "✅ Already entered!", ephemeral: true });
      gw.entrants.add(interaction.user.id);
      try {
        const message = await interaction.channel.messages.fetch(gw.messageId);
        await message.edit({ embeds: [buildGiveawayEmbed(gw.prize, gw.endTime, gw.winnersCount, gw.entrants.size)] });
      } catch {}
      return interaction.reply({ content: `🎉 Entered for **${gw.prize}**!`, ephemeral: true });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  
  const { commandName, user } = interaction;
  await interaction.deferReply();

  try {
    // ── /addvalidinvites ──────────────────────────────────────────────────
    if (commandName === "addvalidinvites") {
      return handleAddValidInvites(interaction);
    }

    // ── /forceclaim ──────────────────────────────────────────────────────
    if (commandName === "forceclaim") {
      return handleForceClaim(interaction);
    }

    // ── /checkowner ──────────────────────────────────────────────────────
    if (commandName === "checkowner") {
      return handleCheckOwner(interaction);
    }

    // ── /setownerrank ──────────────────────────────────────────────────────
    if (commandName === "setownerrank") {
      return handleSetOwnerRank(interaction);
    }

    // ── /balance ──────────────────────────────────────────────────────
    if (commandName === "balance") {
      const u = await users.findOne({ discordid: user.id }).lean();
      if (!u) return interaction.editReply(`❌ Discord not linked. Link using \`/link username\``);
      const e = new EmbedBuilder().setColor(0x22c55e).setTitle(`💰 ${u.username}'s Balance`)
        .addFields(
          { name: "Balance", value: fmtBal(u.balance), inline: true },
          { name: "Deposited", value: fmtBal(u.deposited), inline: true },
          { name: "Level", value: fmt(u.level), inline: true },
        )
        .setThumbnail(u.thumbnail || null).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /stats ────────────────────────────────────────────────────────
    if (commandName === "stats") {
      const u = await users.findOne({ discordid: user.id }).lean();
      if (!u) return interaction.editReply(`❌ Discord not linked. Link using \`/link username\``);
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`📊 ${u.username}'s Stats`)
        .setThumbnail(u.thumbnail || null)
        .addFields(
          { name: "Balance", value: fmtBal(u.balance), inline: true },
          { name: "Wager", value: fmtBal(u.wager), inline: true },
          { name: "Level", value: fmt(u.level), inline: true },
          { name: "Won", value: fmtBal(u.won), inline: true },
          { name: "Lost", value: fmtBal(u.lost), inline: true },
          { name: "Deposited", value: fmtBal(u.deposited), inline: true },
          { name: "Rank", value: u.rank || "USER", inline: true },
          { name: "Roblox ID", value: String(u.userid), inline: true },
          { name: "Banned", value: u.banned ? "Yes ❌" : "No ✅", inline: true },
        ).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /inventory ────────────────────────────────────────────────────
    if (commandName === "inventory") {
      const target = interaction.options.getUser("user") || user;
      const u = await users.findOne({ discordid: target.id }).lean();
      if (!u) {
        const userExists = await users.findOne({ username: new RegExp(`^${escapeRegex(target.username)}$`, "i") }).lean();
        if (userExists) {
          return interaction.editReply(`❌ **${target.username}** exists but hasn't linked their Discord. They need to use \`/link ${userExists.username}\``);
        }
        return interaction.editReply(`❌ **${target.username}** isn't linked to any GemTide account.`);
      }
      
      const page = Math.max(1, interaction.options.getInteger("page") || 1);
      const perPage = 15;
      
      const invItems = await inventorys.find({ owner: u.userid }).lean();
      if (!invItems.length) return interaction.editReply(`🎒 **${u.username}**'s inventory is empty.`);
      
      const allItems = await items.find({}).lean();
      const itemMap = {};
      for (const it of allItems) {
        itemMap[it._id.toString()] = { name: it.itemname, value: it.itemvalue };
        itemMap[String(it.itemid)] = { name: it.itemname, value: it.itemvalue };
      }
      
      const counts = {};
      let totalValue = 0;
      for (const inv of invItems) {
        const itemInfo = itemMap[inv.itemid];
        if (itemInfo) {
          const name = itemInfo.name;
          counts[name] = (counts[name] || 0) + 1;
          totalValue += itemInfo.value || 0;
        } else {
          counts[`Unknown Item (${inv.itemid})`] = (counts[`Unknown Item (${inv.itemid})`] || 0) + 1;
        }
      }
      
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const total = entries.length;
      const slice = entries.slice((page - 1) * perPage, page * perPage);
      
      const e = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`🎒 ${u.username}'s Inventory`)
        .setThumbnail(u.thumbnail || target.displayAvatarURL())
        .setDescription(slice.map(([n, c]) => `• **${n}** x${c}`).join("\n") || "No items to display")
        .addFields(
          { name: "Total Items", value: String(invItems.length), inline: true },
          { name: "Total Value", value: fmtBal(totalValue), inline: true },
          { name: "Page", value: `${page}/${Math.ceil(total / perPage)}`, inline: true },
        )
        .setFooter({ text: `Inventory • ${invItems.length} items total` })
        .setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /history ──────────────────────────────────────────────────────
    if (commandName === "history") {
      const u = await users.findOne({ discordid: user.id }).lean();
      if (!u) return interaction.editReply(`❌ Discord not linked. Link using \`/link username\``);
      const page = Math.max(1, interaction.options.getInteger("page") || 1);
      const perPage = 10;
      const total = await history.countDocuments({ userid: u.userid });
      const recs = await history.find({ userid: u.userid }).sort({ date: -1 }).skip((page - 1) * perPage).limit(perPage).lean();
      if (!recs.length) return interaction.editReply("📋 No history yet.");
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`📋 ${u.username}'s History`)
        .setDescription(recs.map(r => `• **${r.type}** — ${r.amount} — <t:${Math.floor(new Date(r.date).getTime() / 1000)}:R>`).join("\n"))
        .setFooter({ text: `Page ${page}/${Math.ceil(total / perPage)} • ${total} records` }).setTimestamp();
      return interaction.editReply({ embeds: [e] });
    }

    // ── /profile ──────────────────────────────────────────────────────
    if (commandName === "profile") {
      const target = interaction.options.getUser("user");
      const u = await users.findOne({ discordid: target.id }).lean();
      if (!u) {
        const userExists = await users.findOne({ username: new RegExp(`^${escapeRegex(target.username)}$`, "i") }).lean();
        if (userExists) {
          return interaction.editReply(`❌ **${target.username}** exists but hasn't linked their Discord. They need to use \`/link ${userExists.username}\``);
        }
        return interaction.editReply(`❌ **${target.username}** isn't linked to any GemTide account.`);
      }
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`👤 ${u.username}`)
        .setThumbnail(u.thumbnail || target.displayAvatarURL())
        .addFields(
          { name: "Balance", value: fmtBal(u.balance), inline: true },
          { name: "Wager", value: fmtBal(u.wager), inline: true },
          { name: "Level", value: fmt(u.level), inline: true },
          { name: "Won", value: fmtBal(u.won), inline: true },
          { name: "Lost", value: fmtBal(u.lost), inline: true },
          { name: "Rank", value: u.rank || "USER", inline: true },
          { name: "Discord Linked", value: u.discordid ? `✅ <@${u.discordid}>` : "❌ Not linked", inline: true },
        ).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /leaderboard ──────────────────────────────────────────────────
    if (commandName === "leaderboard") {
      const top = await users.find({ banned: { $ne: true } }).sort({ wager: -1 }).limit(10).lean();
      const e = new EmbedBuilder().setColor(0xf59e0b).setTitle("🏆 Top 10 Wagerers")
        .setDescription(top.map((u, i) => `**${i + 1}.** ${u.username} — ${fmtBal(u.wager)}`).join("\n")).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /richest ──────────────────────────────────────────────────────
    if (commandName === "richest") {
      const top = await users.find({ banned: { $ne: true } }).sort({ balance: -1 }).limit(10).lean();
      const e = new EmbedBuilder().setColor(0xf59e0b).setTitle("💰 Top 10 Richest")
        .setDescription(top.map((u, i) => `**${i + 1}.** ${u.username} — ${fmtBal(u.balance)}`).join("\n")).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /withdraws ────────────────────────────────────────────────────
    if (commandName === "withdraws") {
      const u = await users.findOne({ discordid: user.id }).lean();
      if (!u) return interaction.editReply(`❌ Discord not linked. Link using \`/link username\``);
      const pending = await withdraws.find({ userid: u.userid }).lean();
      if (!pending.length) return interaction.editReply("✅ No pending withdrawals.");
      const list = pending.slice(0, 20).map((w, i) => `${i + 1}. **${w.itemname || w.itemid}**`).join("\n");
      const e = new EmbedBuilder().setColor(0xf59e0b).setTitle(`📤 ${u.username}'s Pending Withdrawals`)
        .setDescription(list).setFooter({ text: `${pending.length} total` }).setTimestamp();
      return interaction.editReply({ embeds: [e] });
    }

    // ── /cancelallwithdraws ──────────────────────────────────────────
    if (commandName === "cancelallwithdraws") {
      const u = await users.findOne({ discordid: user.id }).lean();
      if (!u) return interaction.editReply(`❌ Discord not linked. Link using \`/link username\``);
      const { deletedCount } = await withdraws.deleteMany({ userid: u.userid });
      return interaction.editReply(`✅ Cancelled **${deletedCount}** pending withdrawal(s).`);
    }

    // ── /deposit ──────────────────────────────────────────────────────
    if (commandName === "deposit") {
      const activeBots = await bots.find({ online: true }).lean();
      if (!activeBots.length) return interaction.editReply("❌ No deposit bots online.");
      const e = new EmbedBuilder().setColor(0x22c55e).setTitle("📥 Active Deposit Bots")
        .setDescription(`Trade items to a bot below, then your balance updates on ${SITE_URL}`).setTimestamp();
      for (const b of activeBots.slice(0, 10))
        e.addFields({ name: `🤖 ${b.name}`, value: `Game: **${b.game}**${b.link ? `\n[Profile](${b.link})` : ""}`, inline: true });
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /games ────────────────────────────────────────────────────────
    if (commandName === "games") {
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle("🎮 GemTide Games")
        .setDescription(`Play at **${SITE_URL}**`)
        .addFields(
          { name: "🪙 Coinflip", value: "1v1 battles", inline: true },
          { name: "🎲 Dice", value: "Roll the dice", inline: true },
          { name: "🃏 Blackjack", value: "Beat the dealer", inline: true },
          { name: "⬛ Mines", value: "Avoid the mines", inline: true },
          { name: "🏆 Jackpot", value: "Enter to win the pot", inline: true },
          { name: "✂️ RPS", value: "Rock Paper Scissors", inline: true },
          { name: "📦 Cases", value: "Open cases", inline: true },
          { name: "⬆️ Upgrader", value: "Upgrade items", inline: true },
        ).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /sitestats ────────────────────────────────────────────────────
    if (commandName === "sitestats") {
      const [totalUsers, totalItems, totalCF, totalJP] = await Promise.all([
        users.countDocuments(), items.countDocuments(),
        Coinflips.countDocuments(), Jackpot.countDocuments(),
      ]);
      const richest = await users.findOne().sort({ balance: -1 }).lean();
      const topWager = await users.findOne().sort({ wager: -1 }).lean();
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle("📊 GemTide Site Stats")
        .addFields(
          { name: "Total Users", value: fmt(totalUsers), inline: true },
          { name: "Total Items", value: fmt(totalItems), inline: true },
          { name: "Coinflip Games", value: fmt(totalCF), inline: true },
          { name: "Jackpots", value: fmt(totalJP), inline: true },
          { name: "Richest", value: richest ? `${richest.username} (${fmtBal(richest.balance)})` : "N/A", inline: true },
          { name: "Top Wagerer", value: topWager ? `${topWager.username} (${fmtBal(topWager.wager)})` : "N/A", inline: true },
        ).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /activecoinflips ──────────────────────────────────────────────
    if (commandName === "activecoinflips") {
      const active = await Coinflips.find({ active: true }).sort({ start: -1 }).limit(10).lean();
      if (!active.length) return interaction.editReply("🪙 No active coinflips.");
      const e = new EmbedBuilder().setColor(0xf59e0b).setTitle("🪙 Active Coinflips")
        .setDescription(active.map(cf => `• **${cf.PlayerOne?.username}** vs ${cf.PlayerTwo?.username || "Waiting..."} — ${fmtBal((cf.PlayerOne?.value || 0) + (cf.PlayerTwo?.value || 0))}`).join("\n"))
        .setTimestamp();
      return interaction.editReply({ embeds: [e] });
    }

    // ── /jackpotstats ──────────────────────────────────────────────────
    if (commandName === "jackpotstats") {
      const jp = await Jackpot.findOne({ inactive: { $ne: true } }).sort({ _id: -1 }).lean();
      if (!jp) return interaction.editReply("🏆 No active jackpot.");
      const e = new EmbedBuilder().setColor(0xf59e0b).setTitle("🏆 Current Jackpot")
        .addFields(
          { name: "Pot Value", value: fmtBal(jp.value), inline: true },
          { name: "State", value: jp.state || "Active", inline: true },
          { name: "Ends", value: jp.endsAt ? `<t:${Math.floor(new Date(jp.endsAt).getTime() / 1000)}:R>` : "TBD", inline: true },
        ).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    // ── /invites stats ──────────────────────────────────────────────────
    if (commandName === "invites") {
      const sub = interaction.options.getSubcommand();
      
      if (sub === "stats") {
        const guild = interaction.guild;
        if (!guild) return interaction.editReply("❌ Server only.");
        
        const unclaimed = await inviteRecord.find({ 
          guildId: guild.id, 
          inviterId: user.id, 
          isRejoin: false,
          claimed: false,
          paid: false
        }).lean();
        
        let validCount = 0;
        let pendingCount = 0;
        for (const rec of unclaimed) {
          try {
            const member = await guild.members.fetch(rec.inviteeId);
            if (member?.roles.cache.has(REQUIRED_INVITE_ROLE)) {
              validCount++;
            } else {
              pendingCount++;
            }
          } catch {
            await inviteRecord.findByIdAndUpdate(rec._id, { $set: { leftAt: new Date() } });
          }
        }
        
        const cfg = await inviteSettings.findOne({ guildId: guild.id }).lean();
        const reward = cfg?.rewardPerInvite || 0;
        
        const e = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("📨 Your Invite Stats")
          .setDescription(
            "═══════════════════════════════\n" +
            `🟢 **Claimable Now:** ${fmt(validCount)}\n` +
            `⏳ **Pending Verification:** ${fmt(pendingCount)}\n` +
            `💎 **Reward Per Invite:** ${fmtBal(reward)} gems\n` +
            "═══════════════════════════════\n\n" +
            "**How to claim:**\n" +
            "1. Click the **Claim Rewards** button\n" +
            "2. Gems will be sent to your inventory\n" +
            "3. Invites reset after claiming!"
          )
          .setFooter({ text: "Invitees need the verification role to be claimable" })
          .setTimestamp();
        
        applyBanner(e);
        return interaction.editReply({ embeds: [e] });
      }
    }

    // ── /link ──────────────────────────────────────────────────────────
    if (commandName === "link") {
      return handleLink(interaction);
    }

    // ── /unlink ────────────────────────────────────────────────────────
    if (commandName === "unlink") {
      const u = await users.findOne({ discordid: user.id }).lean();
      if (!u) return interaction.editReply("❌ Your Discord is not linked to any GemTide account.");
      
      await users.findOneAndUpdate(
        { discordid: user.id },
        { $unset: { discordid: 1, discordusername: 1 } }
      );
      
      const embed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle("🔓 Discord Unlinked")
        .setDescription(`Your Discord has been unlinked from **${u.username}**.`)
        .setFooter({ text: "GemTide • Account Unlinked" })
        .setTimestamp();
      applyBanner(embed);
      
      return interaction.editReply({ embeds: [embed] });
    }

    // ── /resetinvites ──────────────────────────────────────────────────
    if (commandName === "resetinvites") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      
      const target = interaction.options.getUser("user");
      const guild = interaction.guild;
      if (!guild) return interaction.editReply("❌ Server only.");
      
      const result = await inviteRecord.deleteMany({ 
        guildId: guild.id, 
        inviterId: target.id 
      });
      
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle("🔄 Invites Reset")
        .setDescription(`Reset **${result.deletedCount}** invites for **${target.username}**.`)
        .setFooter({ text: `Reset by ${user.username}` })
        .setTimestamp();
      applyBanner(embed);
      
      return interaction.editReply({ embeds: [embed] });
    }

    // ── /resetallinvites ──────────────────────────────────────────────────
    if (commandName === "resetallinvites") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      
      const guild = interaction.guild;
      if (!guild) return interaction.editReply("❌ Server only.");
      
      const result = await inviteRecord.deleteMany({ 
        guildId: guild.id 
      });
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🔄 ALL Invites Reset")
        .setDescription(`Reset **${result.deletedCount}** invites for **everyone** in this server.`)
        .setFooter({ text: `Reset by ${user.username}` })
        .setTimestamp();
      applyBanner(embed);
      
      return interaction.editReply({ embeds: [embed] });
    }

    // ── /warnings ──────────────────────────────────────────────────────
    if (commandName === "warnings") {
      if (!isOwner(interaction)) {
        const target = interaction.options.getUser("user");
        if (target.id !== user.id) {
          return interaction.editReply("❌ You can only check your own warnings. Owner can check anyone.");
        }
      }
      
      const target = interaction.options.getUser("user");
      const key = `${interaction.guild?.id}_${target.id}`;
      const warnings = userWarnings.get(key) || [];
      
      if (!warnings.length) {
        return interaction.editReply(`✅ **${target.username}** has no auto-mod warnings.`);
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`⚠️ Auto-Mod Warnings — ${target.username}`)
        .setDescription(warnings.map((w, i) => `${i + 1}. ${w.reason} (${w.channel}) - ${new Date(w.timestamp).toLocaleString()}`).join("\n"))
        .setFooter({ text: `Total: ${warnings.length} warnings` })
        .setTimestamp();
      applyBanner(embed);
      
      return interaction.editReply({ embeds: [embed] });
    }

    // ── /clearwarnings ──────────────────────────────────────────────────
    if (commandName === "clearwarnings") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      
      const target = interaction.options.getUser("user");
      const key = `${interaction.guild?.id}_${target.id}`;
      
      if (!userWarnings.has(key)) {
        return interaction.editReply(`✅ **${target.username}** already has no warnings.`);
      }
      
      const count = userWarnings.get(key).length;
      userWarnings.delete(key);
      
      return interaction.editReply(`✅ Cleared **${count}** warnings for **${target.username}**.`);
    }

    // ── /createitem ──────────────────────────────────────────────────
    if (commandName === "createitem") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      
      const name = interaction.options.getString("name");
      const value = interaction.options.getInteger("value");
      const game = interaction.options.getString("game").toUpperCase();
      
      const existing = await items.findOne({ 
        itemname: new RegExp(`^${escapeRegex(name)}$`, "i") 
      }).lean();
      
      if (existing) {
        return interaction.editReply(`❌ Item **${name}** already exists! (ID: ${existing.itemid})`);
      }
      
      const maxItem = await items.findOne().sort({ itemid: -1 }).select("itemid").lean();
      const itemid = (maxItem?.itemid || 0) + 1;
      
      await items.create({ itemid, itemname: name, itemvalue: value, itemimage: "", game });
      
      return interaction.editReply(`✅ Created **${name}** (ID: ${itemid}) — Value: ${fmtBal(value)} — Game: ${game}`);
    }

    // ── /giveitem ──────────────────────────────────────────────────
    if (commandName === "giveitem") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      
      const robloxId = interaction.options.getString("roblox_id");
      const itemName = interaction.options.getString("item_name");
      const quantity = interaction.options.getInteger("quantity") || 1;
      
      const user = await users.findOne({ userid: Number(robloxId) }).lean();
      if (!user) return interaction.editReply(`❌ User with Roblox ID **${robloxId}** not found.`);
      
      const item = await items.findOne({ 
        itemname: new RegExp(`^${escapeRegex(itemName)}$`, "i") 
      }).lean();
      
      if (!item) return interaction.editReply(`❌ Item **${itemName}** not found.`);
      
      const docs = Array.from({ length: quantity }, () => ({ 
        itemid: item._id.toString(), 
        owner: user.userid 
      }));
      
      await inventorys.insertMany(docs);
      
      return interaction.editReply(`✅ Gave **${quantity}x ${item.itemname}** (ID: ${item.itemid}) to **${user.username}** (${user.userid}).`);
    }

    // ── Fun Commands ──────────────────────────────────────────────────
    if (commandName === "roll") {
      const sides = interaction.options.getInteger("sides") || 100;
      const result = Math.floor(Math.random() * sides) + 1;
      return interaction.editReply(`🎲 You rolled **${result}** / ${sides}`);
    }

    if (commandName === "flip") {
      const coin = Math.random() < 0.5 ? "🟡 Heads" : "⚫ Tails";
      return interaction.editReply(`🪙 **${coin}!**`);
    }

    if (commandName === "8ball") {
      const q = interaction.options.getString("question");
      const ans = ["It is certain.", "Outlook good.", "Yes.", "Most likely.", "Ask again later.", "Cannot predict now.", "Don't count on it.", "Very doubtful.", "My reply is no."][Math.floor(Math.random() * 9)];
      return interaction.editReply(`🎱 **${q}**\n> ${ans}`);
    }

    if (commandName === "rps") {
      const choices = ["rock", "paper", "scissors"];
      const playerChoice = interaction.options.getString("choice");
      const botChoice = choices[Math.floor(Math.random() * 3)];
      const win = (playerChoice === "rock" && botChoice === "scissors") || (playerChoice === "paper" && botChoice === "rock") || (playerChoice === "scissors" && botChoice === "paper");
      const tie = playerChoice === botChoice;
      const emoji = { rock: "🪨", paper: "📄", scissors: "✂️" };
      return interaction.editReply(`${emoji[playerChoice]} vs ${emoji[botChoice]} — **${tie ? "Tie!" : win ? "You win!" : "Bot wins!"}**`);
    }

    // ── Info Commands ──────────────────────────────────────────────────
    if (commandName === "ping") {
      const ms = Date.now() - interaction.createdTimestamp;
      return interaction.editReply(`🏓 **Pong!** Bot: \`${ms}ms\` | WebSocket: \`${client.ws.ping}ms\``);
    }

    if (commandName === "help") {
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle("📋 GemTide Bot Commands")
        .setDescription(`All commands available on GemTide.\n🌐 **${SITE_URL}**`)
        .addFields(
          { name: "👤 Account", value: "`/balance` `/stats` `/inventory` `/history` `/profile` `/link` `/unlink`", inline: false },
          { name: "🏆 Leaderboards", value: "`/leaderboard` `/richest`", inline: false },
          { name: "🎮 Site Info", value: "`/deposit` `/games` `/sitestats` `/activecoinflips` `/jackpotstats`", inline: false },
          { name: "📨 Invites", value: "`/invites stats` `/sendinvite` `/pauseinvites` `/setlogchannel` `/resetinvites` `/resetallinvites` `/addvalidinvites` `/forceclaim`", inline: false },
          { name: "👑 Owner Management", value: "`/checkowner` `/setownerrank`", inline: false },
          { name: "🛡️ Auto-Mod", value: "`/warnings` `/clearwarnings`", inline: false },
          { name: "🎲 Fun", value: "`/roll` `/flip` `/8ball` `/rps`", inline: false },
          { name: "🎁 Giveaways", value: "`/giveaway start` `/giveaway end` `/giveaway list`", inline: false },
          { name: "📤 Webhook", value: "`/webhook message url`", inline: false },
        ).setFooter({ text: "Admin commands are Owner only • GemTide" }).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    if (commandName === "serverinfo") {
      const g = interaction.guild;
      if (!g) return interaction.editReply("❌ Server only.");
      await g.fetch();
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`🏠 ${g.name}`)
        .setThumbnail(g.iconURL({ size: 256 }))
        .addFields(
          { name: "Members", value: fmt(g.memberCount), inline: true },
          { name: "Channels", value: fmt(g.channels.cache.size), inline: true },
          { name: "Roles", value: fmt(g.roles.cache.size), inline: true },
          { name: "Owner", value: `<@${g.ownerId}>`, inline: true },
          { name: "Created", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
          { name: "Boost Level", value: String(g.premiumTier), inline: true },
        ).setFooter({ text: `ID: ${g.id}` }).setTimestamp();
      return interaction.editReply({ embeds: [e] });
    }

    if (commandName === "botinfo") {
      const upMs = process.uptime() * 1000;
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle("🤖 GemTide Bot")
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: "Uptime", value: fmtMs(upMs), inline: true },
          { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
          { name: "Servers", value: fmt(client.guilds.cache.size), inline: true },
          { name: "Commands", value: fmt(client.application?.commands?.cache?.size || 0), inline: true },
          { name: "Website", value: SITE_URL, inline: true },
          { name: "Transfer Method", value: "API ✅", inline: true },
        ).setFooter({ text: `Bot ID: ${client.user.id}` }).setTimestamp();
      applyBanner(e);
      return interaction.editReply({ embeds: [e] });
    }

    if (commandName === "avatar") {
      const target = interaction.options.getUser("user") || user;
      const url = target.displayAvatarURL({ size: 1024 });
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`🖼️ ${target.username}'s Avatar`)
        .setImage(url).setDescription(`[Open full size](${url})`).setTimestamp();
      return interaction.editReply({ embeds: [e] });
    }

    // ── /giveaway ──────────────────────────────────────────────────────
    if (commandName === "giveaway") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const sub = interaction.options.getSubcommand();

      if (sub === "start") {
        const prize = interaction.options.getString("prize");
        const duration = interaction.options.getInteger("duration");
        const winners = interaction.options.getInteger("winners") || 1;
        const ch = interaction.options.getChannel("channel") || interaction.channel;
        const endTime = Date.now() + duration * 60000;
        const giveawayId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const embed = buildGiveawayEmbed(prize, endTime, winners, 0);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`giveaway_enter_${giveawayId}`).setLabel("🎉 Enter").setStyle(ButtonStyle.Success),
        );
        const msg = await ch.send({ embeds: [embed], components: [row] });
        activeGiveaways.set(giveawayId, { prize, endTime, winnersCount: winners, entrants: new Set(), messageId: msg.id, channelId: ch.id, timer: setTimeout(() => endGiveaway(giveawayId), duration * 60000) });
        return interaction.editReply(`✅ Giveaway started in ${ch} for **${prize}** — ends <t:${Math.floor(endTime / 1000)}:R>`);
      }

      if (sub === "end") {
        const id = interaction.options.getString("id");
        if (!activeGiveaways.has(id)) return interaction.editReply("❌ Giveaway not found.");
        await endGiveaway(id);
        return interaction.editReply("✅ Giveaway ended.");
      }

      if (sub === "list") {
        if (!activeGiveaways.size) return interaction.editReply("No active giveaways.");
        const lines = [...activeGiveaways.entries()].map(([id, gw]) => `• **${gw.prize}** — ends <t:${Math.floor(gw.endTime / 1000)}:R> — ${gw.entrants.size} entries — ID: \`${id}\``);
        return interaction.editReply(lines.join("\n"));
      }
    }

    // ── /sendinvite ────────────────────────────────────────────────────
    if (commandName === "sendinvite") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const guild = interaction.guild;
      if (!guild) return interaction.editReply("❌ Server only.");
      const ch = interaction.options.getChannel("channel");
      const rewardM = interaction.options.getInteger("reward_millions");
      const reward = rewardM * 1_000_000;
      
      await inviteSettings.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { guildId: guild.id, channelId: ch.id, rewardPerInvite: reward, enabled: true, paused: false } },
        { upsert: true, new: true },
      );
      
      const panelE = buildBeautifulInvitePanel(reward);
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("claim_invite_reward")
          .setLabel("💎 Claim Rewards")
          .setStyle(ButtonStyle.Success)
          .setEmoji("💎"),
      );
      
      try {
        const panelMsg = await ch.send({ embeds: [panelE], components: [row] });
        await inviteSettings.findOneAndUpdate({ guildId: guild.id }, { $set: { panelMessageId: panelMsg.id } });
        return interaction.editReply(`✅ Invite panel posted in ${ch}!\n💎 **${fmtBal(reward)} gems** per valid invite.\n\n🔄 **Invites reset after claiming** — users can keep inviting for more rewards!`);
      } catch (err) {
        return interaction.editReply(`❌ Failed: ${err.message}`);
      }
    }

    // ── /pauseinvites ──────────────────────────────────────────────────
    if (commandName === "pauseinvites") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const guild = interaction.guild;
      if (!guild) return interaction.editReply("❌ Server only.");
      const action = interaction.options.getString("action");
      const paused = action === "pause";
      await inviteSettings.findOneAndUpdate({ guildId: guild.id }, { $set: { paused } }, { upsert: true });
      return interaction.editReply(paused ? "⏸️ Invites paused." : "▶️ Invites resumed.");
    }

    // ── /setlogchannel ──────────────────────────────────────────────────
    if (commandName === "setlogchannel") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const guild = interaction.guild;
      if (!guild) return interaction.editReply("❌ Server only.");
      const ch = interaction.options.getChannel("channel");
      await inviteSettings.findOneAndUpdate({ guildId: guild.id }, { $set: { logChannelId: ch.id } }, { upsert: true });
      return interaction.editReply(`✅ Log channel set to ${ch}.`);
    }

    // ── /webhook ──────────────────────────────────────────────────────
    if (commandName === "webhook") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      
      const message = interaction.options.getString("message");
      const webhookUrl = interaction.options.getString("url");
      const username = interaction.options.getString("username");
      const avatarUrl = interaction.options.getString("avatar_url");
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: message,
            username: username || 'GemTide Bot',
            avatar_url: avatarUrl || client.user.displayAvatarURL(),
          }),
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return interaction.editReply("✅ Webhook message sent!");
      } catch (error) {
        return interaction.editReply(`❌ Failed to send webhook: ${error.message}`);
      }
    }

    // ── Admin Commands ────────────────────────────────────────────────────
    if (commandName === "addbalance") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const rid = interaction.options.getString("roblox_id");
      const amount = interaction.options.getInteger("amount");
      const u = await users.findOneAndUpdate({ userid: Number(rid) }, { $inc: { balance: amount } }, { new: true }).lean();
      if (!u) return interaction.editReply(`❌ No user with Roblox ID **${rid}**.`);
      const sign = amount >= 0 ? "+" : "";
      return interaction.editReply(`✅ **${u.username}**: ${sign}${fmtBal(amount)} → New balance: **${fmtBal(u.balance)}**`);
    }

    if (commandName === "setbalance") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const rid = interaction.options.getString("roblox_id");
      const amount = interaction.options.getInteger("amount");
      const u = await users.findOneAndUpdate({ userid: Number(rid) }, { $set: { balance: amount } }, { new: true }).lean();
      if (!u) return interaction.editReply(`❌ No user with Roblox ID **${rid}**.`);
      return interaction.editReply(`✅ **${u.username}** balance set to **${fmtBal(amount)}**.`);
    }

    if (commandName === "create") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const name = interaction.options.getString("name");
      const pfp = interaction.options.getString("pfp");
      const userid = interaction.options.getInteger("userid");
      const game = interaction.options.getString("game").toUpperCase();
      const link = interaction.options.getString("link") || "";
      const b = await bots.create({ name, pfp, userid, game, link });
      return interaction.editReply(`✅ Registered bot **${name}** (${game}) — DB ID: \`${b._id}\``);
    }

    if (commandName === "toggle") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const sub = interaction.options.getSubcommand();
      
      if (sub === "list") {
        const all = await bots.find().lean();
        if (!all.length) return interaction.editReply("No bots registered.");
        const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle("🤖 Registered Bots")
          .setDescription(all.map(b => `• **${b.name}** [${b.game}] — ${b.online ? "🟢 Online" : "🔴 Offline"} — \`${b._id}\``).join("\n")).setTimestamp();
        return interaction.editReply({ embeds: [e] });
      }
      
      if (sub === "on" || sub === "off") {
        const botid = interaction.options.getString("botid");
        const online = sub === "on";
        if (botid === "all") { await bots.updateMany({}, { $set: { online } }); return interaction.editReply(`✅ All bots ${online ? "Online 🟢" : "Offline 🔴"}.`); }
        const b = await bots.findByIdAndUpdate(botid, { $set: { online } }, { new: true }).lean();
        if (!b) return interaction.editReply("❌ Bot not found.");
        return interaction.editReply(`✅ **${b.name}** is now ${online ? "🟢 Online" : "🔴 Offline"}.`);
      }
      
      if (sub === "delete") {
        const botid = interaction.options.getString("botid");
        const b = await bots.findByIdAndDelete(botid).lean();
        if (!b) return interaction.editReply("❌ Bot not found.");
        return interaction.editReply(`✅ Deleted bot **${b.name}**.`);
      }
    }

    if (commandName === "botstatus") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const all = await bots.find().lean();
      if (!all.length) return interaction.editReply("No bots registered.");
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle("🤖 Bot Status")
        .setDescription(all.map(b => `${b.online ? "🟢" : "🔴"} **${b.name}** [${b.game}]${b.link ? ` — [Profile](${b.link})` : ""}`).join("\n")).setTimestamp();
      return interaction.editReply({ embeds: [e] });
    }

    if (commandName === "say") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const msg = interaction.options.getString("message");
      const ch = interaction.options.getChannel("channel") || interaction.channel;
      try { await ch.send(msg); return interaction.editReply("✅ Sent."); }
      catch (e) { return interaction.editReply(`❌ ${e.message}`); }
    }

    if (commandName === "announce") {
      if (!isOwner(interaction)) return interaction.editReply("❌ Owner only.");
      const msg = interaction.options.getString("message");
      const ch = interaction.options.getChannel("channel") || interaction.channel;
      const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle("📢 GemTide Announcement")
        .setDescription(msg).setFooter({ text: `By ${user.username}` }).setTimestamp();
      applyBanner(e);
      try { await ch.send({ embeds: [e] }); return interaction.editReply("✅ Announcement sent."); }
      catch (err) { return interaction.editReply(`❌ ${err.message}`); }
    }

    // ── If no command matched ──────────────────────────────────────────
    await interaction.editReply("❌ Unknown command. Use `/help` to see all commands.");
    
  } catch (error) {
    console.error(`Error executing ${commandName}:`, error);
    await interaction.editReply("❌ An error occurred.");
  }
});

// ─── Auto-Mod Message Handler ────────────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.guild) {
    await handleAutoMod(message);
  }
  
  if (message.channel.id === SAB_AUTO_CHANNEL_ID && 
      message.author.id === OWNER_ID && 
      message.attachments.size > 0) {
    await processSABImage(message);
  }
});

// ─── Guild Member Add ─────────────────────────────────────────────────────────
client.on("guildMemberAdd", async (member) => {
  try {
    const guild = member.guild;
    const cfg = await inviteSettings.findOne({ guildId: guild.id }).lean();

    const isRejoinMember = isRejoin(member.id);
    const histDoc = await memberHistory.findOne({ guildId: guild.id, memberId: member.id }).lean();
    const isRejoinDb = !!histDoc && histDoc.hasEverLeft;
    
    if (isRejoinMember || isRejoinDb) {
      addRejoinId(member.id);
      await memberHistory.findOneAndUpdate(
        { guildId: guild.id, memberId: member.id },
        { $set: { hasEverLeft: false } },
        { upsert: true }
      );
    } else if (!histDoc) {
      await memberHistory.create({ guildId: guild.id, memberId: member.id });
    }

    let usedInviterId = null, usedCode = "";
    try {
      const freshInvites = await guild.invites.fetch();
      const cached = inviteCache.get(guild.id) || new Map();
      for (const [code, inv] of freshInvites) {
        if ((inv.uses || 0) > (cached.get(code) || 0)) { 
          usedInviterId = inv.inviter?.id || null; 
          usedCode = code; 
          break; 
        }
      }
      const newCache = new Map();
      for (const [code, inv] of freshInvites) newCache.set(code, inv.uses || 0);
      inviteCache.set(guild.id, newCache);
    } catch {}

    const isRejoin = isRejoinMember || isRejoinDb;

    if (cfg?.enabled && usedInviterId && usedInviterId !== member.id && !isRejoin) {
      await inviteRecord.create({ 
        guildId: guild.id, 
        inviterId: usedInviterId, 
        inviteeId: member.id, 
        inviteCode: usedCode, 
        isRejoin: false,
        claimed: false,
        paid: false
      });
    } else if (isRejoin) {
      console.log(`[Invites] ${member.user.tag} rejoined, not counting as invite`);
    }

    if (cfg?.logChannelId) {
      try {
        const logCh = await client.channels.fetch(cfg.logChannelId);
        const logE = new EmbedBuilder()
          .setColor(isRejoin ? 0xff6b35 : 0x22c55e)
          .setTitle(isRejoin ? "🔄 Member Rejoined" : "👋 New Member Joined")
          .addFields(
            { name: "Member", value: `${member.user.tag} (<@${member.id}>)`, inline: true },
            { name: "Inviter", value: usedInviterId ? `<@${usedInviterId}>` : "Unknown", inline: true },
            { name: "Rejoin", value: isRejoin ? "Yes ❌ (won't count)" : "No ✅", inline: true },
          ).setTimestamp();
        await logCh.send({ embeds: [logE] });
      } catch {}
    }
  } catch (err) { console.error("[invites] guildMemberAdd error:", err.message); }
});

// ─── Guild Member Remove ─────────────────────────────────────────────────────
client.on("guildMemberRemove", async (member) => {
  try {
    const guild = member.guild;
    
    await memberHistory.findOneAndUpdate(
      { guildId: guild.id, memberId: member.id }, 
      { $set: { hasEverLeft: true } }, 
      { upsert: true }
    );
    
    addRejoinId(member.id);
    
    await inviteRecord.findOneAndUpdate(
      { guildId: guild.id, inviteeId: member.id, claimed: false }, 
      { $set: { leftAt: new Date() } }
    );
    
    try {
      const freshInvites = await guild.invites.fetch();
      const newCache = new Map();
      for (const [code, inv] of freshInvites) newCache.set(code, inv.uses || 0);
      inviteCache.set(guild.id, newCache);
    } catch {}

    const cfg = await inviteSettings.findOne({ guildId: guild.id }).lean();
    if (cfg?.logChannelId) {
      try {
        const logCh = await client.channels.fetch(cfg.logChannelId);
        await logCh.send({ embeds: [new EmbedBuilder().setColor(0x888888).setTitle("🚪 Member Left").addFields({ name: "Member", value: `${member.user.tag} (<@${member.id}>)`, inline: true }).setTimestamp()] });
      } catch {}
    }
  } catch (err) { console.error("[invites] guildMemberRemove error:", err.message); }
});

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(BOT_TOKEN).catch((err) => {
  console.error("Bot login failed:", err.message);
});

console.log("🚀 GemTide Bot Starting...");
console.log("🔍 Finding 100m gems by name → looking up owner inventory _ids for transfer");
console.log("🌐 Using API for transfers: https://api.gemtide.win/admin/user-inventory/transfer");
console.log("🛡️ Auto-Mod is active!");
console.log(`🚫 Blocking ${SCAM_DOMAINS.length} scam domains`);
console.log("📨 Rejoin tracking is active! (rejoin_ids.json)");
console.log("✅ /addvalidinvites @user count - Add valid invites to a user");
console.log("✅ /forceclaim @user - Force claim invites for a user");
console.log("✅ /checkowner - Check if owner has proper rank");
console.log("✅ /setownerrank - Set owner rank to 'owner' in database");
console.log("✅ /link now shows which Discord account is already linked");