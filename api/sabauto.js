// ============================================
// SAB PET AUTO-ADD BOT — GemTide
// ============================================
// This bot is INTEGRATED into the main bot.js
// (api/bot.js) which already uses DISCORD_BOT_TOKEN.
//
// The /addsabpet and /addsabpets slash commands
// live in bot.js and write directly to MongoDB.
//
// This file documents the standalone configuration
// and can be run independently with a SEPARATE
// Discord application token via SAB_BOT_TOKEN.
// ============================================

const {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  REST,
  Routes,
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const mongoose = require("mongoose");
const path     = require("path");
const fs       = require("fs");

// ── Configuration (all from environment) ─────────────────────────────────────
const BACKEND_URL  = process.env.SAB_BACKEND_URL  || "https://api.gemtide.win";
const BOT_TOKEN    = process.env.SAB_BOT_TOKEN     || process.env.DISCORD_BOT_TOKEN || "";
const CLIENT_ID    = process.env.SAB_CLIENT_ID     || "1522604409669025793";
const GUILD_ID     = process.env.SAB_GUILD_ID      || process.env.DISCORD_GUILD_ID  || "";
const MONGO_URI    = process.env.MONGODB_URI        || "";
const DB_NAME      = "petflippy";
const IMAGE_DIR    = path.join(__dirname, "public", "sab-images");

if (!BOT_TOKEN) { console.error("❌ No bot token — set SAB_BOT_TOKEN or DISCORD_BOT_TOKEN"); process.exit(1); }
if (!MONGO_URI)  { console.error("❌ No MongoDB URI — set MONGODB_URI"); process.exit(1); }

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI, { dbName: DB_NAME })
  .then(() => console.log("[sabauto] MongoDB connected"))
  .catch((err) => { console.error("[sabauto] MongoDB error:", err.message); process.exit(1); });

const { Schema } = mongoose;
const items = mongoose.model("items", new Schema({
  itemid: Number, itemname: String, itemvalue: Number, itemimage: String, game: String,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeRegex(s) {
  return String(s).split("").map((c) => /[.*+?^${}()|[\]\\]/.test(c) ? "\\" + c : c).join("");
}

function isAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

async function downloadImage(url, destPath) {
  if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

// ── Discord client ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// ── Slash command definitions ─────────────────────────────────────────────────
const COMMANDS = [
  new SlashCommandBuilder()
    .setName("addsabpet")
    .setDescription("Admin — add a SAB pet to the item database")
    .addStringOption((o) => o.setName("name").setDescription("Pet name e.g. Diamond Cat").setRequired(true))
    .addIntegerOption((o) => o.setName("value").setDescription("Pet value in gems").setRequired(true).setMinValue(1))
    .addAttachmentOption((o) => o.setName("image").setDescription("Pet image PNG/JPG/WEBP/GIF").setRequired(true))
    .addStringOption((o) => o.setName("mutations").setDescription("Mutations e.g. Diamond, Emerald (optional)")),

  new SlashCommandBuilder()
    .setName("addsabpets")
    .setDescription("Admin — batch-add SAB pets by sending images with captions")
    .addIntegerOption((o) => o.setName("count").setDescription("Number of pets to add (1–10)").setRequired(true).setMinValue(1).setMaxValue(10)),
];

// ── Command handlers ──────────────────────────────────────────────────────────

async function handleAddSabPet(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.editReply("❌ This command requires **Administrator** permissions in the Discord server.");
  }

  const petName      = interaction.options.getString("name").trim();
  const petValue     = interaction.options.getInteger("value");
  const attachment   = interaction.options.getAttachment("image");
  const mutationsStr = interaction.options.getString("mutations") || "";

  const validExts = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  const rawExt = attachment.name ? path.extname(attachment.name).toLowerCase() : ".png";
  const ext    = validExts.includes(rawExt) ? rawExt : ".png";

  // Duplicate check
  const existing = await items.findOne({ itemname: new RegExp(`^${escapeRegex(petName)}$`, "i"), game: "SAB" }).lean();
  if (existing) return interaction.editReply(`❌ A SAB item named **${petName}** already exists (ID: ${existing.itemid}).`);

  // Download image → serve from backend static files
  const filename = `sab_${Date.now()}${ext}`;
  const savePath = path.join(IMAGE_DIR, filename);
  const imageUrl = `${BACKEND_URL}/sab-images/${filename}`;

  try {
    await downloadImage(attachment.url, savePath);
  } catch (err) {
    return interaction.editReply(`❌ Failed to download image: ${err.message}`);
  }

  // Create item
  const maxItem = await items.findOne().sort({ itemid: -1 }).select("itemid").lean();
  const itemid  = (maxItem?.itemid || 0) + 1;
  await items.create({ itemid, itemname: petName, itemvalue: petValue, itemimage: imageUrl, game: "SAB" });

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle("✅ SAB Pet Added")
    .setThumbnail(attachment.url)
    .addFields(
      { name: "Name",    value: petName,                  inline: true },
      { name: "Value",   value: petValue.toLocaleString(), inline: true },
      { name: "Game",    value: "SAB",                    inline: true },
      { name: "Item ID", value: String(itemid),           inline: true },
      { name: "Image",   value: imageUrl,                 inline: false },
    )
    .setFooter({ text: `Added by ${interaction.user.username} • GemTide SAB Bot` })
    .setTimestamp();

  if (mutationsStr) embed.addFields({ name: "Mutations", value: mutationsStr, inline: false });
  return interaction.editReply({ embeds: [embed] });
}

async function handleAddSabPets(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.editReply("❌ This command requires **Administrator** permissions in the Discord server.");
  }

  const count = interaction.options.getInteger("count");

  await interaction.editReply(
    `📸 Send **${count}** message(s) with:\n` +
    `• Pet image attached\n` +
    `• Caption: \`Name: <name> | Value: <value>\`\n\n` +
    `Example: \`Name: Diamond Cat | Value: 5000\`\n\nYou have **120 seconds** total.`
  );

  const validExts = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  const filter    = (msg) => msg.author.id === interaction.user.id && msg.attachments.size > 0;
  const results   = [];
  const seen      = new Set();

  try {
    const collected = await interaction.channel.awaitMessages({ filter, max: count, time: 120000, errors: ["time"] });

    for (const [, msg] of collected) {
      const att     = msg.attachments.first();
      const content = msg.content || "";
      const nameM   = content.match(/[Nn]ame\s*:\s*(.+?)(?:\s*\||\s*$)/);
      const valM    = content.match(/[Vv]alue\s*:\s*(\d+)/);

      if (!nameM || !valM) {
        results.push({ name: att?.name || "?", status: "failed", reason: "Missing Name/Value in caption" });
        continue;
      }

      const petName  = nameM[1].trim();
      const petValue = parseInt(valM[1], 10);

      if (seen.has(petName.toLowerCase())) {
        results.push({ name: petName, status: "skipped", reason: "Duplicate in batch" });
        continue;
      }
      seen.add(petName.toLowerCase());

      const dup = await items.findOne({ itemname: new RegExp(`^${escapeRegex(petName)}$`, "i"), game: "SAB" }).lean();
      if (dup) { results.push({ name: petName, status: "skipped", reason: "Already in database" }); continue; }

      const rawExt   = path.extname(att.name || ".png").toLowerCase();
      const ext      = validExts.includes(rawExt) ? rawExt : ".png";
      const filename = `sab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;
      const savePath = path.join(IMAGE_DIR, filename);
      const imageUrl = `${BACKEND_URL}/sab-images/${filename}`;

      try {
        await downloadImage(att.url, savePath);
        const maxItem = await items.findOne().sort({ itemid: -1 }).select("itemid").lean();
        const itemid  = (maxItem?.itemid || 0) + 1;
        await items.create({ itemid, itemname: petName, itemvalue: petValue, itemimage: imageUrl, game: "SAB" });
        results.push({ name: petName, status: "success", itemid });
      } catch (err) {
        results.push({ name: petName, status: "failed", reason: err.message });
      }
    }
  } catch { /* timed out */ }

  if (results.length === 0)
    return interaction.editReply("❌ No valid images received within the time limit.");

  const ok   = results.filter((r) => r.status === "success").length;
  const skip = results.filter((r) => r.status === "skipped").length;
  const fail = results.filter((r) => r.status === "failed").length;

  const details = results.map((r) => {
    const e = r.status === "success" ? "✅" : r.status === "skipped" ? "⏭️" : "❌";
    return `${e} **${r.name}**${r.status !== "success" ? ` — ${r.reason}` : ""}`;
  }).join("\n");

  const embed = new EmbedBuilder()
    .setColor(ok > 0 ? 0x00FF00 : 0xFF4444)
    .setTitle("📊 SAB Batch Complete")
    .addFields(
      { name: "✅ Added",   value: String(ok),   inline: true },
      { name: "⏭️ Skipped", value: String(skip), inline: true },
      { name: "❌ Failed",  value: String(fail), inline: true },
      { name: "Details",   value: details.slice(0, 1024) || "No results", inline: false },
    )
    .setFooter({ text: `Run by ${interaction.user.username} • GemTide SAB Bot` })
    .setTimestamp();
  return interaction.editReply({ embeds: [embed] });
}

// ── Register commands ─────────────────────────────────────────────────────────
client.once(Events.ClientReady, async () => {
  console.log(`[sabauto] Logged in as ${client.user.tag}`);
  try {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
    const body = COMMANDS.map((c) => c.toJSON());
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
      console.log(`[sabauto] Registered ${body.length} commands to guild ${GUILD_ID} (instant)`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
      console.log(`[sabauto] Registered ${body.length} commands globally (may take ~1h)`);
    }
  } catch (err) {
    console.error("[sabauto] Command registration failed:", err.message);
  }
});

// ── Interaction handler ───────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply({ ephemeral: true });

  try {
    if (interaction.commandName === "addsabpet")  return await handleAddSabPet(interaction);
    if (interaction.commandName === "addsabpets") return await handleAddSabPets(interaction);
    await interaction.editReply("❌ Unknown command.");
  } catch (err) {
    console.error(`[sabauto] Error in ${interaction.commandName}:`, err.message);
    await interaction.editReply(`❌ An error occurred: ${err.message}`).catch(() => {});
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
console.log("[sabauto] Connecting to Discord...");
client.login(BOT_TOKEN).catch((err) => {
  console.error("[sabauto] Login failed:", err.message);
  process.exit(1);
});
