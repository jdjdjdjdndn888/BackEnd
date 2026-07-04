const asyncHandler = require("express-async-handler");
const axios = require("axios");
const users = require("../../modules/users.js");
const items = require("../../modules/items.js");
const inventorys = require("../../modules/inventorys.js");
const bots = require("../../modules/bots.js");
const coinflips = require("../../modules/coinflips.js");
const jackpots = require("../../modules/jackpots.js");
const jackpotjoins = require("../../modules/jackpotjoins.js");
const giveaways = require("../../modules/giveaways.js");
const giveawayjoins = require("../../modules/giveawayjoins.js");
const trades = require("../../modules/trades.js");
const traderequests = require("../../modules/traderequests.js");
const withdraws = require("../../modules/withdraws.js");
const cryptodeposits = require("../../modules/cryptodeposit.js");
const { generateItems: generatePS99Items } = require("../../data/ps99pets.js");
const { scrapePetSimulatorValues } = require("../../services/psvScraper.js");

const isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  users.findOne({ userid: req.user.id }).then((u) => {
    if (!u || (u.rank !== "OWNER" && u.rank !== "ADMIN")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.adminUser = u;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
};

exports.isAdmin = isAdmin;

function parseValue(val) {
  const s = String(val).trim().toLowerCase().replace(/,/g, "");
  if (!s) return 0;
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  if (s.endsWith("b")) return Math.round(num * 1_000_000_000);
  if (s.endsWith("m")) return Math.round(num * 1_000_000);
  if (s.endsWith("k")) return Math.round(num * 1_000);
  return Math.round(num);
}

exports.stats = asyncHandler(async (req, res) => {
  const [totalUsers, totalItems, totalInventory] = await Promise.all([
    users.countDocuments(),
    items.countDocuments(),
    inventorys.countDocuments(),
  ]);
  res.json({ success: true, data: { totalUsers, totalItems, totalInventory } });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const search = req.query.search || "";
  const query = search ? { username: { $regex: search, $options: "i" } } : {};
  const list = await users.find(query).select("userid username thumbnail rank level banned wager won lost balance").limit(50).lean();
  res.json({ success: true, data: list });
});

exports.banUser = asyncHandler(async (req, res) => {
  const { userid, banned } = req.body;
  if (!userid) return res.status(400).json({ message: "userid required" });
  await users.updateOne({ userid }, { $set: { banned: !!banned } });
  res.json({ success: true, message: `User ${banned ? "banned" : "unbanned"}.` });
});

exports.setRank = asyncHandler(async (req, res) => {
  const { userid, rank } = req.body;
  const allowed = ["user", "mod", "admin", "ADMIN", "OWNER"];
  if (!userid || !rank || !allowed.includes(rank)) {
    return res.status(400).json({ message: "Invalid userid or rank" });
  }
  await users.updateOne({ userid }, { $set: { rank } });
  res.json({ success: true, message: `Rank set to ${rank}.` });
});

// ── Items CRUD ──────────────────────────────────────────────────────────────

exports.listItems = asyncHandler(async (req, res) => {
  const search = req.query.search || "";
  const game = req.query.game || "";
  const query = {};
  if (search) query.itemname = { $regex: search, $options: "i" };
  if (game && game !== "all") query.game = { $regex: `^${game}$`, $options: "i" };
  const list = await items.find(query).sort({ itemvalue: -1 }).limit(100).lean();
  const deduped = list.filter((item, idx, arr) => arr.findIndex(t => t.itemid === item.itemid) === idx);
  res.json({ success: true, data: deduped });
});

exports.createItem = asyncHandler(async (req, res) => {
  const { itemname, itemvalue: rawValue, itemimage, game } = req.body;
  if (!itemname || !rawValue || !itemimage || !game) {
    return res.status(400).json({ message: "All fields required (name, value, image, game)" });
  }
  const itemvalue = parseValue(rawValue);
  const maxItem = await items.findOne().sort({ itemid: -1 }).select("itemid").lean();
  const itemid = (maxItem?.itemid || 0) + 1;
  const item = await items.create({ itemid, itemname, itemvalue, itemimage, game: game.toUpperCase() });
  res.json({ success: true, message: "Item created!", data: item });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const { itemid } = req.params;
  const { itemname, itemvalue: rawValue, itemimage, game } = req.body;
  const update = {};
  if (itemname) update.itemname = itemname;
  if (rawValue !== undefined) update.itemvalue = parseValue(rawValue);
  if (itemimage) update.itemimage = itemimage;
  if (game) update.game = game.toUpperCase();
  await items.updateOne({ itemid: Number(itemid) }, { $set: update });
  res.json({ success: true, message: "Item updated!" });
});

exports.deleteItem = asyncHandler(async (req, res) => {
  const { itemid } = req.params;
  await items.deleteOne({ itemid: Number(itemid) });
  res.json({ success: true, message: "Item deleted." });
});

// ── Fetch correct item image ─────────────────────────────────────────────────
exports.fetchItemImage = asyncHandler(async (req, res) => {
  const { itemid } = req.params;
  const item = await items.findOne({ itemid: Number(itemid) }).lean();
  if (!item) return res.status(404).json({ message: "Item not found" });

  // Build clean name without shiny/golden/rainbow prefixes for the base image search
  const cleanName = item.itemname
    .replace(/^(Shiny\s+|Golden\s+|Rainbow\s+|Shiny\s+Golden\s+|Shiny\s+Rainbow\s+|Rainbow\s+Shiny\s+)/i, "")
    .trim();

  // Try petsimulatorvalues.com with various encoding strategies
  const candidates = [
    `https://petsimulatorvalues.com/Admin/Image/Value/${item.itemname}.png`,
    `https://petsimulatorvalues.com/Admin/Image/Value/${encodeURIComponent(item.itemname)}.png`,
    `https://petsimulatorvalues.com/Admin/Image/Value/${cleanName}.png`,
    `https://petsimulatorvalues.com/Admin/Image/Value/${encodeURIComponent(cleanName)}.png`,
  ];

  let found = null;
  for (const url of candidates) {
    try {
      const head = await axios.head(url, { timeout: 5000, maxRedirects: 5 });
      if (head.status === 200 && head.headers["content-type"]?.startsWith("image")) {
        found = url;
        break;
      }
    } catch { /* try next */ }
  }

  if (!found) {
    // Try rbxcdn catalog image as last resort (big games item thumbnail)
    try {
      const catalog = await axios.get(
        `https://catalog.roproxy.com/v1/search/items/details?Keyword=${encodeURIComponent(item.itemname)}&Category=11&Limit=10`,
        { timeout: 8000, headers: { "Accept": "application/json" } }
      );
      const results = catalog.data?.data || [];
      const match = results.find(r =>
        r.name?.toLowerCase().replace(/[^a-z0-9]/g, "") === item.itemname.toLowerCase().replace(/[^a-z0-9]/g, "")
      ) || results[0];
      if (match?.imageUrl) found = match.imageUrl;
    } catch { /* ignore */ }
  }

  if (!found) return res.status(404).json({ message: "No image found for this item" });

  await items.updateOne({ itemid: Number(itemid) }, { $set: { itemimage: found } });
  res.json({ success: true, message: "Image updated!", itemimage: found });
});

exports.giveItem = asyncHandler(async (req, res) => {
  const { userid, itemid, quantity = 1 } = req.body;
  if (!userid || !itemid) return res.status(400).json({ message: "userid and itemid required" });

  const mongoose = require("mongoose");
  const isValidId = mongoose.Types.ObjectId.isValid(itemid);

  const [user, item] = await Promise.all([
    users.findOne({ $or: [{ userid: Number(userid) }, { userid: String(userid) }] }).lean(),
    isValidId
      ? items.findOne({ _id: itemid }).lean()
      : items.findOne({ $or: [{ itemid: Number(itemid) }, { itemid: String(itemid) }] }).lean(),
  ]);

  if (!user) return res.status(404).json({ message: "User not found" });
  if (!item) return res.status(404).json({ message: "Item not found" });

  const qty = Math.max(1, Math.min(Number(quantity) || 1, 100));
  const entries = Array.from({ length: qty }, () => ({
    itemid: Number(item.itemid),
    owner: Number(user.userid),
    locked: false,
  }));
  await inventorys.insertMany(entries);

  const io = req.app.get("io");
  if (io) {
    io.emit("NOTIFICATION", {
      title: "You received items!",
      message: `${qty}× ${item.itemname} was added to your inventory.`,
      type: "success",
      target: user.userid,
    });
  }

  res.json({ success: true, message: `Gave ${qty}× ${item.itemname} to ${user.username}.` });
});

// ── Bots ───────────────────────────────────────────────────────────────────

exports.getBots = asyncHandler(async (req, res) => {
  const list = await bots.find().lean();
  res.json({ success: true, data: list });
});

exports.toggleBot = asyncHandler(async (req, res) => {
  const { name, online } = req.body;
  if (!name) return res.status(400).json({ message: "name required" });
  await bots.updateOne({ name }, { $set: { online: !!online } });
  res.json({ success: true, message: `Bot ${online ? "enabled" : "disabled"}.` });
});

exports.createBot = asyncHandler(async (req, res) => {
  const { name, pfp, userid, link = "", game, showJoin = true, showProfile = true, showId = false } = req.body;
  if (!name || !pfp || !userid || !game) {
    return res.status(400).json({ message: "name, pfp, userid and game are required" });
  }
  const existing = await bots.findOne({ name });
  if (existing) return res.status(400).json({ message: "A bot with that name already exists" });
  const bot = await bots.create({ name, pfp, userid: Number(userid), link, game, online: true, showJoin, showProfile, showId });
  res.json({ success: true, message: "Bot created!", data: bot });
});

exports.deleteBot = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "name required" });
  await bots.deleteOne({ name });
  res.json({ success: true, message: "Bot deleted." });
});

// ── Notify all users ────────────────────────────────────────────────────────

exports.notify = asyncHandler(async (req, res) => {
  const { title, message, type = "info" } = req.body;
  if (!title || !message) return res.status(400).json({ message: "title and message required" });

  const io = req.app.get("io");
  if (!io) return res.status(500).json({ message: "Socket not available" });

  io.emit("NOTIFICATION", { title, message, type, target: "all" });
  res.json({ success: true, message: "Notification sent to all users." });
});

// ── Reset database ────────────────────────────────────────────────────────────
exports.resetDB = asyncHandler(async (req, res) => {
  const io = req.app.get("io");

  // Preserve owner if exists
  const owner = await users.findOne({ username: "tinytedde" }).lean();
  const ownerData = owner || {
    userid: 4144534949,
    username: "tinytedde",
    displayname: "tinytedde",
    thumbnail: "",
    rank: "OWNER",
    level: 1,
    xp: 0,
    balance: 0,
    history: [],
    deposited: 0,
    wager: 0,
    won: 0,
    lost: 0,
    banned: false,
    discordusername: null,
    discordid: null,
  };

  // Drop all collections
  await items.deleteMany({});
  await inventorys.deleteMany({});
  await bots.deleteMany({});
  await coinflips.deleteMany({});
  await jackpots.deleteMany({});
  await jackpotjoins.deleteMany({});
  await giveaways.deleteMany({});
  await giveawayjoins.deleteMany({});
  await trades.deleteMany({});
  await traderequests.deleteMany({});
  await withdraws.deleteMany({});
  await cryptodeposits.deleteMany({});
  await users.deleteMany({});

  // Recreate owner
  await users.create(ownerData);

  if (io) io.emit("NOTIFICATION", { title: "Database Reset", message: "All data wiped except owner.", type: "warning", target: "all" });
  res.json({ success: true, message: "Database reset complete. Owner preserved." });
});

// ── Scrape items ────────────────────────────────────────────────────────────
exports.scrapeItems = asyncHandler(async (req, res) => {
  const { game = "PS99", source = "auto", manualItems } = req.body;

  let scraped = [];
  let skippedNoImage = 0;

  if (manualItems && Array.isArray(manualItems) && manualItems.length > 0) {
    // Manual bulk import
    scraped = manualItems.map((it, i) => ({
      itemid: Number(it.itemid) || Date.now() + i,
      itemname: String(it.itemname).trim(),
      itemvalue: Number(it.itemvalue) || 1,
      itemimage: String(it.itemimage || "").trim(),
      game: String(it.game || game).toUpperCase(),
    })).filter(it => it.itemname && it.itemimage);
  } else if (source === "auto") {
    // Built-in auto-generated items (no external API needed)
    if (game === "PS99" || game === "all") {
      scraped = generatePS99Items();
    }
  } else if (source === "psv") {
    // Live scrape of petsimulatorvalues.com (all pages, auto-detected) with
    // images resolved from the Big Games API.
    let result;
    try {
      result = await scrapePetSimulatorValues();
    } catch (e) {
      return res.status(502).json({ message: `Failed to scrape petsimulatorvalues.com: ${e.message}` });
    }

    const withImages = result.items.filter((it) => it.itemimage);
    skippedNoImage = result.items.length - withImages.length;

    scraped = withImages.map((it) => ({
      itemname: it.itemname,
      itemvalue: it.itemvalue || 1,
      itemimage: it.itemimage,
      game: it.game,
    }));
  }

  if (!scraped.length) {
    return res.status(404).json({ message: "No items found. Select Auto (Built-in) for instant PS99 items, or paste manual JSON." });
  }

  // Upsert by item name so re-running the scrape updates existing items
  // instead of creating duplicates or failing on itemid collisions.
  const maxItem = await items.findOne().sort({ itemid: -1 }).select("itemid").lean();
  let nextId = (maxItem?.itemid || 0) + 1;

  const existing = await items.find({ itemname: { $in: scraped.map((it) => it.itemname) } })
    .select("itemname itemid")
    .lean();
  const existingIdByName = new Map(existing.map((it) => [it.itemname, it.itemid]));

  const bulkOps = scraped.map((it) => {
    const itemid = existingIdByName.get(it.itemname) ?? nextId++;
    return {
      updateOne: {
        filter: { itemname: it.itemname },
        update: {
          $set: {
            itemvalue: it.itemvalue,
            itemimage: it.itemimage,
            game: it.game,
          },
          $setOnInsert: { itemid },
        },
        upsert: true,
      },
    };
  });

  let upsertedCount = 0;
  let modifiedCount = 0;
  const failed = [];
  const BATCH_SIZE = 500;
  for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
    const batch = bulkOps.slice(i, i + BATCH_SIZE);
    try {
      const result = await items.bulkWrite(batch, { ordered: false });
      upsertedCount += result.upsertedCount || 0;
      modifiedCount += result.modifiedCount || 0;
    } catch (e) {
      failed.push({ reason: e.message, batch: i / BATCH_SIZE });
    }
  }

  res.json({
    success: true,
    message: `Scraped ${scraped.length} items (${upsertedCount} new, ${modifiedCount} updated).${skippedNoImage ? ` ${skippedNoImage} items skipped (no image found).` : ""}`,
    inserted: upsertedCount,
    updated: modifiedCount,
    skippedNoImage,
    failed: failed.length,
    failDetails: failed.slice(0, 10),
  });
});
