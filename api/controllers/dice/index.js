const asyncHandler = require("express-async-handler");
const dice = require("../../modules/dice.js");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const history = require("../../modules/history.js");
const moment = require("moment");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { coinflipwebh, dicewebh, taxedItemsWebh, taxer, taxes } = require("../../config.js");
const { addHistory, sendwebhook, updateuser, updatestats, level, emituser } = require("../transaction/index.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");

/** Derive 6 dice rolls (1-6) from seeds using rejection sampling to avoid modulo bias */
function getDiceRolls(serverSeed, randomSeed) {
  const combined = `${serverSeed}-${randomSeed}`;
  const hash = crypto.createHash("sha256").update(combined).digest("hex");
  // Use 32 bytes = 64 hex chars. Extract one byte per die, reject values >= 252
  // to eliminate bias (252 = floor(256/6)*6). Fall back with a counter suffix.
  const rolls = [];
  let offset = 0;
  let attempt = 0;
  while (rolls.length < 6) {
    const h = crypto.createHash("sha256").update(`${combined}-${attempt}`).digest("hex");
    for (let i = 0; i < 32 && rolls.length < 6; i++) {
      const byte = parseInt(h.substring(i * 2, i * 2 + 2), 16);
      if (byte < 252) rolls.push((byte % 6) + 1); // unbiased 1-6
    }
    attempt++;
  }
  return {
    creatorDice: rolls.slice(0, 3),
    joinerDice: rolls.slice(3, 6),
    creatorTotal: rolls.slice(0, 3).reduce((a, b) => a + b, 0),
    joinerTotal: rolls.slice(3, 6).reduce((a, b) => a + b, 0),
  };
}

exports.getdice = asyncHandler(async (req, res) => {
  try {
    const games = await dice
      .find({
        $or: [
          { active: true },
          {
            active: false,
            end: { $gte: moment().subtract(1, "minutes").toDate() },
          },
        ],
      })
      .sort({ "requirements.static": -1 })
      .lean();

    const sanitized = games.map((g) => {
      if (g.active) {
        const { serverSeed, ...rest } = g;
        return rest;
      }
      return g;
    });

    res.status(200).json({ message: "OK", data: sanitized });
  } catch (e) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

exports.creatematch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "dice_create")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { items: clientItems } = req.body;

      if (!clientItems?.length) return res.status(400).json({ message: "Select items!" });

      const inventoryIds = clientItems.map((i) => i.inventoryid);
      if (new Set(inventoryIds).size !== clientItems.length) {
        return res.status(400).json({ message: "One or more items can't be used!" });
      }

      const user = await users.findOne({ userid: req.user.id }).session(session);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const inventoryItems = await inventorys
        .find({ _id: { $in: inventoryIds }, owner: user.userid, locked: false })
        .session(session);

      if (inventoryItems.length !== clientItems.length) {
        return res.status(400).json({ message: "Invalid items detected" });
      }

      const itemIds = inventoryItems.map((item) => item.itemid);
      const dbItemsRaw = await items
        .find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } })
        .session(session);
      const seenIds = new Set();
      const dbItems = dbItemsRaw.filter((item) => {
        const key = String(item.itemid);
        if (seenIds.has(key)) return false;
        seenIds.add(key);
        return true;
      });

      const validItems = dbItems.filter((item) => item.itemvalue >= 1);
      if (validItems.length !== new Set(itemIds.map(String)).size) {
        return res.status(400).json({ message: "Invalid item values" });
      }

      const gameType = validItems[0].game;
      if (!validItems.every((item) => item.game === gameType)) {
        return res.status(400).json({ message: "You cannot cross-join!" });
      }

      const itemMap = new Map(validItems.map((item) => [String(item.itemid), item]));
      const totalItemValue = inventoryItems.reduce(
        (acc, item) => acc + (itemMap.get(String(item.itemid))?.itemvalue || 0),
        0
      );

      await inventorys.deleteMany({ _id: { $in: inventoryIds } }).session(session);

      const validatedItems = inventoryItems.map((item) => ({
        id: item._id,
        itemname: itemMap.get(String(item.itemid))?.itemname,
        itemimage: itemMap.get(String(item.itemid))?.itemimage || " ",
        itemid: item.itemid,
        inventoryid: item._id,
        itemvalue: itemMap.get(String(item.itemid))?.itemvalue,
        game: itemMap.get(String(item.itemid))?.game,
      }));

      const serverSeed = crypto.randomBytes(32).toString("hex");
      const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");

      const savedGame = await new dice({
        creatorid: user.userid,
        game: gameType,
        PlayerOne: {
          id: user.userid,
          username: user.username,
          thumbnail: user.thumbnail,
          value: totalItemValue,
          chances: 1.0,
          dice: [],
          total: 0,
          items: validatedItems,
        },
        PlayerTwo: null,
        requirements: {
          min: totalItemValue * 0.9,
          max: totalItemValue * 1.1,
          static: totalItemValue,
        },
        winner: null,
        active: true,
        start: new Date(),
        end: null,
        serverSeed,
        serverSeedHash,
        randomSeed: null,
      }).save({ session });

      const publicGame = savedGame.toObject();
      delete publicGame.serverSeed;

      res.status(200).json({ message: "Match created!", data: publicGame });

      req.app.get("io").emit("NEW_DICE", publicGame);
      await Promise.all([
        addHistory(user.userid, "Dice Creation", `-${totalItemValue}`),
        updatestats(req.app.get("io")),
        updateuser(user.userid, req.app.get("io")),
        sendwebhook(
          dicewebh,
          `New R${totalItemValue} Dice Match Created`,
          `**${user.username}** created a R${totalItemValue} dice match!`,
          [{
            name: "Items",
            value: publicGame.PlayerOne.items.map(i => `${i.itemname} - R${i.itemvalue}`).join("\n").slice(0, 1024) || "—",
            inline: false,
          }],
          user.thumbnail
        ),
      ]);
    });
  } catch (error) {
    if (error.message?.includes("Write conflict")) {
      return res.status(400).json({ message: "One or more items can't be used!" });
    }
    console.error("Dice creation error:", error);
    return res.status(500).json({ message: "Internal Server error" });
  } finally {
    releaseLock(req.user.id, "dice_create");
    session.endSession();
  }
});

exports.joinmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "dice_join")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let finalUpdate, taxedItems, allItems, totalJoinerValue, game, user, winnerItems, winner;

  try {
    await session.withTransaction(async () => {
      const { items: userItems, gameid } = req.body;

      if (!userItems?.length || !Array.isArray(userItems) || !gameid) {
        return res.status(400).json({ message: "Invalid request parameters!" });
      }

      const inventoryIds = userItems.map((item) => item.inventoryid);
      if (new Set(inventoryIds).size !== userItems.length) {
        return res.status(400).json({ message: "One or more items can't be used!" });
      }

      [game, user] = await Promise.all([
        dice.findOne({ _id: gameid }).session(session),
        users.findOne({ userid: req.user.id }).session(session),
      ]);

      if (!game || !user) return res.status(400).json({ message: "Game or user not found!" });
      if (!game.active) return res.status(400).json({ message: "Game not active!" });
      if (game.PlayerOne.id === user.userid) {
        return res.status(400).json({ message: "You cannot join your own game!" });
      }

      const inventoryItems = await inventorys
        .find({ _id: { $in: inventoryIds }, owner: user.userid, locked: false })
        .session(session);

      if (inventoryItems.length !== userItems.length) {
        return res.status(400).json({ message: "One or more items can't be used!" });
      }

      const itemIds = inventoryItems.map((item) => item.itemid);
      const dbItems = await items
        .find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } })
        .session(session);
      const validItems = dbItems.filter((item) => item.itemvalue > 0);

      if (validItems.length !== new Set(itemIds.map(String)).size) {
        return res.status(400).json({ message: "Invalid item values!" });
      }

      const gameType = validItems[0]?.game;
      if (!validItems.every((item) => item.game === gameType) || gameType !== game.game) {
        return res.status(400).json({ message: "You cannot cross join!" });
      }

      const itemMap = new Map(validItems.map((item) => [String(item.itemid), item]));
      totalJoinerValue = inventoryItems.reduce(
        (acc, item) => acc + (itemMap.get(String(item.itemid))?.itemvalue || 0),
        0
      );

      if (totalJoinerValue < game.requirements.min || totalJoinerValue > game.requirements.max) {
        return res.status(400).json({ message: "The selected value doesn't match!" });
      }

      let serverSeed = game.serverSeed;
      let serverSeedHash = game.serverSeedHash;
      if (!serverSeed || !serverSeedHash) {
        serverSeed = crypto.randomBytes(32).toString("hex");
        serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
      }

      const randomSeed = crypto.randomBytes(16).toString("hex");
      const now = new Date();

      const { creatorDice, joinerDice, creatorTotal, joinerTotal } = getDiceRolls(serverSeed, randomSeed);

      // Higher total wins; tie goes to creator
      winner = joinerTotal > creatorTotal ? "PlayerTwo" : "PlayerOne";

      const updateResult = await dice.updateOne(
        { _id: gameid, active: true },
        {
          $set: {
            active: false,
            end: now,
            serverSeed,
            serverSeedHash,
            randomSeed,
            "requirements.static": game.requirements.static + totalJoinerValue,
            "PlayerOne.dice": creatorDice,
            "PlayerOne.total": creatorTotal,
            "PlayerOne.chances": creatorTotal / (creatorTotal + joinerTotal),
            PlayerTwo: {
              id: user.userid,
              username: user.username,
              thumbnail: user.thumbnail,
              value: totalJoinerValue,
              chances: joinerTotal / (creatorTotal + joinerTotal),
              dice: joinerDice,
              total: joinerTotal,
              items: inventoryItems.map((item) => ({
                id: item._id,
                itemname: itemMap.get(String(item.itemid))?.itemname,
                itemvalue: itemMap.get(String(item.itemid))?.itemvalue,
                itemid: item.itemid,
                inventoryid: item._id,
                itemimage: itemMap.get(String(item.itemid))?.itemimage || "null",
              })),
            },
          },
        },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        return res.status(400).json({ message: "Game is being joined, try again!" });
      }

      await inventorys.deleteMany({ _id: { $in: inventoryIds } }).session(session);

      allItems = [
        ...game.PlayerOne.items,
        ...inventoryItems.map((item) => ({
          ...item.toObject(),
          itemname: itemMap.get(String(item.itemid))?.itemname,
          itemvalue: itemMap.get(String(item.itemid))?.itemvalue,
        })),
      ];

      const sortedItems = allItems.sort((a, b) => a.itemvalue - b.itemvalue);
      const taxedItemsCount = Math.floor(sortedItems.length * taxes);
      taxedItems = sortedItems.slice(0, taxedItemsCount);
      winnerItems = sortedItems.slice(taxedItemsCount);

      await inventorys.insertMany(
        taxedItems.map((item) => ({
          _id: item._id,
          owner: taxer,
          itemid: item.itemid,
          locked: false,
        })),
        { session }
      );

      const winnerId = winner === "PlayerOne" ? game.PlayerOne.id : user.userid;
      const loserId = winner === "PlayerOne" ? user.userid : game.PlayerOne.id;

      await Promise.all([
        users.findOneAndUpdate(
          { userid: winnerId },
          [{ $set: { won: { $add: ["$won", totalJoinerValue] }, wager: { $add: ["$wager", totalJoinerValue] } } }],
          { session, new: true }
        ),
        users.findOneAndUpdate(
          { userid: loserId },
          [{ $set: { lost: { $add: ["$lost", totalJoinerValue] }, wager: { $add: ["$wager", totalJoinerValue] } } }],
          { session, new: true }
        ),
      ]);

      finalUpdate = await dice.findOneAndUpdate(
        { _id: gameid },
        {
          $set: {
            winner: winner === "PlayerOne" ? game.PlayerOne.id : user.userid,
          },
        },
        { session, new: true }
      );
    });

    const winnerId = winner === "PlayerOne" ? game.PlayerOne.id : user.userid;
    const loserId = winner === "PlayerOne" ? user.userid : game.PlayerOne.id;

    res.status(200).json({ message: "Successfully joined match!", data: finalUpdate });

    req.app.get("io").emit("DICE_UPDATE", finalUpdate);

    await emituser(
      "NOTIFICATION",
      {
        type: "info",
        title: "Someone joined your dice game!",
        message: `${user.username} joined your R${game.requirements.static} dice game. ${winner === "PlayerOne" ? "You won! 🎉" : "They won 😭"}`,
        target: game.PlayerOne.id,
      },
      game.PlayerOne.id,
      req.app.get("io")
    );

    setTimeout(async () => {
      try {
        await inventorys.insertMany(
          winnerItems.map((item) => ({
            _id: item._id,
            owner: winnerId,
            itemid: item.itemid,
            locked: false,
          }))
        );
        await updateuser(winnerId, req.app.get("io"));
        await updateuser(loserId, req.app.get("io"));
      } catch (error) {
        console.error("Dice setTimeout error:", error);
      } finally {
        session.endSession();
      }
    }, 5000);

    setTimeout(() => {
      req.app.get("io").emit("DICE_CANCEL", { _id: finalUpdate._id, active: false });
      updatestats(req.app.get("io"));
    }, 60000);

    await Promise.all([
      addHistory(winnerId, "Dice Win", `+${totalJoinerValue}`),
      addHistory(loserId, "Dice Loss", `-${totalJoinerValue}`),
      level(winnerId, totalJoinerValue),
      level(loserId, totalJoinerValue),
      updatestats(req.app.get("io")),
    ]);
  } catch (error) {
    if (error.message?.includes("Write conflict")) {
      res.status(400).json({ message: "One or more items can't be used!" });
    } else {
      console.error("dice join:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } finally {
    releaseLock(req.user.id, "dice_join");
  }
});

exports.cancelmatch = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
      if (!req.body.gameid) return res.status(400).json({ message: "Game ID required!" });

      const [user, game] = await Promise.all([
        users.findOne({ userid: req.user.id }).session(session),
        dice.findOne({ _id: req.body.gameid }).session(session),
      ]);

      if (!user) return res.status(401).json({ message: "User not found!" });
      if (!game) return res.status(404).json({ message: "Game not found!" });
      if (!game.active) return res.status(400).json({ message: "Game already completed!" });
      if (game.creatorid !== user.userid) return res.status(403).json({ message: "Not your game!" });

      const updateResult = await dice.updateOne(
        { _id: game._id, active: true, creatorid: user.userid },
        { $set: { active: false } },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        return res.status(409).json({ message: "Game is being joined!" });
      }

      const itemsToRestore = game.PlayerOne.items.map((item) => ({
        _id: item.id,
        owner: user.userid,
        itemid: item.itemid,
        locked: false,
        createdAt: new Date(),
      }));

      await inventorys.insertMany(itemsToRestore, { session, ordered: false }).catch((error) => {
        if (error.code !== 11000) throw error;
      });

      req.app.get("io").emit("DICE_CANCEL", { _id: game._id, active: false });
      await Promise.all([
        updatestats(req.app.get("io")),
        addHistory(user.userid, "Dice Cancel", `+${game.requirements.static}`),
        updateuser(user.userid, req.app.get("io")),
      ]);

      return res.status(200).json({ success: true, message: "Game cancelled!" });
    });
  } catch (error) {
    console.error("Cancel Dice Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

exports.historyme = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const games = await dice
      .find({
        $and: [
          { $or: [{ "PlayerOne.id": req.user.id, active: false }, { "PlayerTwo.id": req.user.id, active: false }] },
          { "PlayerTwo.id": { $exists: true } },
        ],
      })
      .sort({ end: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({ message: "OK", history: games });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
