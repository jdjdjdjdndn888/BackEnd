const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const mongoose = require("mongoose");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const { Wallet, Operation } = require("../../modules/normalwallet.js");
const { taxer } = require("../../config.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { addHistory, updateuser } = require("../transaction/index.js");
const { httpError } = require("../../utils/httpError.js");

const TAX_RATE = 0.08;
const MAX_ITEMS_PER_OPERATION = 100;
const MAX_GEM_PIECES_PER_OPERATION = 500;
const GEM_DENOMINATIONS = new Map([
  [1_000_000, "1m gems"],
  [5_000_000, "5m gems"],
  [10_000_000, "10m gems"],
  [25_000_000, "25m gems"],
  [50_000_000, "50m gems"],
  [100_000_000, "100m gems"],
]);

function userIdOf(req) {
  const id = Number(req.user?.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw httpError(401, "Unauthorized");
  return id;
}

function operationIdOf(raw) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || value.length > 120) throw httpError(400, "A unique operation id is required.");
  return value;
}

function positiveIntegerOf(raw, label) {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw httpError(400, `${label} must be a positive whole number.`);
  }
  return value;
}

function inventoryIdsOf(raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ITEMS_PER_OPERATION) {
    throw httpError(400, `Select between 1 and ${MAX_ITEMS_PER_OPERATION} items.`);
  }
  const values = raw.map(String);
  if (new Set(values).size !== values.length || values.some((id) => !mongoose.isValidObjectId(id))) {
    throw httpError(400, "One or more items are invalid.");
  }
  return values;
}

async function itemDetailsFor(inventoryDocs, session) {
  const ids = inventoryDocs.map((entry) => entry.itemid);
  const docs = await items.find({ itemid: { $in: [...ids, ...ids.map(String)] } }).session(session).lean();
  const map = new Map();
  for (const doc of docs) {
    const key = String(doc.itemid);
    if (!map.has(key)) map.set(key, doc);
  }
  const resolved = inventoryDocs.map((entry) => ({ inventory: entry, item: map.get(String(entry.itemid)) }));
  if (resolved.some(({ item }) => !item || !Number.isFinite(item.itemvalue) || item.itemvalue < 1)) {
    throw httpError(400, "One or more items are no longer supported.");
  }
  return resolved;
}

function walletResult(wallet, extra = {}) {
  return {
    balance: Math.max(0, Math.floor(wallet?.balance || 0)),
    ...extra,
  };
}

async function publicInventory(owner, session, limit = 250) {
  const docs = await inventorys.find({ owner, locked: { $ne: true } }).sort({ _id: 1 }).limit(limit).session(session).lean();
  const resolved = await itemDetailsFor(docs, session);
  return resolved.map(({ inventory, item }) => ({
    inventoryid: String(inventory._id),
    itemid: item.itemid,
    itemname: item.itemname,
    itemvalue: item.itemvalue,
    itemimage: item.itemimage,
    game: item.game,
  }));
}

exports.getWallet = asyncHandler(async (req, res) => {
  const owner = userIdOf(req);
  const wallet = await Wallet.findOne({ owner }).lean();
  res.json({
    success: true,
    data: {
      balance: Math.max(0, Math.floor(wallet?.balance || 0)),
      wagered: Math.max(0, Math.floor(wallet?.wagered || 0)),
      won: Math.max(0, Math.floor(wallet?.won || 0)),
      lost: Math.max(0, Math.floor(wallet?.lost || 0)),
      taxRate: TAX_RATE,
    },
  });
});

exports.getInventory = asyncHandler(async (req, res) => {
  const owner = userIdOf(req);
  res.json({ success: true, data: await publicInventory(owner, null) });
});

exports.getHouseInventory = asyncHandler(async (req, res) => {
  userIdOf(req);
  res.json({ success: true, data: await publicInventory(taxer, null) });
});

exports.exchange = asyncHandler(async (req, res) => {
  const owner = userIdOf(req);
  const operationId = operationIdOf(req.body?.operationId);
  const ids = inventoryIdsOf(req.body?.inventoryIds);
  const lockKey = "normal_wallet_exchange";
  if (!acquireLock(owner, lockKey)) return res.status(429).json({ message: "Request already in progress, please wait." });

  const existing = await Operation.findOne({ operationId, owner, type: "exchange" }).lean();
  if (existing) {
    releaseLock(owner, lockKey);
    return res.json(existing.result);
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const user = await users.findOne({ userid: owner }).session(session);
      if (!user) throw httpError(401, "User not found.");
      const wallet = await Wallet.findOneAndUpdate(
        { owner },
        { $setOnInsert: { owner, balance: 0 } },
        { upsert: true, new: true, session }
      );
      const selected = await inventorys.find({ _id: { $in: ids }, owner, locked: { $ne: true } }).session(session);
      if (selected.length !== ids.length) throw httpError(400, "One or more selected items are unavailable.");
      const resolved = await itemDetailsFor(selected, session);
      const grossValue = resolved.reduce((sum, entry) => sum + Math.floor(entry.item.itemvalue), 0);
      const taxValue = Math.floor(grossValue * TAX_RATE);
      const creditedValue = grossValue - taxValue;
      if (creditedValue < 1) throw httpError(400, "The selected items are worth too little after tax.");

      const deleted = await inventorys.deleteMany({ _id: { $in: ids }, owner, locked: { $ne: true } }).session(session);
      if (deleted.deletedCount !== ids.length) throw httpError(409, "The selected items changed. Refresh and try again.");
      await inventorys.insertMany(
        selected.map((entry) => ({ itemid: entry.itemid, owner: taxer, locked: false })),
        { session, ordered: false }
      );
      wallet.balance += creditedValue;
      await wallet.save({ session });
      result = {
        success: true,
        message: `Exchanged ${grossValue.toLocaleString()} value for ${creditedValue.toLocaleString()} wallet credits.`,
        data: walletResult(wallet, { grossValue, taxValue, creditedValue }),
      };
      await Operation.create([{ operationId, owner, type: "exchange", result }], { session });
    });
    await Promise.all([
      addHistory(owner, "Normal wallet deposit", `+${result.data.creditedValue}`),
      updateuser(owner, req.app.get("io")),
    ]);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Exchange failed." });
  } finally {
    await session.endSession();
    releaseLock(owner, lockKey);
  }
});

exports.redeem = asyncHandler(async (req, res) => {
  const owner = userIdOf(req);
  const operationId = operationIdOf(req.body?.operationId);
  const ids = inventoryIdsOf(req.body?.inventoryIds);
  const lockKey = "normal_wallet_redeem";
  if (!acquireLock(owner, lockKey)) return res.status(429).json({ message: "Request already in progress, please wait." });

  const existing = await Operation.findOne({ operationId, owner, type: "redeem" }).lean();
  if (existing) {
    releaseLock(owner, lockKey);
    return res.json(existing.result);
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const user = await users.findOne({ userid: owner }).session(session);
      if (!user) throw httpError(401, "User not found.");
      const wallet = await Wallet.findOne({ owner }).session(session);
      if (!wallet) throw httpError(400, "Your normal wallet is empty.");
      const selected = await inventorys.find({ _id: { $in: ids }, owner: taxer, locked: { $ne: true } }).session(session);
      if (selected.length !== ids.length) throw httpError(400, "One or more house items are no longer available.");
      const resolved = await itemDetailsFor(selected, session);
      const totalValue = resolved.reduce((sum, entry) => sum + Math.floor(entry.item.itemvalue), 0);
      if (totalValue < 1 || wallet.balance < totalValue) {
        throw httpError(400, `You need ${totalValue.toLocaleString()} wallet credits for those items.`);
      }

      const deleted = await inventorys.deleteMany({ _id: { $in: ids }, owner: taxer, locked: { $ne: true } }).session(session);
      if (deleted.deletedCount !== ids.length) throw httpError(409, "The house inventory changed. Refresh and try again.");
      await inventorys.insertMany(
        selected.map((entry) => ({ itemid: entry.itemid, owner, locked: false })),
        { session, ordered: false }
      );
      wallet.balance -= totalValue;
      await wallet.save({ session });
      result = {
        success: true,
        message: `Redeemed ${totalValue.toLocaleString()} wallet credits for ${selected.length} item${selected.length === 1 ? "" : "s"}.`,
        data: walletResult(wallet, { debitedValue: totalValue }),
      };
      await Operation.create([{ operationId, owner, type: "redeem", result }], { session });
    });
    await Promise.all([
      addHistory(owner, "Normal wallet redemption", `-${result.data.debitedValue}`),
      updateuser(owner, req.app.get("io")),
    ]);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Redemption failed." });
  } finally {
    await session.endSession();
    releaseLock(owner, lockKey);
  }
});

exports.downgrade = asyncHandler(async (req, res) => {
  const owner = userIdOf(req);
  const operationId = operationIdOf(req.body?.operationId);
  const amount = positiveIntegerOf(req.body?.amount, "The amount");
  const denomination = positiveIntegerOf(req.body?.denomination, "The gem denomination");
  const itemName = GEM_DENOMINATIONS.get(denomination);
  if (!itemName) throw httpError(400, "Choose a supported gem denomination.");
  if (amount % denomination !== 0) {
    throw httpError(400, `The amount must divide evenly into ${itemName}.`);
  }
  const pieces = amount / denomination;
  if (pieces > MAX_GEM_PIECES_PER_OPERATION) {
    throw httpError(400, `That would create too many items. Choose a larger denomination or a smaller amount (maximum ${MAX_GEM_PIECES_PER_OPERATION} pieces).`);
  }

  const lockKey = "normal_wallet_downgrade";
  if (!acquireLock(owner, lockKey)) return res.status(429).json({ message: "Request already in progress, please wait." });

  const existing = await Operation.findOne({ operationId, owner, type: "downgrade" }).lean();
  if (existing) {
    releaseLock(owner, lockKey);
    return res.json(existing.result);
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const user = await users.findOne({ userid: owner }).session(session);
      if (!user) throw httpError(401, "User not found.");
      const wallet = await Wallet.findOne({ owner }).session(session);
      if (!wallet || wallet.balance < amount) {
        throw httpError(400, "Your normal wallet does not have enough credits.");
      }

      const gem = await items.findOne({
        itemname: itemName,
        game: "PS99",
        itemvalue: denomination,
      }).session(session).lean();
      if (!gem) {
        throw httpError(503, `${itemName} is not available yet. Please ask an administrator to seed the gem denominations.`);
      }

      await inventorys.insertMany(
        Array.from({ length: pieces }, () => ({ itemid: gem.itemid, owner, locked: false })),
        { session, ordered: true }
      );
      wallet.balance -= amount;
      await wallet.save({ session });
      result = {
        success: true,
        message: `Converted ${amount.toLocaleString()} wallet credits into ${pieces} × ${itemName}.`,
        data: walletResult(wallet, { amount, denomination, pieces, itemName }),
      };
      await Operation.create([{ operationId, owner, type: "downgrade", result }], { session });
    });
    await Promise.all([
      addHistory(owner, "Normal wallet gem conversion", `-${result.data.amount}`),
      updateuser(owner, req.app.get("io")),
    ]);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Gem conversion failed." });
  } finally {
    await session.endSession();
    releaseLock(owner, lockKey);
  }
});

exports.newOperationId = () => crypto.randomUUID();