const asyncHandler = require("express-async-handler");
const axios = require("axios");
const users = require("../../modules/users.js");
const items = require("../../modules/items.js");
const inventorys = require("../../modules/inventorys.js");
const bots = require("../../modules/bots.js");
const coinflips = require("../../modules/coinflips.js");
const diceGames = require("../../modules/dice.js");
const blackjackGames = require("../../modules/blackjack.js");
const minesGames = require("../../modules/mines.js");
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
const { ADMIN_PANEL_TIER, OWNER_TIER, ALL_RANKS } = require("../../utils/rankTiers.js");
const { logAction } = require("../../utils/logaction.js");
const auditlogs = require("../../modules/auditlogs.js");

const isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  users.findOne({ userid: req.user.id }).then((u) => {
    if (!u || !ADMIN_PANEL_TIER.includes(u.rank)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.adminUser = u;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
};

/** Gate for the most destructive owner-tier-only actions (resetall, wipe balances/inventories). */
const isOwnerTier = (req, res, next) => {
  if (!req.adminUser || !OWNER_TIER.includes(req.adminUser.rank)) {
    return res.status(403).json({ message: "Owner tier only." });
  }
  next();
};

exports.isAdmin = isAdmin;
exports.isOwnerTier = isOwnerTier;

/** Escape user-supplied strings before embedding in RegExp to prevent ReDoS */
function escapeRegex(s) {
  return s.split("").map(function(c) {
    return /[.*+?^${}()|[\]\\]/.test(c) ? "\\" + c : c;
  }).join("");
}

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
  const query = search ? { username: { $regex: escapeRegex(search), $options: "i" } } : {};
  const list = await users.find(query).select("userid username thumbnail rank level banned wager won lost balance").limit(50).lean();
  res.json({ success: true, data: list });
});

exports.banUser = asyncHandler(async (req, res) => {
  const { userid, banned } = req.body;
  if (!userid) return res.status(400).json({ message: "userid required" });
  const target = await users.findOne({ userid }).select("username").lean();
  await users.updateOne({ userid }, { $set: { banned: !!banned } });
  logAction(req.adminUser, banned ? "Ban User" : "Unban User", target?.username || String(userid));
  res.json({ success: true, message: `User ${banned ? "banned" : "unbanned"}.` });
});

exports.setRank = asyncHandler(async (req, res) => {
  const { userid, rank } = req.body;
  if (!userid || !rank || !ALL_RANKS.includes(rank)) {
    return res.status(400).json({ message: "Invalid userid or rank" });
  }
  const target = await users.findOne({ userid }).select("username rank").lean();
  await users.updateOne({ userid }, { $set: { rank } });
  logAction(req.adminUser, "Set Rank", target?.username || String(userid), `${target?.rank || "?"} → ${rank}`);
  res.json({ success: true, message: `Rank set to ${rank}.` });
});

// ── Items CRUD ──────────────────────────────────────────────────────────────

exports.listItems = asyncHandler(async (req, res) => {
  const search = req.query.search || "";
  const game = req.query.game || "";
  const query = {};
  if (search) query.itemname = { $regex: escapeRegex(search), $options: "i" };
  if (game && game !== "all") query.game = { $regex: "^" + escapeRegex(game) + "$", $options: "i" };
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

  const qty = Math.max(1, Math.min(Math.floor(Number(quantity) || 1), 100));
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

  logAction(req.adminUser, "Give Item", user.username, `${qty}× ${item.itemname}`);
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
  logAction(req.adminUser, online ? "Enable Bot" : "Disable Bot", name);
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
  logAction(req.adminUser, "Create Bot", name, `game=${game}`);
  res.json({ success: true, message: "Bot created!", data: bot });
});

exports.deleteBot = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "name required" });
  await bots.deleteOne({ name });
  logAction(req.adminUser, "Delete Bot", name);
  res.json({ success: true, message: "Bot deleted." });
});

// ── Notify all users ────────────────────────────────────────────────────────

exports.notify = asyncHandler(async (req, res) => {
  const { title, message, type = "info" } = req.body;
  if (!title || !message) return res.status(400).json({ message: "title and message required" });

  const io = req.app.get("io");
  if (!io) return res.status(500).json({ message: "Socket not available" });

  io.emit("NOTIFICATION", { title, message, type, target: "all" });
  logAction(req.adminUser, "Broadcast Notification", null, `"${title}": ${message}`);
  res.json({ success: true, message: "Notification sent to all users." });
});

// ── Bot announcement (called by Discord bot via shared secret) ───────────────

exports.botAnnounce = asyncHandler(async (req, res) => {
  const secret = process.env.ANNOUNCE_SECRET;
  const provided = req.headers["x-announce-secret"] || req.body.secret;
  if (!secret || provided !== secret) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { message } = req.body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ message: "message required" });
  }

  const io = req.app.get("io");
  if (!io) return res.status(500).json({ message: "Socket not available" });

  io.emit("ANNOUNCEMENT", { message: message.trim() });
  res.json({ success: true });
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

  logAction(req.adminUser, "Reset Database", null, "Wiped all collections except owner account");
  if (io) io.emit("NOTIFICATION", { title: "Database Reset", message: "All data wiped except owner.", type: "warning", target: "all" });
  res.json({ success: true, message: "Database reset complete. Owner preserved." });
});

// ── User inventory lookup / delete (owner tier only) ─────────────────────────
exports.getUserInventory = asyncHandler(async (req, res) => {
  if (!req.adminUser || !OWNER_TIER.includes(req.adminUser.rank)) {
    return res.status(403).json({ message: "Owner tier only." });
  }
  const { userid } = req.params;
  const user = await users.findOne({
    $or: [{ userid: Number(userid) }, { userid: String(userid) }],
  }).lean();
  if (!user) return res.status(404).json({ message: "User not found." });

  const inv = await inventorys.find({
    $or: [{ owner: Number(userid) }, { owner: String(userid) }],
  }).lean();

  const itemIds = [...new Set(inv.map(i => i.itemid))];
  const dbItems = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).lean();
  const itemMap = new Map(dbItems.map(i => [String(i.itemid), i]));

  const enriched = inv.map(i => {
    const dbItem = itemMap.get(String(i.itemid)) || {};
    return {
      _id: i._id,
      itemid: i.itemid,
      itemname: dbItem.itemname || "Unknown",
      itemimage: dbItem.itemimage || "",
      itemvalue: dbItem.itemvalue || 0,
      game: i.game || dbItem.game || "",
      locked: i.locked || false,
    };
  }).sort((a, b) => b.itemvalue - a.itemvalue);

  res.json({ success: true, user: { userid: user.userid, username: user.username, thumbnail: user.thumbnail }, inventory: enriched });
});

exports.deleteUserInventoryItems = asyncHandler(async (req, res) => {
  if (!req.adminUser || !OWNER_TIER.includes(req.adminUser.rank)) {
    return res.status(403).json({ message: "Owner tier only." });
  }
  const { inventoryIds } = req.body;
  if (!Array.isArray(inventoryIds) || !inventoryIds.length) {
    return res.status(400).json({ message: "No items selected." });
  }
  const result = await inventorys.deleteMany({ _id: { $in: inventoryIds } });
  logAction(req.adminUser, "Delete User Inventory Items", String(req.body.userid || ""), `Deleted ${result.deletedCount} item(s)`);
  res.json({ success: true, message: `Deleted ${result.deletedCount} item(s).` });
});

exports.transferInventoryItems = asyncHandler(async (req, res) => {
  if (!req.adminUser || !OWNER_TIER.includes(req.adminUser.rank)) {
    return res.status(403).json({ message: "Owner tier only." });
  }
  const { fromUserId, toUserId, inventoryIds } = req.body;
  if (!fromUserId || !toUserId) {
    return res.status(400).json({ message: "fromUserId and toUserId are required." });
  }
  if (!Array.isArray(inventoryIds) || !inventoryIds.length) {
    return res.status(400).json({ message: "No items selected." });
  }

  const [fromUser, toUser] = await Promise.all([
    users.findOne({ $or: [{ userid: Number(fromUserId) }, { userid: String(fromUserId) }] }).lean(),
    users.findOne({ $or: [{ userid: Number(toUserId) }, { userid: String(toUserId) }] }).lean(),
  ]);
  if (!fromUser) return res.status(404).json({ message: "Source user not found." });
  if (!toUser) return res.status(404).json({ message: "Destination user not found." });
  if (String(fromUser.userid) === String(toUser.userid)) {
    return res.status(400).json({ message: "Source and destination must be different users." });
  }

  const result = await inventorys.updateMany(
    { _id: { $in: inventoryIds }, $or: [{ owner: Number(fromUserId) }, { owner: String(fromUserId) }] },
    { $set: { owner: toUser.userid } }
  );

  logAction(
    req.adminUser,
    "Transfer Inventory Items",
    `${fromUser.username} (${fromUser.userid}) → ${toUser.username} (${toUser.userid})`,
    `Transferred ${result.modifiedCount} item(s)`
  );
  res.json({ success: true, message: `Transferred ${result.modifiedCount} item(s) from ${fromUser.username} to ${toUser.username}.` });
});

// ── Reset all balances ────────────────────────────────────────────────────────
exports.resetBalances = asyncHandler(async (req, res) => {
  if (!req.adminUser || !OWNER_TIER.includes(req.adminUser.rank)) {
    return res.status(403).json({ message: "Only the site owner or co-owner can reset balances." });
  }
  try {
    const result = await users.updateMany({}, { $set: { balance: 0 } });
    logAction(req.adminUser, "Reset All Balances", null, `Reset ${result.modifiedCount} user balances to 0`);
    const io = req.app.get("io");
    if (io) {
      // Broadcast notification to all clients
      io.emit("NOTIFICATION", {
        title: "Balances Reset",
        message: "All site balances have been reset to 0.",
        type: "warning",
        target: "all",
      });
      // Force every connected client to re-fetch their own user data
      io.emit("BALANCE_RESET");
    }
    res.json({ success: true, message: `Reset ${result.modifiedCount} user balances to 0.` });
  } catch (err) {
    console.error("resetBalances error:", err);
    res.status(500).json({ message: "Failed to reset balances: " + err.message });
  }
});

// ── Scrape items ────────────────────────────────────────────────────────────
// ── Withdrawals management ───────────────────────────────────────────────────
exports.getWithdrawals = asyncHandler(async (req, res) => {
  const all = await withdraws.find({}).sort({ _id: -1 }).lean();
  // Enrich with usernames
  const userIds = [...new Set(all.map(w => w.userid))];
  const userList = await users.find({ userid: { $in: userIds } }, { userid: 1, username: 1, thumbnail: 1 }).lean();
  const userMap = new Map(userList.map(u => [u.userid, u]));
  const enriched = all.map(w => ({
    ...w,
    username: userMap.get(w.userid)?.username || String(w.userid),
    thumbnail: userMap.get(w.userid)?.thumbnail || null,
  }));
  res.json({ success: true, data: enriched, total: enriched.length });
});

exports.deleteWithdrawal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "ID required" });
  const result = await withdraws.deleteOne({ _id: id });
  if (result.deletedCount === 0) return res.status(404).json({ message: "Not found" });
  logAction(req.adminUser, "Delete Withdrawal", String(id));
  res.json({ success: true, message: "Withdrawal deleted." });
});

exports.deleteAllWithdrawals = asyncHandler(async (req, res) => {
  const result = await withdraws.deleteMany({});
  logAction(req.adminUser, "Delete All Withdrawals", null, `Deleted ${result.deletedCount} withdrawal(s)`);
  res.json({ success: true, message: `Deleted ${result.deletedCount} pending withdrawal(s).` });
});

// ── Cancel all active bets ───────────────────────────────────────────────────
exports.cancelAllBets = asyncHandler(async (req, res) => {
  let cancelled = 0, itemsRestored = 0;
  const io = req.app.get("io");

  // Map model → socket cancel event name
  const cancelEvent = new Map([
    [coinflips,      "COINFLIP_CANCEL"],
    [diceGames,      "DICE_CANCEL"],
    [blackjackGames, "BLACKJACK_CANCEL"],
    [minesGames,     "MINES_CANCEL"],
  ]);

  // Helper — restore items from a waiting game's PlayerOne and cancel it.
  // Uses a conditional updateOne so that if a game resolves between the
  // initial find() and this write, modifiedCount === 0 and we skip the
  // item restore — preventing a TOCTOU double-restore.
  const cancelWaiting = async (model) => {
    const games = await model.find({
      active: true,
      $or: [{ state: "waiting" }, { state: { $exists: false } }],
    }).lean();
    for (const g of games) {
      const updateResult = await model.updateOne(
        { _id: g._id, active: true, $or: [{ state: "waiting" }, { state: { $exists: false } }] },
        { $set: { active: false, state: "finished" } }
      );
      // Skip if already resolved by the time we got here
      if (updateResult.modifiedCount === 0) continue;

      const creatorItems = g.PlayerOne?.items || [];
      if (creatorItems.length) {
        await inventorys.insertMany(
          creatorItems.map(item => ({ _id: item.id || item._id, owner: g.creatorid || g.PlayerOne?.id, itemid: item.itemid, locked: false })),
          { ordered: false }
        ).catch(() => {});
        itemsRestored += creatorItems.length;
      }
      cancelled++;
      if (io) io.emit(cancelEvent.get(model), { _id: String(g._id), active: false });
    }
  };

  // Also cancel in-progress games (return both sides).
  // Same TOCTOU guard: only restore items if WE are the ones that flipped
  // active to false — otherwise the game already resolved and the winner
  // payout setTimeout will (or already did) handle item distribution.
  const cancelActive = async (model) => {
    const games = await model.find({ active: true, PlayerTwo: { $ne: null } }).lean();
    for (const g of games) {
      const updateResult = await model.updateOne(
        { _id: g._id, active: true, PlayerTwo: { $ne: null } },
        { $set: { active: false, state: "finished" } }
      );
      // Skip if already resolved (game finished between our find and this write)
      if (updateResult.modifiedCount === 0) continue;

      const p1Items = g.PlayerOne?.items || [];
      const p2Items = g.PlayerTwo?.items || [];
      const inserts = [
        ...p1Items.map(i => ({ _id: i.id || i._id, owner: g.PlayerOne?.id, itemid: i.itemid, locked: false })),
        ...p2Items.map(i => ({ _id: i.id || i._id, owner: g.PlayerTwo?.id, itemid: i.itemid, locked: false })),
      ];
      if (inserts.length) {
        await inventorys.insertMany(inserts, { ordered: false }).catch(() => {});
        itemsRestored += inserts.length;
      }
      cancelled++;
      if (io) io.emit(cancelEvent.get(model), { _id: String(g._id), active: false });
    }
  };

  await cancelWaiting(coinflips);
  await cancelWaiting(diceGames);
  await cancelWaiting(blackjackGames);
  await cancelWaiting(minesGames);
  await cancelActive(coinflips);
  await cancelActive(diceGames);
  await cancelActive(blackjackGames);
  await cancelActive(minesGames);

  // ── Cancel active jackpot(s) ──────────────────────────────────────────────
  // Only cancel jackpots in pre-rolling states. Once a jackpot reaches
  // "Rolling" or "Locked" the payout system (payflip / close_jackpot) owns
  // the item distribution — we must not race against it or we double-restore
  // items to entrants whose items are already being given to the winner.
  // "Rolling", "Locked", "Paying", and "Ended" are all owned by the payout
  // system (payflip introduces the "Paying" state as an explicit guard).
  const JACKPOT_PAYOUT_STATES = ["Rolling", "Locked", "Paying", "Ended"];
  let jackpotCancelled = 0;
  const activeJackpots = await jackpots.find({
    state: { $nin: JACKPOT_PAYOUT_STATES },
  }).lean();
  for (const jp of activeJackpots) {
    // Atomically claim the cancellation; skip if the jackpot advanced to a
    // rolling/payout state between our find() and this write.
    const jpUpdate = await jackpots.updateOne(
      { _id: jp._id, state: { $nin: JACKPOT_PAYOUT_STATES } },
      { $set: { state: "Ended", inactive: true } }
    );
    if (jpUpdate.modifiedCount === 0) continue;

    // Safe to restore — payout system will not touch this jackpot anymore.
    const entries = await jackpotjoins.find({ jackpotGame: String(jp._id) }).lean();
    for (const entry of entries) {
      const entryItems = entry.items || [];
      if (entryItems.length) {
        await inventorys.insertMany(
          entryItems.map(item => ({ _id: item.id || item._id, owner: entry.joinerid, itemid: item.itemid, locked: false })),
          { ordered: false }
        ).catch(() => {});
        itemsRestored += entryItems.length;
      }
    }
    await jackpotjoins.deleteMany({ jackpotGame: String(jp._id) });
    jackpotCancelled++;
    if (io) io.emit("JACKPOT_CANCELLED", { jackpotId: String(jp._id) });
  }

  if (io) {
    io.emit("NOTIFICATION", {
      title: "All Bets Cancelled",
      message: `${cancelled} game(s) and ${jackpotCancelled} jackpot(s) cancelled by admin.`,
      type: "warning",
      target: "all",
    });
  }

  logAction(req.adminUser, "Cancel All Bets", null, `${cancelled} game(s), ${jackpotCancelled} jackpot(s), restored ${itemsRestored} items`);
  res.json({
    success: true,
    message: `Cancelled ${cancelled} game(s) and ${jackpotCancelled} jackpot(s). Restored ${itemsRestored} items to players.`,
  });
});

// ── Reset all inventories (owner tier only) ──────────────────────────────────
exports.resetAllInventories = asyncHandler(async (req, res) => {
  if (!req.adminUser || !OWNER_TIER.includes(req.adminUser.rank)) {
    return res.status(403).json({ message: "Owner tier only." });
  }
  const result = await inventorys.deleteMany({});
  logAction(req.adminUser, "Wipe All Inventories", null, `Deleted ${result.deletedCount} inventory entries`);
  const io = req.app.get("io");
  if (io) {
    io.emit("NOTIFICATION", { title: "Inventories Wiped", message: "All player inventories have been reset.", type: "warning", target: "all" });
  }
  res.json({ success: true, message: `Deleted ${result.deletedCount} inventory entries.` });
});

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

// ── Staff action audit log ────────────────────────────────────────────────────
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const search = req.query.search || "";
  const query = search
    ? { $or: [
        { actorUsername: { $regex: escapeRegex(search), $options: "i" } },
        { action:        { $regex: escapeRegex(search), $options: "i" } },
        { target:        { $regex: escapeRegex(search), $options: "i" } },
      ] }
    : {};

  const [logs, total] = await Promise.all([
    auditlogs.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    auditlogs.countDocuments(query),
  ]);

  res.json({ success: true, data: logs, total, page, pages: Math.ceil(total / limit) });
});
