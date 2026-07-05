const asyncHandler = require("express-async-handler");
const { jwt_secret, botlogs } = require("../../config.js");
const { logEvent } = require("../../logger.js");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const withdraws = require("../../modules/withdraws.js");
const botss = require("../../modules/bots.js");
const { addHistory, sendwebhook, updateuser } = require("../transaction/index.js");
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

  await Promise.all(
    userWithdraws.map(async (withdraw) => {
      const itemName =
        withdraw.itemid !== 0
          ? itemsMap[withdraw.itemid] || withdraw.itemname
          : withdraw.itemname;
      if (itemName === "1m gems") gemsAdded += 1_000_000;
      else if (itemName === "50m gems") gemsAdded += 50_000_000; // legacy
      else withdrawals.push(itemName);
    })
  );

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

  const user = await users.findOne({ userid: numUserId });
  if (!user) {
    return res.status(400).json({ method: "USERNOTFOUND", message: `User '${req.body.userId}' not found` });
  }

  const depositResults = [];
  const itemValues = {};
  const itemCounts = {};
  let totalValue = 0;

  // Handle gem deposits — minimum 1m, stored as individual 1m-gem inventory items
  if (gems > 0) {
    const userGems = Math.floor(gems / 1_000_000);
    if (userGems < 1) {
      depositResults.push({ itemName: "1m gems", status: "failed", reason: "Minimum deposit is 1m gems" });
    } else {
      const gemItem = await items.findOne({ itemname: "1m gems" });
      if (!gemItem) {
        depositResults.push({ itemName: "1m gems", status: "failed", reason: "Item not found in DB — add a '1m gems' item" });
      } else {
        const gemValue = gemItem.itemvalue || 1_000_000;
        totalValue += gemValue * userGems;
        itemValues["1m gems"] = gemValue;
        itemCounts["1m gems"] = userGems;

        const gemInventoryItems = Array.from({ length: userGems }, () => ({
          owner: user.userid,
          itemid: gemItem.itemid,
          locked: false,
        }));
        await inventorys.insertMany(gemInventoryItems);
        depositResults.push({ itemName: "1m gems", status: "success", quantity: userGems });
      }
    }
  }

  // Handle pet deposits
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

    const itemQueries = Object.keys(uniqueItems).map((itemName) => {
      const query = {
        itemname: { $regex: new RegExp("^" + escapeRegex(itemName) + "$", "i") },
      };
      if (gameRegex) query.game = { $regex: gameRegex };
      return items.findOne(query).then((item) => ({ itemName, item }));
    });

    const foundItems = await Promise.all(itemQueries);
    const inventoryItems = [];

    for (const { itemName, item } of foundItems) {
      if (!item) {
        depositResults.push({ itemName, status: "failed", reason: "Item not found" });
        continue;
      }
      const count = uniqueItems[itemName];
      totalValue += (item.itemvalue || 0) * count;
      itemValues[itemName] = item.itemvalue || "Unknown";
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

  const formattedItems =
    Object.entries(itemCounts)
      .map(([item, count]) => `${item} x${count} - R$${itemValues[item] || "Unknown"}`)
      .join("\n") || "None";

  logEvent({
    type: "📦 Deposit",
    color: 0x4ade80,
    description: `**${user.username}** deposited **R$${totalValue}**`,
    fields: [{ name: "Items", value: formattedItems || "—" }],
    thumbnail: user.thumbnail,
  });

  await sendwebhook(
    botlogs,
    "We got a new deposit!",
    `${user.username} has just deposited R$${totalValue}`,
    [{ name: "Items", value: formattedItems }],
    user.thumbnail
  );

  await addHistory(user.userid, "Deposit", `+ ${totalValue}`);
  await updateuser(user.userid, req.app.get("io"));

  return res.status(200).json({ message: "Deposit process completed", depositResults });
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

    // Support both new 1m-gem units and legacy 50m-gem units
    let totalGemsToRemove1m = Math.floor(gems / 1_000_000);
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

    const gemWithdrawals1m = remainingWithdrawals.filter((w) => w.itemname === "1m gems");
    const gemWithdrawals50m = remainingWithdrawals.filter((w) => w.itemname === "50m gems");
    let processedGems1m = 0;
    let processedGems50m = 0;

    // Consume 1m-gem records first
    while (totalGemsToRemove1m > 0 && gemWithdrawals1m.length > 0) {
      idsToDelete.push(gemWithdrawals1m.pop()._id);
      totalGemsToRemove1m--;
      processedGems1m++;
    }
    // Fall back to legacy 50m-gem records (1 record = 50 units of 1m)
    while (totalGemsToRemove1m >= 50 && gemWithdrawals50m.length > 0) {
      idsToDelete.push(gemWithdrawals50m.pop()._id);
      totalGemsToRemove1m -= 50;
      processedGems50m++;
    }

    if (idsToDelete.length > 0) {
      await withdraws.deleteMany({ _id: { $in: idsToDelete } });
    }

    const itemsListParts = [];
    Object.entries(itemCounts).forEach(([item, count]) => {
      if (count > 0) itemsListParts.push(`${item} x${count}`);
    });
    if (processedGems1m > 0) itemsListParts.push(`1m gems x${processedGems1m}`);
    if (processedGems50m > 0) itemsListParts.push(`50m gems x${processedGems50m} (legacy)`);

    const itemsList = itemsListParts.join("\n") || "None";
    let webhookMessage = `${user.username} has just withdrawn some items!`;
    if (unmatchedPets.length > 0) webhookMessage += `\nUnmatched items: ${unmatchedPets.join(", ")}`;

    logEvent({
      type: "📤 Withdrawal Confirmed",
      color: 0xfbbf24,
      description: `**${user.username}** withdrew items.${unmatchedPets.length ? `\nUnmatched: ${unmatchedPets.join(", ")}` : ""}`,
      fields: [{ name: "Items", value: itemsList || "—" }],
      thumbnail: user.thumbnail,
    });

    await sendwebhook(
      botlogs,
      "A new withdrawal was confirmed!",
      webhookMessage,
      [{ name: "Items", value: itemsList }],
      user.thumbnail
    );

    return res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "CONFLICT" });
  }
});

exports.confirmWithdrawAll = asyncHandler(async (req, res) => {
  const { userId, game } = req.body;
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

    const itemCounts = {};
    userWithdraws.forEach((w) => { itemCounts[w.itemname] = (itemCounts[w.itemname] || 0) + 1; });

    await withdraws.deleteMany(query);

    const itemsList =
      Object.entries(itemCounts)
        .map(([item, count]) => `${item} x${count}`)
        .join("\n") || "None";

    logEvent({
      type: "📤 Withdrawal Confirmed (All)",
      color: 0xfbbf24,
      description: `**${user.username}** withdrew all pending items.`,
      fields: [{ name: "Items", value: itemsList || "—" }],
      thumbnail: user.thumbnail,
    });

    await sendwebhook(
      botlogs,
      "A new withdrawal was confirmed!",
      `${user.username} has just withdrawn some items!`,
      [{ name: "Items", value: itemsList }],
      user.thumbnail
    );

    return res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error(error);
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
