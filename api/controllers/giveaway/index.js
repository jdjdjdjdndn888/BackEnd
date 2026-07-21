const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const axios = require("axios");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const history = require("../../modules/history.js");
const giveaways = require("../../modules/giveaways.js");
const coinflips = require("../../modules/coinflips.js");
const giveawayjoins = require("../../modules/giveawayjoins.js");
const { addHistory, updateuser, sendwebhook } = require("../transaction/index.js");
const moment = require('moment');
const { httpError } = require("../../utils/httpError.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");

// sendwebhook already no-ops gracefully when passed a falsy webhook URL.
const giveawaywebh = process.env.GIVEAWAY_WEBHOOK_URL || null;

// ── Refund a giveaway (no entries → return item to creator) ──────────────────
const refundGiveaway = async (giveawayid, io) => {
    if (!giveawayid) return;

    const session = await mongoose.startSession();
    try {
        let refunded = false;

        await session.withTransaction(async () => {
            // Atomically claim the giveaway for refund
            const giveaway = await giveaways.findOneAndUpdate(
                { _id: giveawayid, complete: false, entries: 0 },
                { $set: { complete: true, refunded: true, endeddate: new Date() } },
                { session, new: false }
            );

            if (!giveaway) return; // already rolled, has entries, or doesn't exist

            if (!giveaway.item || giveaway.item.length === 0 || !giveaway.item[0]) return;

            const creator = await users.findOne({ userid: giveaway.starterid }).session(session);
            if (!creator) return;

            // Restore item to creator's inventory
            await inventorys.create([{
                _id: giveaway.item[0].id,
                itemid: giveaway.item[0].itemid,
                owner: creator.userid,
                locked: false,
            }], { session });

            refunded = true;
        });

        if (refunded && io) {
            // Re-fetch to get full updated doc for socket emit
            const updatedGW = await giveaways.findById(giveawayid).lean();
            if (updatedGW) io.emit("GIVEAWAY_UPDATE", updatedGW);

            setTimeout(async () => {
                const activegiveaways = await giveaways.find({
                    $or: [
                        { complete: false },
                        { endeddate: { $gte: moment().subtract(1, 'minutes').toDate() } }
                    ]
                });
                io.emit("GIVEAWAY_DONE", { giveaways: activegiveaways });
            }, 62000);
        }

        return refunded;
    } catch (error) {
        console.error(`gw refund: ${error}`);
        return false;
    } finally {
        session.endSession();
    }
};

// ── Roll winner (has entries → pick winner and transfer item) ─────────────────
const rollwinner = async (giveawayid) => {
    if (!giveawayid) return "Something went wrong";

    const session = await mongoose.startSession();
    try {
        let winnerUsername = null;

        await session.withTransaction(async () => {
            // Atomically claim the giveaway — prevents double-roll.
            const giveaway = await giveaways.findOneAndUpdate(
                { _id: giveawayid, complete: false, winner: null },
                { $set: { complete: true, endeddate: new Date() } },
                { session, new: false } // get the pre-update doc so we can read its fields
            );

            if (!giveaway) return; // already rolled or doesn't exist

            if (!giveaway.item || giveaway.item.length === 0 || !giveaway.item[0]) return;

            const entries = await giveawayjoins.find({ giveawayid }).session(session);
            if (!entries || entries.length === 0) {
                // No entries — mark as refunded and return item to creator
                await giveaways.updateOne(
                    { _id: giveawayid },
                    { $set: { refunded: true } },
                    { session }
                );

                const creator = await users.findOne({ userid: giveaway.starterid }).session(session);
                if (creator) {
                    await inventorys.create([{
                        _id: giveaway.item[0].id,
                        itemid: giveaway.item[0].itemid,
                        owner: creator.userid,
                        locked: false,
                    }], { session });
                }
                return;
            }

            const randomIndex = Math.floor(Math.random() * entries.length);
            const winner = entries[randomIndex];

            const winnerUser = await users.findOne({ userid: winner.userid }).session(session);
            if (!winnerUser) return;

            // Transfer giveaway item to winner
            await inventorys.create([{
                _id: giveaway.item[0].id,
                itemid: giveaway.item[0].itemid,
                owner: winnerUser.userid,
                locked: false,
            }], { session });

            // Record winner on giveaway doc
            await giveaways.updateOne(
                { _id: giveawayid },
                { $set: {
                    winner: winnerUser.username,
                    winnerid: winnerUser.userid,
                    winnerusername: winnerUser.username,
                }},
                { session }
            );

            winnerUsername = winnerUser.username;

            // Fire webhook after we have a username (non-transactional side-effect)
            await sendwebhook(giveawaywebh, "BloxySpin Giveaway Concluded!", `A new **${giveaway.item[0].itemname}** giveaway has been concluded!`, [
                { name: "Host",   value: `\`\`\`${giveaway.starterusername}\`\`\``, inline: false },
                { name: "Item",   value: `\`\`\`${giveaway.item[0].itemname} - R${giveaway.item[0].itemvalue}\`\`\``, inline: false },
                { name: "Winner", value: `\`\`\`${winnerUser.username}\`\`\``, inline: false },
            ], giveaway.item[0].itemimage);
        });

        return winnerUsername ? `Winner: ${winnerUsername}` : "Refunded";
    } catch (error) {
        console.log(`gw roller: ${error}`);
        return "Something went wrong";
    } finally {
        session.endSession();
    }
};

// ── Schedule a single giveaway's roll + auto-refund timers ───────────────────
function scheduleGiveaway(giveawayDoc, io) {
    const giveawayId = giveawayDoc._id;
    const endDate = new Date(giveawayDoc.enddate);
    const now = new Date();
    const timeRemaining = Math.max(endDate - now, 0);

    // Auto-refund after 30 minutes if nobody has joined yet
    const AUTO_REFUND_MS = 30 * 60 * 1000;
    if (timeRemaining > AUTO_REFUND_MS) {
        setTimeout(async () => {
            // Check again at the 30-min mark — only refund if still no entries
            const gw = await giveaways.findOne({ _id: giveawayId, complete: false }).lean();
            if (!gw) return; // already handled
            if (gw.entries === 0) {
                console.log(`[giveaway] auto-refunding stale GW ${giveawayId} (0 entries after 30 min)`);
                await refundGiveaway(giveawayId, io);
                if (io) await updateuser(gw.starterid, io).catch(() => {});
            }
            // If entries > 0 we leave it to run until enddate
        }, AUTO_REFUND_MS);
    }

    // Roll winner when the GW timer expires
    setTimeout(async () => {
        // Fetch fresh doc — may have already been refunded by the 30-min check
        const gw = await giveaways.findOne({ _id: giveawayId, complete: false }).lean();
        if (!gw) return; // already complete (refunded or rolled)

        if (gw.entries === 0) {
            console.log(`[giveaway] no entries at end — refunding GW ${giveawayId}`);
            await refundGiveaway(giveawayId, io);
            if (io) await updateuser(gw.starterid, io).catch(() => {});
            return;
        }

        const result = await rollwinner(giveawayId);
        console.log(`[giveaway] rolled GW ${giveawayId}: ${result}`);

        const updatedGW = await giveaways.findById(giveawayId).lean();
        if (updatedGW && io) {
            io.emit("GIVEAWAY_UPDATE", updatedGW);
            if (updatedGW.winnerid) {
                await updateuser(updatedGW.winnerid, io).catch(() => {});
            }
        }

        setTimeout(async () => {
            const activegiveaways = await giveaways.find({
                $or: [
                    { complete: false },
                    { endeddate: { $gte: moment().subtract(1, 'minutes').toDate() } }
                ]
            });
            if (io) io.emit("GIVEAWAY_DONE", { giveaways: activegiveaways });
        }, 62000);
    }, timeRemaining);
}

// ── Restore timers on server restart ─────────────────────────────────────────
async function onstartup(io) {
  try {
      const incompleteGiveaways = await giveaways.find({ complete: false });

      for (const giveaway of incompleteGiveaways) {
          scheduleGiveaway(giveaway, io);
      }

      console.log(`[giveaway] startup: scheduled ${incompleteGiveaways.length} active giveaway(s)`);
  } catch (error) {
      console.error(`Error during onstartup: ${error}`);
  }
}

exports.startup = onstartup;
exports.scheduleGiveaway = scheduleGiveaway;

exports.getgiveaways = asyncHandler(async (req, res) => {
    try {
        const activegiveaways = await giveaways.find({
            $or: [
                { complete: false },
                {
                    endeddate: { $gte: moment().subtract(1, 'minutes').toDate() }
                }
            ]
        });

        return res.status(200).json({ message: "OK", giveaways: activegiveaways });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

exports.giveaway = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    let savedUser, totalItemValue, giveawaysToSave, endDate;

    try {
      await session.withTransaction(async () => {
        const { items: clientItems, time } = req.body;
  
        if (!clientItems || !Array.isArray(clientItems) || clientItems.length === 0) {
          throw httpError(400, "Please select items!");
        }
  
        const user = await users.findOne({ userid: req.user.id }).session(session);
        if (!user) {
          throw httpError(401, "Unauthorized");
        }
        savedUser = user;
  
        if (!time || typeof time !== 'number' || time < 1 || time > 60) {
          throw httpError(400, "Time must be a number between 1 and 60 minutes!");
        }
  
        const validatedItems = [];
        totalItemValue = 0;
  
        for (const item of clientItems) {
          const inventoryItem = await inventorys
            .findOne({ _id: item.inventoryid, owner: req.user.id, locked: false })
            .session(session);
  
          if (!inventoryItem) {
            throw httpError(400, "One or more items can't be used!");
          }
  
          const dbItem = await items.findOne({ itemid: inventoryItem.itemid }).session(session);
          if (!dbItem) {
            throw httpError(400, "One or more items can't be used!");
          }
  
          totalItemValue += dbItem.itemvalue;
  
          await inventorys.deleteOne({ _id: inventoryItem._id }).session(session);
  
          validatedItems.push({
            id: inventoryItem.id,
            itemname: dbItem.itemname,
            itemimage: dbItem.itemimage,
            itemid: dbItem.itemid,
            itemvalue: dbItem.itemvalue,
            game: dbItem.game,
          });
        }
  
        endDate = new Date();
        endDate.setMinutes(endDate.getMinutes() + time);
  
        giveawaysToSave = validatedItems.map((validatedItem) => {
          return new giveaways({
            starterid: req.user.id,
            starterusername: user.username,
            entries: 0,
            item: [{
              id: validatedItem.id,
              itemname: validatedItem.itemname,
              itemimage: validatedItem.itemimage || " ",
              itemvalue: validatedItem.itemvalue,
              itemid: validatedItem.itemid,
            }],
            winner: null,
            winnerid: null,
            winnerusername: null,
            complete: false,
            refunded: false,
            enddate: endDate,
          });
        });
  
        await giveaways.insertMany(giveawaysToSave, { session });
      });

      res.status(200).json({ message: "Successfully started the giveaway!!" });

      const io = req.app.get("io");

      giveawaysToSave.forEach((giveaway) => {
        if (io) io.emit("NEW_GIVEAWAY", giveaway.toObject());

        sendwebhook(
          giveawaywebh,
          "BloxySpin Giveaway Created",
          `A new **${giveaway.item[0].itemname}** giveaway has been created in BloxySpin. Join now at https://bloxyspin.com/`,
          [
            {
              name: "Host",
              value: `\`\`${savedUser.username}\`\``,
              inline: false,
            },
            {
              name: "Item",
              value: `\`\`${giveaway.item[0].itemname} - R$${giveaway.item[0].itemvalue}\`\``,
              inline: false,
            },
            {
              name: "Value",
              value: `\`\`${giveaway.item[0].itemvalue}\`\``,
              inline: false,
            },
            {
              name: "Giveaway End Time",
              value: `<t:${Math.floor(endDate.getTime() / 1000)}:R>`,
              inline: false,
            },
          ],
          giveaway.item[0].itemimage
        );

        // Schedule roll + auto-refund timers
        scheduleGiveaway(giveaway, io);
      });

      await addHistory(savedUser.userid, "Giveaway", `-${totalItemValue}`);
      await updateuser(savedUser.userid, io);
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      if (error.message?.includes("Write conflict")) {
        return res.status(400).json({ message: 'One or more items can\'t be used!' });
      } else {
        console.error("Error during giveaway:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    } finally {
      session.endSession();
    }
  });

exports.joingiveaway = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!acquireLock(req.user.id, "giveaway_join")) {
        return res.status(429).json({ message: "Request already in progress, please wait." });
    }

    const session = await mongoose.startSession();
    let updatedGiveaway;

    try {
        await session.withTransaction(async () => {
            const { giveawayid } = req.body;

            if (!giveawayid) throw httpError(400, "No giveaway specified");

            const [user, giveaway] = await Promise.all([
                users.findOne({ userid: req.user.id }).session(session),
                giveaways.findOne({ _id: giveawayid }).session(session),
            ]);

            if (!user) throw httpError(401, "Unauthorized");
            if (!giveaway || giveaway.complete) throw httpError(400, "Giveaway not found or already completed");
            const minLevel = giveaway.minLevel ?? 0;
            if (user.level < minLevel) throw httpError(400, `You must be at least level ${minLevel} to join this giveaway!`);

            // Atomic duplicate-entry guard: unique compound index throws 11000 on dupe.
            await giveawayjoins.create([{
                userid: req.user.id,
                giveawayid,
            }], { session });

            // Increment entry count atomically
            updatedGiveaway = await giveaways.findOneAndUpdate(
                { _id: giveawayid, complete: false },
                { $inc: { entries: 1 } },
                { session, new: true }
            );

            if (!updatedGiveaway) throw httpError(400, "Giveaway ended while joining, try again!");
        });

        req.app.get("io").emit("GIVEAWAY_UPDATE", updatedGiveaway);
        return res.status(200).json({ message: "Successfully joined the giveaway!" });

    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        if (error.code === 11000) return res.status(400).json({ message: "You have already joined this giveaway" });
        console.error("giveaway join:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        releaseLock(req.user.id, "giveaway_join");
        session.endSession();
    }
});
