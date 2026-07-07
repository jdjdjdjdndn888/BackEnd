const crypto = require("crypto");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const { taxer, taxes, upgraderwebh } = require("../../config.js");
const InventoryItem = require("../../modules/inventorys.js");
const Upgrader = require("../../modules/upgrader.js");
const users = require("../../modules/users.js");
const items = require("../../modules/items.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { httpError } = require("../../utils/httpError.js");
const { addHistory, updateuser, updatestats, level, sendwebhook } = require("../transaction/index.js");

const MAX_WIN_CHANCE = 90;

function roll(serverSeed, clientSeed) {
  const hash = crypto
    .createHash("sha256")
    .update(serverSeed + clientSeed)
    .digest("hex");
  const intVal = parseInt(hash.slice(0, 8), 16);
  return (intVal / 0xffffffff) * 100;
}

exports.getItems = asyncHandler(async (req, res) => {
  const taxerInventory = await InventoryItem.find({
    owner: taxer,
    locked: false,
  }).lean();

  if (taxerInventory.length === 0) {
    return res.status(200).json({ items: [] });
  }

  const itemIds = taxerInventory.map((i) => i.itemid);
  const itemDocs = await items
    .find({ itemid: { $in: itemIds } })
    .lean();

  const itemMap = {};
  for (const doc of itemDocs) {
    itemMap[doc.itemid] = doc;
  }

  const result = taxerInventory
    .map((inv) => {
      const meta = itemMap[inv.itemid];
      if (!meta) return null;
      return {
        inventoryid: inv._id.toString(),
        itemid: inv.itemid,
        itemname: meta.itemname,
        itemimage: meta.itemimage || "",
        itemvalue: meta.itemvalue || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.itemvalue - a.itemvalue);

  return res.status(200).json({ items: result });
});

exports.upgrade = [
  asyncHandler(async (req, res, next) => {
    if (!acquireLock(req.user.id, "upgrader_upgrade")) {
      return res.status(429).json({ message: "Request already in progress, please wait." });
    }

    const session = await mongoose.startSession();
    let upgradeDoc, user, betValue, targetValue, winChance, rollResult, won;

    try {
      await session.withTransaction(async () => {
        const { inventoryIds, targetInventoryId } = req.body;

        if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) {
          throw httpError(422, "Select at least one item to bet.");
        }
        if (!targetInventoryId) {
          throw httpError(422, "Select a target item to upgrade to.");
        }

        const uniqueIds = [...new Set(inventoryIds)];
        if (uniqueIds.length !== inventoryIds.length) {
          throw httpError(422, "Duplicate items are not allowed.");
        }

        user = await users.findOne({ userid: req.user.id }).session(session);
        if (!user) throw httpError(404, "Account not found.");

        const targetInv = await InventoryItem.findOne({
          _id: targetInventoryId,
          owner: taxer,
          locked: false,
        }).session(session);

        if (!targetInv) {
          throw httpError(404, "Target item not found or no longer available.");
        }

        const targetMeta = await items.findOne({
          $or: [
            { itemid: targetInv.itemid },
            { itemid: String(targetInv.itemid) },
            { itemid: Number(targetInv.itemid) },
          ],
        }).session(session);

        if (!targetMeta) throw httpError(404, "Target item data not found.");

        targetValue = targetMeta.itemvalue || 0;
        if (targetValue === 0) throw httpError(422, "Target item has no value.");

        const betItemDocs = [];
        betValue = 0;

        for (const invId of uniqueIds) {
          const inv = await InventoryItem.findOne({
            _id: invId,
            owner: req.user.id,
            locked: false,
          }).session(session);

          if (!inv) throw httpError(422, `Item ${invId} not found or locked.`);

          const meta = await items.findOne({
            $or: [
              { itemid: inv.itemid },
              { itemid: String(inv.itemid) },
              { itemid: Number(inv.itemid) },
            ],
          }).session(session);

          betValue += meta?.itemvalue || 0;
          betItemDocs.push({
            inventoryid: inv._id.toString(),
            itemid: inv.itemid,
            itemname: meta?.itemname || "???",
            itemimage: meta?.itemimage || "",
            itemvalue: meta?.itemvalue || 0,
            _invDoc: inv,
          });
        }

        winChance = Math.min(MAX_WIN_CHANCE, (betValue / targetValue) * 100);

        const serverSeed = crypto.randomBytes(16).toString("hex");
        const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
        const clientSeed = crypto.randomBytes(16).toString("hex");
        rollResult = roll(serverSeed, clientSeed);
        won = rollResult <= winChance;

        const betItemIds = betItemDocs.map((b) => b._invDoc._id);
        await InventoryItem.deleteMany({ _id: { $in: betItemIds } }).session(session);

        if (won) {
          await InventoryItem.findByIdAndUpdate(
            targetInv._id,
            { owner: req.user.id, locked: false },
            { session }
          );
        } else {
          await InventoryItem.findByIdAndUpdate(
            targetInv._id,
            { locked: false },
            { session }
          );
        }

        for (const b of betItemDocs) {
          const newItem = new InventoryItem({
            itemid: b.itemid,
            owner: taxer,
            locked: false,
          });
          await newItem.save({ session });
        }

        upgradeDoc = new Upgrader({
          userid: req.user.id,
          username: user.username,
          thumbnail: user.thumbnail,
          betItems: betItemDocs.map((b) => ({
            inventoryid: b.inventoryid,
            itemid: b.itemid,
            itemname: b.itemname,
            itemimage: b.itemimage,
            itemvalue: b.itemvalue,
          })),
          betValue,
          targetItem: {
            inventoryid: targetInventoryId,
            itemid: targetInv.itemid,
            itemname: targetMeta.itemname,
            itemimage: targetMeta.itemimage || "",
            itemvalue: targetValue,
          },
          targetValue,
          winChance,
          result: won ? "win" : "lose",
          serverSeed,
          serverSeedHash,
          clientSeed,
          roll: rollResult,
        });

        await upgradeDoc.save({ session });

        await users.updateOne(
          { userid: req.user.id },
          {
            $inc: {
              wager: betValue,
              lost: won ? 0 : betValue,
              won: won ? targetValue : 0,
            },
          },
          { session }
        );
      });

      res.status(200).json({
        result: won ? "win" : "lose",
        roll: rollResult,
        winChance,
        betValue,
        targetValue,
        serverSeedHash: upgradeDoc.serverSeedHash,
      });

      try {
        addHistory(
          req.user.id,
          "Upgrader",
          won ? `+${targetValue - betValue}` : `-${betValue}`
        );
        level(req.user.id, betValue);
        updateuser(req.user.id, req.app.get("io"));
        updatestats(req.app.get("io"));
        sendwebhook(
          upgraderwebh,
          won ? "🎉 Upgrader Win" : "💀 Upgrader Loss",
          `**${user.username}** ${won ? "won" : "lost"} an upgrade! Bet R$${betValue.toLocaleString()} → Target R$${targetValue.toLocaleString()} (${winChance.toFixed(1)}% chance, rolled ${rollResult.toFixed(2)})`,
          [
            { name: "Result", value: won ? "✅ WIN" : "❌ LOSE", inline: true },
            { name: "Bet Value", value: `R$${betValue.toLocaleString()}`, inline: true },
            { name: "Target Value", value: `R$${targetValue.toLocaleString()}`, inline: true },
          ],
          user.thumbnail
        ).catch((e) => console.error("upgrader webhook:", e));
      } catch (e) {
        console.error("upgrader side-effects:", e);
      }
    } catch (error) {
      console.error("Upgrader error:", error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      releaseLock(req.user.id, "upgrader_upgrade");
      session.endSession();
    }
  }),
];

exports.history = asyncHandler(async (req, res) => {
  const records = await Upgrader.find({ userid: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return res.status(200).json({ history: records });
});
