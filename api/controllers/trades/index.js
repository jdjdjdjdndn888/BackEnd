const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const trades = require("../../modules/trades.js");
const traderequests = require("../../modules/traderequests.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const users = require("../../modules/users.js");
const userSockets = require("../../socket/usersockets.js");
const { emituser } = require("../transaction/index.js");

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
  try {
    await session.withTransaction(async () => {
      const { items: clientItems, wantedDescription } = req.body;
      if (!clientItems?.length) return res.status(400).json({ message: "Select items to offer!" });

      const user = await users.findOne({ userid: req.user.id }).session(session);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const inventoryIds = clientItems.map((i) => i.inventoryid);
      if (new Set(inventoryIds).size !== clientItems.length)
        return res.status(400).json({ message: "Duplicate items detected!" });

      const inventoryItems = await inventorys.find({
        _id: { $in: inventoryIds },
        owner: user.userid,
        locked: false,
      }).session(session);

      if (inventoryItems.length !== clientItems.length)
        return res.status(400).json({ message: "Invalid items!" });

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
        return res.status(400).json({ message: "Invalid item values!" });

      const gameType = validItems[0].game;
      if (!validItems.every((i) => i.game === gameType))
        return res.status(400).json({ message: "All items must be from the same game!" });

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

      const listing = await new trades({
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
      }).save({ session });

      await session.commitTransaction();
      req.app.get("io").emit("NEW_TRADE", listing);
      return res.status(200).json({ message: "Listing created!", data: listing });
    });
  } catch (err) {
    console.error("createListing error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

exports.cancelListing = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { tradeid } = req.body;
      if (!tradeid) return res.status(400).json({ message: "Trade ID required!" });

      const trade = await trades.findOne({ _id: tradeid, ownerid: req.user.id, status: "active" }).session(session);
      if (!trade) return res.status(404).json({ message: "Listing not found!" });

      await trades.updateOne({ _id: tradeid }, { $set: { status: "cancelled" } }, { session });

      const inventoryIds = trade.offeredItems.map((i) => i.inventoryid);
      await inventorys.updateMany({ _id: { $in: inventoryIds } }, { $set: { locked: false } }, { session });

      await traderequests.updateMany(
        { tradeid: trade._id, status: "pending" },
        { $set: { status: "cancelled" } },
        { session },
      );

      await session.commitTransaction();
      req.app.get("io").emit("TRADE_CANCELLED", { _id: tradeid });
      return res.status(200).json({ message: "Listing cancelled!" });
    });
  } catch (err) {
    console.error("cancelListing error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

exports.sendRequest = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { tradeid, items: clientItems } = req.body;
      if (!tradeid || !clientItems?.length)
        return res.status(400).json({ message: "Trade ID and items are required!" });

      const [trade, user] = await Promise.all([
        trades.findOne({ _id: tradeid, status: "active" }).session(session),
        users.findOne({ userid: req.user.id }).session(session),
      ]);

      if (!trade) return res.status(404).json({ message: "Listing not found or already taken!" });
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (trade.ownerid === user.userid)
        return res.status(400).json({ message: "You cannot request your own listing!" });

      const existing = await traderequests.findOne({ tradeid, senderid: user.userid, status: "pending" }).session(session);
      if (existing) return res.status(400).json({ message: "You already have a pending request on this listing!" });

      const inventoryIds = clientItems.map((i) => i.inventoryid);
      if (new Set(inventoryIds).size !== clientItems.length)
        return res.status(400).json({ message: "Duplicate items!" });

      const inventoryItems = await inventorys.find({
        _id: { $in: inventoryIds },
        owner: user.userid,
        locked: false,
      }).session(session);

      if (inventoryItems.length !== clientItems.length)
        return res.status(400).json({ message: "Invalid items!" });

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
        return res.status(400).json({ message: "Invalid item values!" });

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

      const request = await new traderequests({
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

      await session.commitTransaction();

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
    });
  } catch (err) {
    console.error("sendRequest error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

exports.respondRequest = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { requestid, action } = req.body;
      if (!requestid || !["accept", "decline"].includes(action))
        return res.status(400).json({ message: "Invalid request!" });

      const request = await traderequests.findById(requestid).session(session);
      if (!request || request.status !== "pending")
        return res.status(404).json({ message: "Request not found or already handled!" });

      const trade = await trades.findOne({ _id: request.tradeid, ownerid: req.user.id, status: "active" }).session(session);
      if (!trade) return res.status(403).json({ message: "Unauthorized!" });

      if (action === "decline") {
        await traderequests.updateOne({ _id: requestid }, { $set: { status: "declined" } }, { session });
        const invIds = request.offeredItems.map((i) => i.inventoryid);
        await inventorys.updateMany({ _id: { $in: invIds } }, { $set: { locked: false } }, { session });
        await session.commitTransaction();

        emitToUser(req.app.get("io"), request.senderid, "NOTIFICATION", {
          type: "warning",
          title: "Trade Declined",
          message: `Your trade request to ${trade.ownerusername} was declined.`,
          target: request.senderid,
        });

        return res.status(200).json({ message: "Request declined!" });
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

      await session.commitTransaction();

      req.app.get("io").emit("TRADE_CANCELLED", { _id: String(trade._id) });

      emitToUser(req.app.get("io"), request.senderid, "NOTIFICATION", {
        type: "success",
        title: "Trade Accepted!",
        message: `${trade.ownerusername} accepted your trade! Items have been swapped.`,
        target: request.senderid,
      });

      return res.status(200).json({ message: "Trade accepted! Items swapped." });
    });
  } catch (err) {
    console.error("respondRequest error:", err);
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
      if (!requestid) return res.status(400).json({ message: "Request ID required!" });

      const request = await traderequests.findOne({ _id: requestid, senderid: req.user.id, status: "pending" }).session(session);
      if (!request) return res.status(404).json({ message: "Request not found!" });

      await traderequests.updateOne({ _id: requestid }, { $set: { status: "cancelled" } }, { session });
      const invIds = request.offeredItems.map((i) => i.inventoryid);
      await inventorys.updateMany({ _id: { $in: invIds } }, { $set: { locked: false } }, { session });

      await session.commitTransaction();
      return res.status(200).json({ message: "Request cancelled!" });
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});
