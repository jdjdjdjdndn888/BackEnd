const crypto = require("crypto");
const mongoose = require("mongoose");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const users = require("../../modules/users.js");
const Drop = require("../../modules/drops.js");
const dropstate = require("../../modules/dropstate.js");
const { taxer } = require("../../config.js");

const DROP_THRESHOLD = 5;
const DROP_BATCH_SIZE = 2;

// Can be toggled by ?disable / ?enable in chat commands.
// Paused — set to true to re-enable tax drops.
let dropsEnabled = false;

function generateCode() {
  // Short, easy to type into the claim box, but not guessable at a glance.
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Grabs one random, currently-unlocked item out of the house (taxer) account
 * and atomically locks it, so two drops spawned back to back (or a forcedrop
 * racing an automatic drop) can never pick the same item twice.
 */
async function claimRandomTaxItem() {
  const candidates = await inventorys.find({ owner: taxer, locked: false }).select("_id itemid").lean();
  if (!candidates.length) return null;

  // Shuffle so retries (if another spawn locks it first) don't all pile onto
  // the same handful of items.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const candidate of candidates) {
    const locked = await inventorys.findOneAndUpdate(
      { _id: candidate._id, owner: taxer, locked: false },
      { $set: { locked: true } },
      { new: true }
    );
    if (locked) {
      const meta = await items.findOne({
        $or: [{ itemid: locked.itemid }, { itemid: String(locked.itemid) }, { itemid: Number(locked.itemid) }],
      }).lean();
      if (!meta) {
        // Orphaned inventory row with no item metadata — unlock and skip it.
        await inventorys.updateOne({ _id: locked._id }, { $set: { locked: false } });
        continue;
      }
      return { inventoryDoc: locked, meta };
    }
  }
  return null;
}

/**
 * Spawns up to `count` separate claimable drops (each its own code / winner)
 * and broadcasts each one as a chat message. Call this AFTER any DB
 * transaction has committed — never from inside a session.withTransaction().
 */
async function spawnDrops(io, count, source, broadcastFn) {
  for (let i = 0; i < count; i++) {
    const picked = await claimRandomTaxItem();
    if (!picked) break; // house account is empty, nothing left to drop

    const { inventoryDoc, meta } = picked;
    const code = generateCode();

    const drop = await Drop.create({
      inventoryId: inventoryDoc._id,
      itemid: meta.itemid,
      itemname: meta.itemname,
      itemvalue: meta.itemvalue,
      itemimage: meta.itemimage || "",
      code,
      source,
    });

    await broadcastFn(io, drop);
  }
}

/**
 * Atomically decrements the shared tax counter by DROP_THRESHOLD every time
 * it's crossed, spawning a DROP_BATCH_SIZE-item drop for each threshold hit.
 * Safe to call after every taxed transaction commits — a no-op below
 * threshold, and self-limiting so a huge backlog doesn't spawn forever.
 */
async function checkAndTriggerDrop(io, broadcastFn) {
  if (!dropsEnabled) return;
  try {
    let guard = 0;
    while (guard++ < 10) {
      const before = await dropstate.findOneAndUpdate(
        { key: "global", taxedSinceDrop: { $gte: DROP_THRESHOLD } },
        { $inc: { taxedSinceDrop: -DROP_THRESHOLD } }
      );
      if (!before) break;
      await spawnDrops(io, DROP_BATCH_SIZE, "tax", broadcastFn);
    }
  } catch (e) {
    console.error("[DROPS] checkAndTriggerDrop failed:", e.message);
  }
}

/** Owner-triggered single-item drop from the `?forcedrop` chat command. */
async function forceDrop(io, broadcastFn) {
  await spawnDrops(io, 1, "force", broadcastFn);
}

/**
 * Verifies + claims a drop for a user. Fully atomic against double-claims:
 * the drop flip (claimed:false -> true) and the inventory ownership
 * transfer are both conditioned on the pre-claim state, so only the first
 * caller to win the race actually gets the item.
 */
async function claimDrop(userId, dropId, code) {
  if (!mongoose.Types.ObjectId.isValid(dropId)) {
    return { success: false, message: "That drop no longer exists." };
  }

  const drop = await Drop.findById(dropId);
  if (!drop) return { success: false, message: "That drop no longer exists." };
  if (drop.claimed) return { success: false, message: "Someone already claimed this drop!" };
  if (String(code || "").trim().toUpperCase() !== drop.code) {
    return { success: false, message: "❌ Incorrect code." };
  }

  const user = await users.findOne({ userid: userId });
  if (!user) return { success: false, message: "Account not found." };

  const claimedDrop = await Drop.findOneAndUpdate(
    { _id: dropId, claimed: false },
    { $set: { claimed: true, claimedBy: userId, claimedUsername: user.username } },
    { new: true }
  );
  if (!claimedDrop) return { success: false, message: "Someone already claimed this drop!" };

  const transferred = await inventorys.findOneAndUpdate(
    { _id: drop.inventoryId, owner: taxer, locked: true },
    { $set: { owner: userId, locked: false } },
    { new: true }
  );
  if (!transferred) {
    // Extremely unlikely (item already moved out from under us) — undo the claim flag.
    await Drop.updateOne({ _id: dropId }, { $set: { claimed: false, claimedBy: null, claimedUsername: null } });
    return { success: false, message: "That item is no longer available." };
  }

  return { success: true, drop: claimedDrop };
}

module.exports = {
  checkAndTriggerDrop,
  forceDrop,
  claimDrop,
  DROP_THRESHOLD,
  DROP_BATCH_SIZE,
  setDropsEnabled: (v) => { dropsEnabled = v; },
  getDropsEnabled: () => dropsEnabled,
};
