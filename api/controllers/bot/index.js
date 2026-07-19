const asyncHandler = require("express-async-handler");
const { jwt_secret } = require("../../config.js");
const { logEvent } = require("../../logger.js");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const withdraws = require("../../modules/withdraws.js");
const botss = require("../../modules/bots.js");
const { addHistory, updateuser, sendwebhook } = require("../transaction/index.js");
const { botlogs } = require("../../config.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const depositLog = require("../../modules/depositlog.js");
const axios = require("axios");

const userCodes = {};

/** Escape regex metacharacters in user-supplied strings to prevent ReDoS/injection */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Return the userId as a safe positive integer, or null if invalid */
const validUserId = (raw) => {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

exports.real = asyncHandler((req, res, next) => {
  const token = req.headers["authorization"];
  if (token !== jwt_secret) return res.status(401).json({ message: "Invalid authorization" });
  next();
});

exports.realBody = asyncHandler((req, res, next) => {
  const { authKey } = req.body || {};
  if (authKey !== jwt_secret) return res.status(401).json({ message: "Invalid authorization" });
  next();
});

const resolveDepositWithdrawStatus = async (userId, game) => {
  const numUserId = Number(userId);
  const code = userCodes[numUserId] || userCodes[String(userId)] || "NO_CODE";
  const gameRegex = new RegExp("^" + escapeRegex(game) + "$", "i");

  const userWithdraws = await withdraws.find(
    { userid: numUserId, game: { $regex: gameRegex } },
    { itemid: 1, itemname: 1 }
  );

  if (!userWithdraws.length) return { method: "Deposit", code };

  const withdrawals = [];
  let gemsAdded = 0;
  const itemIds = userWithdraws.filter((w) => w.itemid !== 0).map((w) => w.itemid);
  const itemsMap = {};

  if (itemIds.length) {
    const itemsData = await items.find(
      { itemid: { $in: itemIds } },
      { _id: 0, itemid: 1, itemname: 1 }
    );
    itemsData.forEach((item) => { itemsMap[item.itemid] = item.itemname; });
  }

  // Match gems by itemid first (reliable), fall back to name matching (legacy)
  const GEM_ID_VALUES = {
    9000001: 1_000_000,
    9000005: 5_000_000,
    9000010: 10_000_000,
    9000025: 25_000_000,
    9000050: 50_000_000,
    9000100: 100_000_000,
  };
  const GEM_NAME_VALUES = {
    "1m gems":   1_000_000,
    "5m gems":   5_000_000,
    "10m gems":  10_000_000,
    "25m gems":  25_000_000,
    "50m gems":  50_000_000,
    "100m gems": 100_000_000,
  };

  for (const withdraw of userWithdraws) {
    const numItemId = Number(withdraw.itemid); // coerce to plain Number in case Mongoose returns mixed type
    // Primary: match by itemid — never affected by name typos or casing
    if (GEM_ID_VALUES[numItemId] !== undefined) {
      gemsAdded += GEM_ID_VALUES[numItemId];
      console.log(`[gems] matched by itemid ${numItemId} → +${GEM_ID_VALUES[numItemId]}`);
      continue;
    }
    // Secondary: match by name (covers itemid === 0 or legacy records)
    const itemName =
      numItemId !== 0
        ? itemsMap[numItemId] || itemsMap[withdraw.itemid] || withdraw.itemname
        : withdraw.itemname;
    const nameLower = (itemName || "").toLowerCase();
    if (GEM_NAME_VALUES[nameLower] !== undefined) {
      gemsAdded += GEM_NAME_VALUES[nameLower];
      console.log(`[gems] matched by name "${nameLower}" → +${GEM_NAME_VALUES[nameLower]}`);
    } else {
      console.log(`[gems] no match — itemid=${numItemId} name="${itemName}" → treating as pet`);
      withdrawals.push(itemName);
    }
  }

  console.log(`[resolveStatus] userId=${numUserId} game=${game} withdraws=${userWithdraws.length} gems=${gemsAdded} pets=${withdrawals.length}`);
  return { method: "Withdraw", pets: withdrawals, code, gems: gemsAdded };
};

exports.Getmethod = asyncHandler(async (req, res) => {
  const { userId, game } = req.body;
  const numUserId = validUserId(userId);
  if (!numUserId || !game) return res.status(400).json({ method: "USERNOTFOUND" });

  const user = await users.findOne({ userid: numUserId }, { _id: 0, banned: 1, username: 1 });
  if (!user || user.banned) return res.status(400).json({ method: "USERNOTFOUND" });

  const status = await resolveDepositWithdrawStatus(numUserId, game);
  return res.status(200).json(status);
});

exports.checkPending = asyncHandler(async (req, res) => {
  const { userId, game } = req.body;
  const numUserId = validUserId(userId);
  if (!numUserId || !game) return res.status(400).json({ method: "USER_NOT_FOUND" });

  const user = await users.findOne({ userid: numUserId }, { _id: 0, banned: 1, username: 1 });
  if (!user || user.banned) return res.status(400).json({ method: "USER_NOT_FOUND" });

  const status = await resolveDepositWithdrawStatus(numUserId, game);
  return res.status(200).json(status);
});

exports.Deposit = asyncHandler(async (req, res) => {
  const { game, gems = 0 } = req.body;
  const numUserId = validUserId(req.body.userId);
  const itemList = req.body.pets || req.body.items || [];

  if (!numUserId) {
    return res.status(400).json({ method: "USERNOTFOUND", message: "Valid userId is required" });
  }

  if (!acquireLock(numUserId, "deposit")) {
    return res.status(429).json({ method: "DUPLICATE", message: "Deposit already in progress for this user" });
  }

  // ── Idempotency check ────────────────────────────────────────────────────
  // If the bot sends a stable depositId, record it atomically before
  // touching inventory. A duplicate-key error means this exact payload was
  // already processed — return success so the bot doesn't retry.
  const depositId = req.body.depositId || req.headers["x-deposit-id"];
  if (depositId) {
    try {
      await depositLog.create({ depositId: String(depositId), userid: numUserId });
    } catch (idempErr) {
      releaseLock(numUserId, "deposit");
      if (idempErr.code === 11000) {
        return res.status(200).json({ method: "ALREADY_PROCESSED", message: "Deposit already processed (idempotency key matched)" });
      }
      throw idempErr;
    }
  }

  const user = await users.findOne({ userid: numUserId });
  if (!user) {
    releaseLock(numUserId, "deposit");
    return res.status(400).json({ method: "USERNOTFOUND", message: `User '${req.body.userId}' not found` });
  }

  const depositResults = [];
  const itemValues = {};
  const itemCounts = {};
  let totalValue = 0;

  try {
    // ── Gem deposits ──────────────────────────────────────────────────────────
    const numGems = Number(gems) || 0;
    if (numGems > 0) {
      const GEM_DENOMS = [
        { name: "100m gems", value: 100_000_000 },
        { name: "50m gems",  value:  50_000_000 },
        { name: "25m gems",  value:  25_000_000 },
        { name: "10m gems",  value:  10_000_000 },
        { name: "5m gems",   value:   5_000_000 },
        { name: "1m gems",   value:   1_000_000 },
      ];

      // Round down to nearest 1m
      let remaining = Math.floor(numGems / 1_000_000) * 1_000_000;

      if (remaining < 1_000_000) {
        depositResults.push({ itemName: "gems", status: "failed", reason: "Minimum deposit is 1m gems" });
      } else {
        const denomCounts = {};
        for (const { name, value } of GEM_DENOMS) {
          const count = Math.floor(remaining / value);
          if (count > 0) { denomCounts[name] = count; remaining -= count * value; }
        }

        const denomNames = Object.keys(denomCounts);
        const denomItemDocs = await items.find({ itemname: { $in: denomNames } });
        const denomItemMap = {};
        denomItemDocs.forEach((doc) => { denomItemMap[doc.itemname] = doc; });

        // Auto-seed any missing gem denominations so deposits always work
        const GEM_IMAGE = "https://cdn.discordapp.com/attachments/1522618058265460756/1522857070339293284/pet-simulator-99-gems.png";
        const GEM_SEED_MAP = {
          "1m gems":   { itemid: 9000001, itemvalue: 1_000_000 },
          "5m gems":   { itemid: 9000005, itemvalue: 5_000_000 },
          "10m gems":  { itemid: 9000010, itemvalue: 10_000_000 },
          "25m gems":  { itemid: 9000025, itemvalue: 25_000_000 },
          "50m gems":  { itemid: 9000050, itemvalue: 50_000_000 },
          "100m gems": { itemid: 9000100, itemvalue: 100_000_000 },
        };
        for (const name of denomNames) {
          if (!denomItemMap[name] && GEM_SEED_MAP[name]) {
            try {
              const created = await items.create({
                itemid: GEM_SEED_MAP[name].itemid,
                itemname: name,
                itemvalue: GEM_SEED_MAP[name].itemvalue,
                itemimage: GEM_IMAGE,
                game: "PS99",
              });
              denomItemMap[name] = created;
              console.log(`[Deposit] Auto-seeded missing gem item: ${name}`);
            } catch (seedErr) {
              console.error(`[Deposit] Failed to auto-seed ${name}:`, seedErr.message);
            }
          }
        }

        const inventoryToInsert = [];
        for (const [denomName, count] of Object.entries(denomCounts)) {
          const dbItem = denomItemMap[denomName];
          if (!dbItem) {
            depositResults.push({ itemName: denomName, status: "failed", reason: `Gem item '${denomName}' not in DB` });
            continue;
          }
          const itemVal = dbItem.itemvalue || GEM_DENOMS.find(d => d.name === denomName).value;
          totalValue += itemVal * count;
          itemValues[denomName] = itemVal;
          itemCounts[denomName] = count;
          for (let i = 0; i < count; i++) {
            inventoryToInsert.push({ owner: user.userid, itemid: dbItem.itemid, locked: false });
          }
          depositResults.push({ itemName: denomName, status: "success", quantity: count });
        }

        if (inventoryToInsert.length > 0) {
          await inventorys.insertMany(inventoryToInsert);
        }
      }
    }

    // ── Pet / item deposits ───────────────────────────────────────────────────
    if (itemList.length > 0) {
      const uniqueItems = {};
      for (const itemName of itemList) {
        if (itemName === "???") {
          depositResults.push({ itemName, status: "skipped", reason: "Unknown item" });
          continue;
        }
        uniqueItems[itemName] = (uniqueItems[itemName] || 0) + 1;
      }

      const gameRegex = game ? new RegExp("^" + escapeRegex(game) + "$", "i") : null;

      const foundItems = await Promise.all(
        Object.keys(uniqueItems).map((itemName) => {
          const query = { itemname: { $regex: new RegExp("^" + escapeRegex(itemName) + "$", "i") } };
          if (gameRegex) query.game = { $regex: gameRegex };
          return items.findOne(query).then((item) => ({ itemName, item }));
        })
      );

      const inventoryItems = [];
      for (const { itemName, item } of foundItems) {
        if (!item) {
          depositResults.push({ itemName, status: "failed", reason: "Item not found in DB" });
          continue;
        }
        const count = uniqueItems[itemName];
        totalValue += (item.itemvalue || 0) * count;
        itemValues[itemName] = item.itemvalue || 0;
        itemCounts[itemName] = count;
        for (let i = 0; i < count; i++) {
          inventoryItems.push({ owner: user.userid, itemid: item.itemid, locked: false });
        }
        depositResults.push({ itemName, status: "success", quantity: count });
      }

      if (inventoryItems.length > 0) {
        await inventorys.insertMany(inventoryItems);
      }
    }
  } catch (depositErr) {
    console.error("[Deposit] insertMany / DB error:", depositErr);
    logEvent({
      type: "❌ Deposit Error",
      color: 0xff0000,
      description: `**${user.username}** deposit failed: ${depositErr.message}`,
      thumbnail: user.thumbnail,
    });
    releaseLock(numUserId, "deposit");
    return res.status(500).json({ message: "Deposit failed — DB error", error: depositErr.message });
  }

  // ── Post-insert: log, notify, update ─────────────────────────────────────
  const formattedItems =
    Object.entries(itemCounts)
      .map(([item, count]) => `${item} x${count} — R${itemValues[item] || 0}`)
      .join("\n") || "None";

  if (totalValue > 0) {
    // Track cumulative deposited value (used by affiliate progress)
    await users.updateOne({ userid: numUserId }, { $inc: { deposited: totalValue } });

    // Only log history and send webhook when something was actually deposited
    await addHistory(user.userid, "Deposit", `+ ${totalValue}`);

    logEvent({
      type: "📦 Deposit",
      color: 0x4ade80,
      description: `**${user.username}** deposited **R${totalValue}**`,
      fields: [{ name: "Items", value: formattedItems }],
      thumbnail: user.thumbnail,
    });

  } else {
    console.warn(`[Deposit] ${user.username} (${user.userid}) — nothing deposited. Results:`, depositResults);
  }

  // Always push a socket update so the user sees their updated inventory
  await updateuser(user.userid, req.app.get("io"));

  releaseLock(numUserId, "deposit");
  return res.status(200).json({ message: "Deposit process completed", depositResults, totalValue });
});

exports.withdrawed = asyncHandler(async (req, res) => {
  const { pets = [], gems = 0 } = req.body;
  const numUserId = validUserId(req.body.userId);
  if (!numUserId || !Array.isArray(pets)) return res.status(400).json({ method: "INVALID_REQUEST" });

  const user = await users.findOne({ userid: numUserId });
  if (!user) return res.status(400).json({ method: "USERNOTFOUND" });

  try {
    const userWithdraws = await withdraws.find({ userid: numUserId });
    if (userWithdraws.length === 0) return res.status(200).json({ message: "No pending withdrawals" });

    const itemCounts = {};
    pets.forEach((pet) => { itemCounts[pet] = (itemCounts[pet] || 0) + 1; });

    let remainingWithdrawals = [...userWithdraws];
    const unmatchedPets = [];
    const idsToDelete = [];

    for (const pet in itemCounts) {
      let count = itemCounts[pet];
      let index;
      while (count > 0 && (index = remainingWithdrawals.findIndex((w) => w.itemname === pet)) !== -1) {
        const [withdrawal] = remainingWithdrawals.splice(index, 1);
        idsToDelete.push(withdrawal._id);
        count--;
      }
      if (count > 0) unmatchedPets.push(`${pet} x${count}`);
    }

    // Consume gem withdrawal records — match by itemid first (reliable), name fallback
    const GEM_DENOMS_WITHDRAW = [
      { name: "100m gems", id: 9000100, value: 100_000_000 },
      { name: "50m gems",  id: 9000050, value:  50_000_000 },
      { name: "25m gems",  id: 9000025, value:  25_000_000 },
      { name: "10m gems",  id: 9000010, value:  10_000_000 },
      { name: "5m gems",   id: 9000005, value:   5_000_000 },
      { name: "1m gems",   id: 9000001, value:   1_000_000 },
    ];
    let totalGemsToRemove = gems; // raw gem count
    const processedGemCounts = {};

    for (const { name, id, value } of GEM_DENOMS_WITHDRAW) {
      // Match by itemid first; fall back to case-insensitive name match
      const pool = remainingWithdrawals.filter(
        (w) => w.itemid === id || (w.itemname || "").toLowerCase() === name
      );
      while (totalGemsToRemove >= value && pool.length > 0) {
        idsToDelete.push(pool.pop()._id);
        totalGemsToRemove -= value;
        processedGemCounts[name] = (processedGemCounts[name] || 0) + 1;
      }
    }

    // Always return 200 to the bot first — it already gave the items.
    // A 500 here causes the bot to treat the withdrawal as failed and may
    // retry, leading to double-sends. Delete records best-effort after responding.
    const itemsListParts = [];
    Object.entries(itemCounts).forEach(([item, count]) => {
      if (count > 0) itemsListParts.push(`${item} x${count}`);
    });
    Object.entries(processedGemCounts).forEach(([denom, count]) => {
      if (count > 0) itemsListParts.push(`${denom} x${count}`);
    });
    const itemsList = itemsListParts.join("\n") || "None";

    logEvent({
      type: "📤 Withdrawal Confirmed",
      color: 0xfbbf24,
      description: `**${user.username}** withdrew items.${unmatchedPets.length ? `\nUnmatched: ${unmatchedPets.join(", ")}` : ""}`,
      fields: [{ name: "Items", value: itemsList || "—" }],
      thumbnail: user.thumbnail,
    });

    res.status(200).json({ message: "OK" });

    // Clean up withdraw records after responding so a DB error never causes a 500
    if (idsToDelete.length > 0) {
      withdraws.deleteMany({ _id: { $in: idsToDelete } }).catch((err) => {
        console.error("[withdrawed] deleteMany failed — records may need manual cleanup:", err.message, "userId:", numUserId, "ids:", idsToDelete);
      });
    }
  } catch (error) {
    console.error("[withdrawed] unexpected error:", error);
    // Still return 200 — the bot gave the items; returning 500 risks a retry/double-send
    return res.status(200).json({ message: "OK" });
  }
});

exports.confirmWithdrawAll = asyncHandler(async (req, res) => {
  const { userId, game, pets = [], gems = 0 } = req.body;
  const numUserId = validUserId(userId);
  if (!numUserId) return res.status(400).json({ method: "INVALID_REQUEST" });

  const user = await users.findOne({ userid: numUserId });
  if (!user) return res.status(400).json({ method: "USER_NOT_FOUND" });

  try {
    const gameRegex = game ? new RegExp("^" + escapeRegex(game) + "$", "i") : null;
    const query = gameRegex
      ? { userid: numUserId, game: { $regex: gameRegex } }
      : { userid: numUserId };

    const userWithdraws = await withdraws.find(query);
    if (userWithdraws.length === 0) return res.status(200).json({ message: "No pending withdrawals" });

    // ── Safe mode vs legacy ───────────────────────────────────────────────────
    // If the bot sends pets/gems (what it actually delivered), only delete those
    // matching records. This prevents partial-delivery wiping un-paid records.
    // If the bot sends nothing (old Lua script), fall back to delete-all with a warning.
    const hasPaidList = Array.isArray(pets) && (pets.length > 0 || Number(gems) > 0);

    let idsToDelete = [];
    let itemsList = "None";

    if (hasPaidList) {
      const itemCounts = {};
      pets.forEach((pet) => { itemCounts[pet] = (itemCounts[pet] || 0) + 1; });

      let remainingWithdrawals = [...userWithdraws];
      const unmatchedPets = [];

      for (const pet in itemCounts) {
        let count = itemCounts[pet];
        let index;
        while (count > 0 && (index = remainingWithdrawals.findIndex((w) => w.itemname === pet)) !== -1) {
          const [withdrawal] = remainingWithdrawals.splice(index, 1);
          idsToDelete.push(withdrawal._id);
          count--;
        }
        if (count > 0) unmatchedPets.push(`${pet} x${count}`);
      }

      // Gem matching — same denomination logic as withdrawed
      const GEM_DENOMS = [
        { name: "100m gems", id: 9000100, value: 100_000_000 },
        { name: "50m gems",  id: 9000050, value:  50_000_000 },
        { name: "25m gems",  id: 9000025, value:  25_000_000 },
        { name: "10m gems",  id: 9000010, value:  10_000_000 },
        { name: "5m gems",   id: 9000005, value:   5_000_000 },
        { name: "1m gems",   id: 9000001, value:   1_000_000 },
      ];
      let totalGemsToRemove = Number(gems) || 0;
      const processedGemCounts = {};
      for (const { name, id, value } of GEM_DENOMS) {
        const pool = remainingWithdrawals.filter(
          (w) => Number(w.itemid) === id || (w.itemname || "").toLowerCase() === name
        );
        while (totalGemsToRemove >= value && pool.length > 0) {
          idsToDelete.push(pool.pop()._id);
          totalGemsToRemove -= value;
          processedGemCounts[name] = (processedGemCounts[name] || 0) + 1;
        }
      }

      if (unmatchedPets.length) {
        console.warn(`[confirmWithdrawAll] unmatched pets for userId=${numUserId}:`, unmatchedPets.join(", "));
      }

      const parts = [];
      Object.entries(itemCounts).forEach(([item, count]) => { if (count > 0) parts.push(`${item} x${count}`); });
      Object.entries(processedGemCounts).forEach(([denom, count]) => { if (count > 0) parts.push(`${denom} x${count}`); });
      itemsList = parts.join("\n") || "None";

    } else {
      // Legacy path — bot did not send a delivered-items list; delete all by game.
      // Log so we can track how often this happens and prompt Lua script updates.
      console.warn(`[confirmWithdrawAll] legacy call (no pets/gems) for userId=${numUserId} game=${game} — deleting all ${userWithdraws.length} records`);
      idsToDelete = userWithdraws.map((w) => w._id);
      const legacyCounts = {};
      userWithdraws.forEach((w) => { legacyCounts[w.itemname] = (legacyCounts[w.itemname] || 0) + 1; });
      itemsList = Object.entries(legacyCounts).map(([item, count]) => `${item} x${count}`).join("\n") || "None";
    }

    logEvent({
      type: "📤 Withdrawal Confirmed (All)",
      color: 0xfbbf24,
      description: `**${user.username}** withdrew items.${!hasPaidList ? "\n⚠️ Legacy call — no item list sent by bot." : ""}`,
      fields: [{ name: "Items Confirmed", value: itemsList }],
      thumbnail: user.thumbnail,
    });

    await sendwebhook(
      botlogs,
      "A new withdrawal was confirmed!",
      `${user.username} has just withdrawn some items!`,
      [{ name: "Items", value: itemsList }],
      user.thumbnail
    );

    // Respond 200 first — bot already delivered. A DB error here must not cause a retry.
    res.status(200).json({ message: "OK" });

    if (idsToDelete.length > 0) {
      withdraws.deleteMany({ _id: { $in: idsToDelete } }).catch((err) => {
        console.error("[confirmWithdrawAll] deleteMany failed — records may need manual cleanup:", err.message, "userId:", numUserId, "ids:", idsToDelete);
      });
    }
  } catch (error) {
    console.error("[confirmWithdrawAll] unexpected error:", error);
    return res.status(500).json({ error: "CONFLICT" });
  }
});

exports.GetSupported = asyncHandler(async (req, res) => {
  try {
    const supports = await items.find({ itemvalue: { $gte: 1 } }, "itemname").lean();
    return res.status(200).json({ success: "OK", items: supports.map((item) => item.itemname) });
  } catch (_) {
    return res.status(200).json({ success: "N/A", items: [] });
  }
});

exports.bots = asyncHandler(async (req, res) => {
  const { game } = req.params;
  if (!game || !req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  const wordList = [
    "Roblox", "wow", "Fun", "Game", "Old", "Times", "Cool", "Yes",
    "No", "Okay", "hola", "como", "nice", "tree", "car", "crow", "owl", "dragon",
  ];
  const getcode = () =>
    wordList.sort(() => Math.random() - 0.5).slice(0, 2).join(" ");

  const bots = await botss.find({ game: { $regex: "^" + escapeRegex(game) + "$", $options: "i" } });
  delete userCodes[req.user.id];

  const code = getcode();
  userCodes[req.user.id] = code;

  return res.json({ message: "OK", bots, code });
});
