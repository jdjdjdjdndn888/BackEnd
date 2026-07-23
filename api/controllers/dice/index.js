const asyncHandler = require("express-async-handler");
const dice = require("../../modules/dice.js");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const history = require("../../modules/history.js");
const moment = require("moment");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { taxer, taxes, dicewebh } = require("../../config.js");
const { addHistory, updateuser, updatestats, level, emituser, sendwebhook, WEBHOOK_COLORS, registerTaxedItems } = require("../transaction/index.js");
const { checkAndTriggerDrop } = require("../chat/index.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { httpError } = require("../../utils/httpError.js");
const { retryPayout } = require("../../utils/retryPayout.js");

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
  let publicGame, savedUser, totalItemValue;

  try {
    await session.withTransaction(async () => {
      const { items: clientItems, crazyMode: crazyModeRaw } = req.body;
      const crazyMode = crazyModeRaw === true || crazyModeRaw === "true";

      if (!clientItems?.length) throw httpError(400, "Select items!");

      const inventoryIds = clientItems.map((i) => i.inventoryid);
      if (new Set(inventoryIds).size !== clientItems.length) {
        throw httpError(400, "One or more items can't be used!");
      }

      const user = await users.findOne({ userid: Number(req.user.id) }).session(session);
      if (!user) throw httpError(401, "Unauthorized");
      savedUser = user;

      const inventoryItems = await inventorys
        .find({ _id: { $in: inventoryIds }, owner: user.userid, locked: false })
        .session(session);

      if (inventoryItems.length !== clientItems.length) {
        throw httpError(400, "Invalid items detected");
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
        throw httpError(400, "Invalid item values");
      }

      const gameType = validItems[0].game;
      if (!validItems.every((item) => item.game === gameType)) {
        throw httpError(400, "You cannot cross-join!");
      }

      const itemMap = new Map(validItems.map((item) => [String(item.itemid), item]));
      totalItemValue = inventoryItems.reduce(
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
        crazyMode,
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

      publicGame = savedGame.toObject();
      delete publicGame.serverSeed;
    });

    res.status(200).json({ message: "Match created!", data: publicGame });

    // Everything below runs after the response is already sent — it must
    // never throw past this point, or the outer catch would try to send a
    // second response and can crash the process (see coinflip controller
    // for the full explanation of this pattern).
    try {
      req.app.get("io").emit("NEW_DICE", publicGame);
      await Promise.all([
        addHistory(savedUser.userid, "Dice Creation", `-${totalItemValue}`),
        updatestats(req.app.get("io")),
        updateuser(savedUser.userid, req.app.get("io")),
        sendwebhook(
          dicewebh,
          "🎲 Dice Game Created",
          `**${savedUser.username}** created a R$${totalItemValue.toLocaleString()} dice game.`,
          [{ name: "Value", value: `R$${totalItemValue.toLocaleString()}`, inline: true }],
          savedUser.thumbnail,
          null,
          WEBHOOK_COLORS.CREATE
        ),
      ]);
    } catch (sideEffectError) {
      console.error("dice create side-effects:", sideEffectError);
    }
    return;
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
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
  let finalUpdate, taxedItems, allItems, totalJoinerValue, game, user, winnerItems, winner, isTie;

  try {
    await session.withTransaction(async () => {
      const { items: userItems, gameid } = req.body;

      if (!userItems?.length || !Array.isArray(userItems) || !gameid) {
        throw httpError(400, "Invalid request parameters!");
      }

      const inventoryIds = userItems.map((item) => item.inventoryid);
      if (new Set(inventoryIds).size !== userItems.length) {
        throw httpError(400, "One or more items can't be used!");
      }

      [game, user] = await Promise.all([
        dice.findOne({ _id: gameid }).session(session),
        users.findOne({ userid: Number(req.user.id) }).session(session),
      ]);

      if (!game || !user) throw httpError(400, "Game or user not found!");
      if (!game.active) throw httpError(400, "Game not active!");
      if (game.PlayerOne.id === user.userid) {
        throw httpError(400, "You cannot join your own game!");
      }

      const inventoryItems = await inventorys
        .find({ _id: { $in: inventoryIds }, owner: user.userid, locked: false })
        .session(session);

      if (inventoryItems.length !== userItems.length) {
        throw httpError(400, "One or more items can't be used!");
      }

      const itemIds = inventoryItems.map((item) => item.itemid);
      const dbItems = await items
        .find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } })
        .session(session);
      const validItems = dbItems.filter((item) => item.itemvalue > 0);

      if (validItems.length !== new Set(itemIds.map(String)).size) {
        throw httpError(400, "Invalid item values!");
      }

      const gameType = validItems[0]?.game;
      if (!validItems.every((item) => item.game === gameType) || gameType !== game.game) {
        throw httpError(400, "You cannot cross join!");
      }

      const itemMap = new Map(validItems.map((item) => [String(item.itemid), item]));
      totalJoinerValue = inventoryItems.reduce(
        (acc, item) => acc + (itemMap.get(String(item.itemid))?.itemvalue || 0),
        0
      );

      if (totalJoinerValue < game.requirements.min || totalJoinerValue > game.requirements.max) {
        throw httpError(400, "The selected value doesn't match!");
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

      isTie = creatorTotal === joinerTotal;
      // Higher total wins; a tie refunds both players (no winner, no tax).
      winner = joinerTotal > creatorTotal ? "PlayerTwo" : "PlayerOne";
      // Crazy Mode flips the outcome: the side that would normally lose wins the pot instead.
      // (Irrelevant on a tie, since there is no loser to flip to.)
      if (!isTie && game.crazyMode) winner = winner === "PlayerOne" ? "PlayerTwo" : "PlayerOne";

      const updateResult = await dice.updateOne(
        { _id: gameid, active: true },
        {
          $set: {
            active: false,
            end: now,
            serverSeed,
            serverSeedHash,
            randomSeed,
            tie: isTie,
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
        throw httpError(400, "Game is being joined, try again!");
      }

      if (isTie) {
        // Refund: joiner's items were never removed from their inventory, and
        // the creator's items (held as a snapshot on the game doc) are restored.
        await inventorys.insertMany(
          game.PlayerOne.items.map((item) => ({
            _id: item.id,
            owner: game.PlayerOne.id,
            itemid: item.itemid,
            locked: false,
            createdAt: new Date(),
          })),
          { session, ordered: false }
        ).catch((error) => {
          if (error.code !== 11000) throw error;
        });

        finalUpdate = await dice.findOneAndUpdate(
          { _id: gameid },
          { $set: { winner: null } },
          { session, new: true }
        );
        return;
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
      const totalPotValue = allItems.reduce((sum, item) => sum + (item.itemvalue || 0), 0);
      let taxAccum = 0;
      taxedItems = [];
      winnerItems = [];
      // Only tax pots with 8 or more items total
      if (allItems.length >= 8) {
        const targetTaxValue = totalPotValue * taxes;
        for (const item of sortedItems) {
          if (taxAccum < targetTaxValue) {
            taxedItems.push(item);
            taxAccum += (item.itemvalue || 0);
          } else {
            winnerItems.push(item);
          }
        }
      } else {
        winnerItems = [...sortedItems];
      }

      if (taxedItems.length > 0) {
        await inventorys.insertMany(
          taxedItems.map((item) => ({
            _id: item._id,
            owner: taxer,
            itemid: item.itemid,
            locked: false,
          })),
          { session }
        );
        await registerTaxedItems(taxedItems.length, session);
      }

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

    res.status(200).json({ message: "Successfully joined match!", data: finalUpdate });

    if (isTie) {
      // Tie: refund only, no winner/loser payouts, tax, or side effects to run.
      try {
        req.app.get("io").emit("DICE_UPDATE", finalUpdate);
        await Promise.all([
          updatestats(req.app.get("io")),
          updateuser(game.PlayerOne.id, req.app.get("io")),
          updateuser(user.userid, req.app.get("io")),
          emituser(
            "NOTIFICATION",
            {
              type: "info",
              title: "Dice game tied!",
              message: `Your R${game.requirements.static} dice game vs ${user.username} was a tie — items refunded to both players.`,
              target: game.PlayerOne.id,
            },
            game.PlayerOne.id,
            req.app.get("io")
          ),
          emituser(
            "NOTIFICATION",
            {
              type: "info",
              title: "Dice game tied!",
              message: `Your R${game.requirements.static} dice game vs ${game.PlayerOne.username} was a tie — items refunded to both players.`,
              target: user.userid,
            },
            user.userid,
            req.app.get("io")
          ),
        ]);
        setTimeout(() => {
          req.app.get("io").emit("DICE_CANCEL", { _id: finalUpdate._id, active: false });
        }, 60000);
      } catch (sideEffectError) {
        console.error("dice tie side-effects:", sideEffectError);
      }
      return;
    }

    const winnerId = winner === "PlayerOne" ? game.PlayerOne.id : user.userid;
    const loserId = winner === "PlayerOne" ? user.userid : game.PlayerOne.id;

    // Everything below runs after the response is already sent — it must
    // never throw past this point, or the outer catch would try to send a
    // second response and can crash the process, dropping live-update
    // sockets for every connected client until Render restarts it (this
    // was the root cause of clients needing a refresh to see finished games).
    try {
      req.app.get("io").emit("DICE_UPDATE", finalUpdate);

      // Broadcast live win for homepage ticker
      try {
        const winnerName = winner === "PlayerOne" ? game.PlayerOne.username : user.username;
        req.app.get("io").emit("LIVE_WIN", { user: winnerName, game: "Dice", amount: game.requirements.static + totalJoinerValue });
      } catch {}

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
      checkAndTriggerDrop(req.app.get("io")).catch((e) => console.error("dice drop check:", e));

      // Pay winner with automatic retry — up to 5 attempts with exponential back-off
      await retryPayout(
        winnerItems.map((item) => ({
          _id: item._id,
          owner: winnerId,
          itemid: item.itemid,
          locked: false,
        })),
        "Dice"
      );
      await updateuser(winnerId, req.app.get("io"));
      await updateuser(loserId, req.app.get("io"));

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
        sendwebhook(
          dicewebh,
          "🏁 Dice Game Finished",
          `**${winnerId === game.PlayerOne.id ? game.PlayerOne.username : user.username}** won a R$${(game.requirements.static + totalJoinerValue).toLocaleString()} dice game!`,
          [
            { name: "Player 1", value: game.PlayerOne.username, inline: true },
            { name: "Player 2", value: user.username, inline: true },
          ],
          null,
          null,
          WEBHOOK_COLORS.WIN
        ),
      ]);
    } catch (sideEffectError) {
      console.error("dice join side-effects:", sideEffectError);
    }

  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message?.includes("Write conflict")) {
      res.status(400).json({ message: "One or more items can't be used!" });
    } else {
      console.error("dice join:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } finally {
    releaseLock(req.user.id, "dice_join");
    session.endSession();
  }
});

exports.cancelmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "dice_cancel")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const session = await mongoose.startSession();
  let user, game;

  try {
    await session.withTransaction(async () => {
      if (!req.user?.id) throw httpError(401, "Unauthorized");
      if (!req.body.gameid) throw httpError(400, "Game ID required!");

      [user, game] = await Promise.all([
        users.findOne({ userid: req.user.id }).session(session),
        dice.findOne({ _id: req.body.gameid }).session(session),
      ]);

      if (!user) throw httpError(401, "User not found!");
      if (!game) throw httpError(404, "Game not found!");
      if (!game.active) throw httpError(400, "Game already completed!");
      if (game.creatorid !== user.userid) throw httpError(403, "Not your game!");

      const updateResult = await dice.updateOne(
        { _id: game._id, active: true, creatorid: user.userid },
        { $set: { active: false } },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw httpError(409, "Game is being joined!");
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
    });

    req.app.get("io").emit("DICE_CANCEL", { _id: game._id, active: false });
    await Promise.all([
      updatestats(req.app.get("io")),
      addHistory(user.userid, "Dice Cancel", `+${game.requirements.static}`),
      updateuser(user.userid, req.app.get("io")),
    ]);

    return res.status(200).json({ success: true, message: "Game cancelled!" });
  } catch (error) {
    console.error("Cancel Dice Error:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "dice_cancel");
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
