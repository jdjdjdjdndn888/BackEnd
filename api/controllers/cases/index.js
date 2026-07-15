const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const crypto = require("crypto");
const cases = require("../../modules/cases.js");
const caseopens = require("../../modules/caseopens.js");
const users = require("../../modules/users.js");
const items = require("../../modules/items.js");
const inventorys = require("../../modules/inventorys.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { httpError } = require("../../utils/httpError.js");
const { addHistory, updateuser, updatestats, sendwebhook, WEBHOOK_COLORS } = require("../transaction/index.js");
const { caseswebh } = require("../../config.js");

// ── Weighted random roll ────────────────────────────────────────────────────
function rollItem(caseItems) {
  const totalWeight = caseItems.reduce((sum, i) => sum + i.weight, 0);
  let rand = crypto.randomInt(0, totalWeight * 1000) / 1000;
  for (const item of caseItems) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return caseItems[caseItems.length - 1];
}

// ── GET /cases ──────────────────────────────────────────────────────────────
exports.getCases = asyncHandler(async (req, res) => {
  const allCases = await cases.find({ active: true }).lean();

  // Populate item details for each case
  const populated = await Promise.all(allCases.map(async (c) => {
    const itemIds = c.items.map(i => i.itemid);
    const dbItems = await items.find({ itemid: { $in: itemIds } }).lean();
    const itemMap = new Map(dbItems.map(i => [i.itemid, i]));
    return {
      ...c,
      items: c.items.map(ci => ({
        ...ci,
        ...(itemMap.get(ci.itemid) || {}),
      })),
    };
  }));

  res.json({ success: true, data: populated });
});

// ── GET /cases/:id ──────────────────────────────────────────────────────────
exports.getCase = asyncHandler(async (req, res) => {
  const c = await cases.findById(req.params.id).lean();
  if (!c) return res.status(404).json({ message: "Case not found" });

  const itemIds = c.items.map(i => i.itemid);
  const dbItems = await items.find({ itemid: { $in: itemIds } }).lean();
  const itemMap = new Map(dbItems.map(i => [i.itemid, i]));

  res.json({
    success: true,
    data: {
      ...c,
      items: c.items.map(ci => ({ ...ci, ...(itemMap.get(ci.itemid) || {}) })),
    },
  });
});

// ── POST /cases/:id/open ────────────────────────────────────────────────────
exports.openCase = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "cases_open")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let wonItem, savedUser, caseDoc;

  try {
    await session.withTransaction(async () => {
      caseDoc = await cases.findById(req.params.id).session(session);
      if (!caseDoc || !caseDoc.active) throw httpError(404, "Case not found or inactive");
      if (!caseDoc.items.length) throw httpError(400, "This case has no items");

      const user = await users.findOne({ userid: req.user.id }).session(session);
      if (!user) throw httpError(401, "Unauthorized");
      savedUser = user;

      if (user.balance < caseDoc.cost) {
        throw httpError(400, `Not enough gems. Need ${caseDoc.cost.toLocaleString()}, have ${user.balance.toLocaleString()}`);
      }

      // Deduct cost
      user.balance -= caseDoc.cost;
      await user.save({ session });

      // Roll item
      const rolledCaseItem = rollItem(caseDoc.items);
      const dbItem = await items.findOne({ itemid: rolledCaseItem.itemid }).session(session);
      if (!dbItem) throw httpError(500, "Item data missing, contact support");

      wonItem = {
        itemid:    dbItem.itemid,
        itemname:  dbItem.itemname,
        itemimage: dbItem.itemimage,
        itemvalue: dbItem.itemvalue,
        rarity:    rolledCaseItem.rarity,
      };

      // Add item to inventory
      await inventorys.create([{
        itemid: dbItem.itemid,
        owner:  user.userid,
        locked: false,
      }], { session });

      // Save open record
      await caseopens.create([{
        caseId:    caseDoc._id,
        caseName:  caseDoc.name,
        userId:    user.userid,
        username:  user.username,
        thumbnail: user.thumbnail,
        itemWon:   wonItem,
        cost:      caseDoc.cost,
      }], { session });
    });

    res.json({ success: true, data: { wonItem, newBalance: savedUser.balance - caseDoc.cost } });

    // Post-transaction side effects
    try {
      const io = req.app.get("io");
      io.emit("CASE_OPEN", {
        username:  savedUser.username,
        thumbnail: savedUser.thumbnail,
        caseName:  caseDoc.name,
        itemWon:   wonItem,
      });
      await Promise.all([
        addHistory(savedUser.userid, "Case Open", `-${caseDoc.cost}`),
        updateuser(savedUser.userid, io),
        updatestats(io),
        sendwebhook(caseswebh,
          `🎁 Case Opened — ${caseDoc.name}`,
          `**${savedUser.username}** opened **${caseDoc.name}** for ${caseDoc.cost.toLocaleString()} gems`,
          [
            { name: "Item Won", value: wonItem.itemname, inline: true },
            { name: "Item Value", value: wonItem.itemvalue.toLocaleString() + " gems", inline: true },
            { name: "Rarity", value: wonItem.rarity, inline: true },
          ],
          savedUser.thumbnail,
          null,
          wonItem.rarity === "legendary" ? WEBHOOK_COLORS.JACKPOT :
          wonItem.rarity === "epic"      ? 0x9b59b6 :
          wonItem.rarity === "rare"      ? WEBHOOK_COLORS.WIN :
          WEBHOOK_COLORS.NEUTRAL,
        ),
      ]);
    } catch (e) {
      console.error("[CASES] post-open side effect error:", e);
    }
  } catch (err) {
    releaseLock(req.user.id, "cases_open");
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({ message: err.message || "Server error" });
  } finally {
    releaseLock(req.user.id, "cases_open");
    session.endSession();
  }
});

// ── GET /cases/history ──────────────────────────────────────────────────────
exports.getHistory = asyncHandler(async (req, res) => {
  const history = await caseopens.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: history });
});

// ── GET /cases/history/me ───────────────────────────────────────────────────
exports.getMyHistory = asyncHandler(async (req, res) => {
  const history = await caseopens.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: history });
});

// ── ADMIN: Create case ──────────────────────────────────────────────────────
exports.adminCreateCase = asyncHandler(async (req, res) => {
  const { name, image, cost, items: caseItems = [] } = req.body;
  if (!name || !image || !cost) return res.status(400).json({ message: "name, image, and cost are required" });
  const newCase = await cases.create({ name, image, cost: Number(cost), items: caseItems });
  res.json({ success: true, data: newCase });
});

// ── ADMIN: Update case ──────────────────────────────────────────────────────
exports.adminUpdateCase = asyncHandler(async (req, res) => {
  const { name, image, cost, active, items: caseItems } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (image !== undefined) update.image = image;
  if (cost !== undefined) update.cost = Number(cost);
  if (active !== undefined) update.active = active;
  if (caseItems !== undefined) update.items = caseItems;
  const updated = await cases.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!updated) return res.status(404).json({ message: "Case not found" });
  res.json({ success: true, data: updated });
});

// ── ADMIN: Delete case ──────────────────────────────────────────────────────
exports.adminDeleteCase = asyncHandler(async (req, res) => {
  await cases.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── ADMIN: Get all cases (including inactive) ───────────────────────────────
exports.adminGetCases = asyncHandler(async (req, res) => {
  const allCases = await cases.find().lean();
  const populated = await Promise.all(allCases.map(async (c) => {
    const itemIds = c.items.map(i => i.itemid);
    const dbItems = await items.find({ itemid: { $in: itemIds } }).lean();
    const itemMap = new Map(dbItems.map(i => [i.itemid, i]));
    return {
      ...c,
      items: c.items.map(ci => ({ ...ci, ...(itemMap.get(ci.itemid) || {}) })),
    };
  }));
  res.json({ success: true, data: populated });
});
