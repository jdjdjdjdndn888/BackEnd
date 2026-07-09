const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const trades = require("../../modules/trades.js");
const traderequests = require("../../modules/traderequests.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const users = require("../../modules/users.js");
const userSockets = require("../../socket/usersockets.js");
const { emituser, sendwebhook, WEBHOOK_COLORS } = require("../transaction/index.js");
const { tradewebh } = require("../../config.js");
const { httpError } = require("../../utils/httpError.js");

function emitToUser(io, userid, event, data) {
  const socketIds = userSockets.get(userid);
  socketIds.forEach((sid) => {
    const s = io.sockets.sockets.get(sid);
    if (s) s.emit(event, data);
  });
}

exports.getListings = asyncHandler(async (req, res) => {
  try {
    const { game } = req.query;
    const query = { status: "active" };
    if (game && game !== "all") query.game = game;
    const listings = await trades.find(query).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ message: "OK", data: listings });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

exports.getMyListings = asyncHandler(async (req, res) => {
  try {
    const myTrades = await trades.find({ ownerid: req.user.id, status: "active" });
    const myRequests = await traderequests.find({ senderid: req.user.id }).sort({ createdAt: -1 }).limit(20);
    const incoming = await traderequests.find({
      tradeid: { $in: (await trades.find({ ownerid: req.user.id, status: "active" }).select("_id")).map(t => t._id) },
      status: "pending",
    }).sort({ createdAt: -1 });
    return res.status(200).json({ message: "OK", data: { listings: myTrades, requests: myRequests, incoming } });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

exports.createListing = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  // Pre-generate the id so a driver-level automatic retry of withTransaction
  // (which happens transparently on transient errors) re-runs this callback
  // against the SAME _id instead of creating a brand new document each time
  // — that mismatch was the cause of listings occasionally getting created
  // twice.
  const listingId = new mongoose.Types.ObjectId();
  let listing;
  try {
    await session.withTransaction(async () => {
      const { items: clientItems, wantedDescription } = req.body;
      if (!clientItems?.length) throw httpError(400, "Select items to offer!");

      const user = await users.findOne({ userid: req.user.id }).session(session);
      if (!user) throw httpError(401, "Unauthorized");

      const inventoryIds = clientItems.map((i) => i.inventoryid);
      if (new Set(inventoryIds).size !== clientItems.length)
        throw httpError(400, "Duplicate items detected!");

      const inventoryItems = await inventorys.find({
        _id: { $in: inventoryIds },
        owner: user.userid,
        locked: false,
      }).session(session);

      if (inventoryItems.length !== clientItems.length)
        throw httpError(400, "Invalid items!");

      const itemIds = inventoryItems.map((i) => i.itemid);
      const dbItemsRaw = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).session(session);
      const seen = new Set();
      const dbItems = dbItemsRaw.filter((item) => {
        const k = String(item.itemid);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      const validItems = dbItems.filter((i) => i.itemvalue >= 1);
      if (validItems.length !== new Set(itemIds.map(String)).size)
        throw httpError(400, "Invalid item values!");

      const gameType = validItems[0].game;
      if (!validItems.every((i) => i.game === gameType))
        throw httpError(400, "All items must be from the same game!");

      const itemMap = new Map(validItems.map((i) => [String(i.itemid), i]));
      const totalValue = inventoryItems.reduce(
        (acc, inv) => acc + (itemMap.get(String(inv.itemid))?.itemvalue || 0),
        0,
      );

      await inventorys.updateMany(
        { _id: { $in: inventoryIds } },
        { $set: { locked: true } },
        { session },
      );

      listing = await trades.findOneAndUpdate(
        { _id: listingId },
        {
          $setOnInsert: {
            _id: listingId,
            ownerid: user.userid,
            ownerusername: user.username,
            ownerthumbnail: user.thumbnail,
            game: gameType,
            offeredItems: inventoryItems.map((inv) => ({
              itemid: inv.itemid,
              inventoryid: String(inv._id),
              itemname: itemMap.get(String(inv.itemid))?.itemname || "",
              itemimage: itemMap.get(String(inv.itemid))?.itemimage || "",
              itemvalue: itemMap.get(String(inv.itemid))?.itemvalue || 0,
            })),
            wantedDescription: wantedDescription || "",
            totalValue,
            status: "active",
          },
        },
        { upsert: true, new: true, session },
      );
    });

    req.app.get("io").emit("NEW_TRADE", listing);
    return res.status(200).json({ message: "Listing created!", data: listing });
  } catch (err) {
    console.error("createListing error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

exports.cancelListing = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  const { tradeid } = req.body;
  try {
    await session.withTransaction(async () => {
      if (!tradeid) throw httpError(400, "Trade ID required!");

      const trade = await trades.findOne({ _id: tradeid, ownerid: req.user.id, status: "active" }).session(session);
      if (!trade) throw httpError(404, "Listing not found!");

      await trades.updateOne({ _id: tradeid }, { $set: { status: "cancelled" } }, { session });

      const inventoryIds = trade.offeredItems.map((i) => i.inventoryid);
      await inventorys.updateMany({ _id: { $in: inventoryIds } }, { $set: { locked: false } }, { session });

      await traderequests.updateMany(
        { tradeid: trade._id, status: "pending" },
        { $set: { status: "cancelled" } },
        { session },
      );
    });

    req.app.get("io").emit("TRADE_CANCELLED", { _id: tradeid });
    return res.status(200).json({ message: "Listing cancelled!" });
  } catch (err) {
    console.error("cancelListing error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

exports.sendRequest = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let trade, user, request, totalValue;
  try {
    await session.withTransaction(async () => {
      const { tradeid, items: clientItems } = req.body;
      if (!tradeid || !clientItems?.length)
        throw httpError(400, "Trade ID and items are required!");

      [trade, user] = await Promise.all([
        trades.findOne({ _id: tradeid, status: "active" }).session(session),
        users.findOne({ userid: req.user.id }).session(session),
      ]);

      if (!trade) throw httpError(404, "Listing not found or already taken!");
      if (!user) throw httpError(401, "Unauthorized");
      if (trade.ownerid === user.userid)
        throw httpError(400, "You cannot request your own listing!");

      const existing = await traderequests.findOne({ tradeid, senderid: user.userid, status: "pending" }).session(session);
      if (existing) throw httpError(400, "You already have a pending request on this listing!");

      const inventoryIds = clientItems.map((i) => i.inventoryid);
      if (new Set(inventoryIds).size !== clientItems.length)
        throw httpError(400, "Duplicate items!");

      const inventoryItems = await inventorys.find({
        _id: { $in: inventoryIds },
        owner: user.userid,
        locked: false,
      }).session(session);

      if (inventoryItems.length !== clientItems.length)
        throw httpError(400, "Invalid items!");

      const itemIds = inventoryItems.map((i) => i.itemid);
      const dbItemsRaw = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).session(session);
      const seen = new Set();
      const dbItems = dbItemsRaw.filter((item) => {
        const k = String(item.itemid);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      const validItems = dbItems.filter((i) => i.itemvalue >= 1);
      if (validItems.length !== new Set(itemIds.map(String)).size)
        throw httpError(400, "Invalid item values!");

      const itemMap = new Map(validItems.map((i) => [String(i.itemid), i]));
      totalValue = inventoryItems.reduce(
        (acc, inv) => acc + (itemMap.get(String(inv.itemid))?.itemvalue || 0),
        0,
      );

      await inventorys.updateMany(
        { _id: { $in: inventoryIds } },
        { $set: { locked: true } },
        { session },
      );

      request = await new traderequests({
        tradeid: trade._id,
        senderid: user.userid,
        senderusername: user.username,
        senderthumbnail: user.thumbnail,
        offeredItems: inventoryItems.map((inv) => ({
          itemid: inv.itemid,
          inventoryid: String(inv._id),
          itemname: itemMap.get(String(inv.itemid))?.itemname || "",
          itemimage: itemMap.get(String(inv.itemid))?.itemimage || "",
          itemvalue: itemMap.get(String(inv.itemid))?.itemvalue || 0,
        })),
        totalValue,
      }).save({ session });
    });

    emitToUser(req.app.get("io"), trade.ownerid, "NOTIFICATION", {
      type: "trade_request",
      title: "New Trade Request",
      message: `${user.username} wants to trade with you! They offer R$${totalValue.toLocaleString()}`,
      requestId: String(request._id),
      tradeid: String(trade._id),
      senderusername: user.username,
      senderthumbnail: user.thumbnail,
      offeredItems: request.offeredItems,
      target: trade.ownerid,
    });

    return res.status(200).json({ message: "Trade request sent!", data: request });
  } catch (err) {
    console.error("sendRequest error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

exports.respondRequest = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let request, trade, declined = false;
  try {
    await session.withTransaction(async () => {
      const { requestid, action } = req.body;
      if (!requestid || !["accept", "decline"].includes(action))
        throw httpError(400, "Invalid request!");

      request = await traderequests.findById(requestid).session(session);
      if (!request || request.status !== "pending")
        throw httpError(404, "Request not found or already handled!");

      trade = await trades.findOne({ _id: request.tradeid, ownerid: req.user.id, status: "active" }).session(session);
      if (!trade) throw httpError(403, "Unauthorized!");

      if (action === "decline") {
        declined = true;
        await traderequests.updateOne({ _id: requestid }, { $set: { status: "declined" } }, { session });
        const invIds = request.offeredItems.map((i) => i.inventoryid);
        await inventorys.updateMany({ _id: { $in: invIds } }, { $set: { locked: false } }, { session });
        return;
      }

      await trades.updateOne({ _id: trade._id }, { $set: { status: "completed" } }, { session });
      await traderequests.updateOne({ _id: requestid }, { $set: { status: "accepted" } }, { session });
      await traderequests.updateMany(
        { tradeid: trade._id, _id: { $ne: requestid }, status: "pending" },
        { $set: { status: "cancelled" } },
        { session },
      );

      const listingInvIds = trade.offeredItems.map((i) => i.inventoryid);
      const requestInvIds = request.offeredItems.map((i) => i.inventoryid);

      await inventorys.updateMany(
        { _id: { $in: listingInvIds } },
        { $set: { owner: request.senderid, locked: false } },
        { session },
      );
      await inventorys.updateMany(
        { _id: { $in: requestInvIds } },
        { $set: { owner: trade.ownerid, locked: false } },
        { session },
      );

      const otherCancelled = await traderequests.find({
        tradeid: trade._id,
        status: "cancelled",
        _id: { $ne: requestid },
      }).session(session);

      for (const r of otherCancelled) {
        const ids = r.offeredItems.map((i) => i.inventoryid);
        await inventorys.updateMany({ _id: { $in: ids } }, { $set: { locked: false } }, { session });
      }
    });

    if (declined) {
      emitToUser(req.app.get("io"), request.senderid, "NOTIFICATION", {
        type: "warning",
        title: "Trade Declined",
        message: `Your trade request to ${trade.ownerusername} was declined.`,
        target: request.senderid,
      });

      return res.status(200).json({ message: "Request declined!" });
    }

    req.app.get("io").emit("TRADE_CANCELLED", { _id: String(trade._id) });

    emitToUser(req.app.get("io"), request.senderid, "NOTIFICATION", {
      type: "success",
      title: "Trade Accepted!",
      message: `${trade.ownerusername} accepted your trade! Items have been swapped.`,
      target: request.senderid,
    });

    sendwebhook(
      tradewebh,
      "🔄 Trade Completed",
      `**${trade.ownerusername}** and **${request.senderusername || request.senderid}** completed a trade.`,
      [
        { name: "Listing Owner", value: trade.ownerusername, inline: true },
        { name: "Trade Partner", value: String(request.senderusername || request.senderid), inline: true },
      ],
      null,
      null,
      WEBHOOK_COLORS.CREATE
    ).catch((e) => console.error("trade webhook:", e));

    return res.status(200).json({ message: "Trade accepted! Items swapped." });
  } catch (err) {
    console.error("respondRequest error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

exports.cancelRequest = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { requestid } = req.body;
      if (!requestid) throw httpError(400, "Request ID required!");

      const request = await traderequests.findOne({ _id: requestid, senderid: req.user.id, status: "pending" }).session(session);
      if (!request) throw httpError(404, "Request not found!");

      await traderequests.updateOne({ _id: requestid }, { $set: { status: "cancelled" } }, { session });
      const invIds = request.offeredItems.map((i) => i.inventoryid);
      await inventorys.updateMany({ _id: { $in: invIds } }, { $set: { locked: false } }, { session });
    });

    return res.status(200).json({ message: "Request cancelled!" });
  } catch (err) {
    console.error("cancelRequest error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});
