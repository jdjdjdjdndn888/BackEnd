const asyncHandler = require("express-async-handler");
const rpsMatches = require("../../modules/rps.js");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const moment = require('moment');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { taxer, taxes, rpswebh } = require("../../config.js");
const { addHistory, updateuser, updatestats, level, emituser, sendwebhook, WEBHOOK_COLORS, registerTaxedItems } = require("../transaction/index.js");
const { checkAndTriggerDrop } = require("../chat/index.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { httpError } = require("../../utils/httpError.js");
const { retryPayout } = require("../../utils/retryPayout.js");

const CHOICES = ["rock", "paper", "scissors"];

// While a match is still waiting for an opponent, nobody but the creator
// should be able to see their rock/paper/scissors pick — otherwise anyone
// browsing the room list (or listening on the socket) could read it straight
// out of the API response before choosing whether/how to join. Once the
// match resolves (winnerchoice is set) it's safe to reveal both picks.
function sanitizeActiveMatch(match) {
  if (!match.active) return match;
  const { serverSeed, creatorchoice, ...rest } = match;
  if (rest.PlayerOne) {
    const { choice, ...playerOneRest } = rest.PlayerOne;
    rest.PlayerOne = playerOneRest;
  }
  if (rest.PlayerTwo) {
    const { choice, ...playerTwoRest } = rest.PlayerTwo;
    rest.PlayerTwo = playerTwoRest;
  }
  return rest;
}

exports.getmatches = asyncHandler(async (req, res) => {
  try {
    const matches = await rpsMatches.find({
      $or: [
        { active: true },
        {
          active: false,
          end: { $gte: moment().subtract(1, 'minutes').toDate() }
        }
      ]
    }).sort({ value: -1 }).lean();

    const sanitizedMatches = matches.map(match => sanitizeActiveMatch(match));

    res.status(200).json({ message: "OK", data: sanitizedMatches });
  } catch (e) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

function getResult(serverSeed, randomSeed) {
  const mod = `${serverSeed}-${randomSeed}`;
  const hashResult = crypto.createHash('sha256').update(mod).digest('hex');
  const decimalResult = parseInt(hashResult.substring(0, 8), 16);
  const maxValue = Math.pow(16, 8);
  return decimalResult / maxValue;
}

// Winner is chosen proportionally by wagered value, same math as Coinflip.
// Each player's rock/paper/scissors pick is recorded for display/fairness,
// it does not drive classic beat-relationships between the two choices.
function getWinner(normalizedResult, starterValue, joinerValue) {
  const totalValue = starterValue + joinerValue;
  const starterChance = starterValue / totalValue;
  const joinerChance = joinerValue / totalValue;
  return {
    winner: normalizedResult < starterChance ? "PlayerOne" : "PlayerTwo",
    chances: { starter: starterChance, joiner: joinerChance },
  };
}

exports.creatematch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "rps_create")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let publicMatch, savedUser, totalItemValue;

  try {
    await session.withTransaction(async () => {
      const { items: clientItems, choice, crazyMode: crazyModeRaw } = req.body;
      const crazyMode = crazyModeRaw === true || crazyModeRaw === "true";

      if (!clientItems?.length) throw httpError(400, "Select items!");
      if (!CHOICES.includes(choice)) throw httpError(400, "Invalid choice");

      const inventoryIds = clientItems.map(i => i.inventoryid);
      if (new Set(inventoryIds).size !== clientItems.length) {
        throw httpError(400, "One or more items can't be used!");
      }

      const user = await users.findOne({ userid: req.user.id }).session(session);
      if (!user) throw httpError(401, "Unauthorized");
      savedUser = user;

      const inventoryItems = await inventorys.find({
        _id: { $in: inventoryIds },
        owner: user.userid,
        locked: false
      }).session(session);

      if (inventoryItems.length !== clientItems.length) {
        throw httpError(400, "Invalid items detected");
      }

      const itemIds = inventoryItems.map(item => item.itemid);
      const dbItemsRaw = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).session(session);
      const seenIds = new Set();
      const dbItems = dbItemsRaw.filter(item => {
        const key = String(item.itemid);
        if (seenIds.has(key)) return false;
        seenIds.add(key);
        return true;
      });

      const validItems = dbItems.filter(item => item.itemvalue >= 1);
      if (validItems.length !== new Set(itemIds.map(String)).size) {
        throw httpError(400, "Invalid item values");
      }

      const gameType = validItems[0].game;
      if (!validItems.every(item => item.game === gameType)) {
        throw httpError(400, "You cannot cross-join!");
      }

      const itemMap = new Map(validItems.map(item => [String(item.itemid), item]));
      totalItemValue = inventoryItems.reduce((acc, item) =>
        acc + (itemMap.get(String(item.itemid))?.itemvalue || 0), 0);

      await inventorys.deleteMany({ _id: { $in: inventoryIds } }).session(session);

      const validatedItems = inventoryItems.map(item => ({
        id: item._id,
        itemname: itemMap.get(String(item.itemid))?.itemname,
        itemimage: itemMap.get(String(item.itemid))?.itemimage || " ",
        itemid: item.itemid,
        inventoryid: item._id,
        itemvalue: itemMap.get(String(item.itemid))?.itemvalue,
        game: itemMap.get(String(item.itemid))?.game
      }));

      const serverSeed = crypto.randomBytes(32).toString('hex');
      const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

      const savedMatch = await new rpsMatches({
        creatorid: user.userid,
        creatorchoice: choice,
        game: gameType,
        crazyMode,
        PlayerOne: {
          id: user.userid,
          username: user.username,
          thumbnail: user.thumbnail,
          choice,
          value: totalItemValue,
          items: validatedItems,
          chances: 1.0
        },
        PlayerTwo: null,
        requirements: {
          min: totalItemValue * 0.9,
          max: totalItemValue * 1.1,
          static: totalItemValue
        },
        winner: null,
        winnerchoice: null,
        active: true,
        start: new Date(),
        end: null,
        serverSeed,
        serverSeedHash,
        randomSeed: null
      }).save({ session });

      publicMatch = savedMatch.toObject();
      delete publicMatch.serverSeed;
    });

    res.status(200).json({
      message: "Match created!",
      data: publicMatch
    });

    try {
      req.app.get("io").emit("NEW_RPS", sanitizeActiveMatch(publicMatch));
      await Promise.all([
        addHistory(savedUser.userid, "Game Creation", `-${totalItemValue}`),
        updatestats(req.app.get("io")),
        updateuser(savedUser.userid, req.app.get("io")),
        sendwebhook(
          rpswebh,
          "✊ RPS Match Created",
          `**${savedUser.username}** created a R$${totalItemValue.toLocaleString()} rock paper scissors match.`,
          [
            { name: "Game", value: publicMatch.game || "N/A", inline: true },
            { name: "Choice", value: publicMatch.PlayerOne.choice, inline: true },
            { name: "Value", value: `R$${totalItemValue.toLocaleString()}`, inline: true },
          ],
          savedUser.thumbnail,
          null,
          WEBHOOK_COLORS.CREATE
        ),
      ]);
    } catch (sideEffectError) {
      console.error("rps create side-effects:", sideEffectError);
    }
    return;
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message?.includes("Write conflict")) {
      return res.status(400).json({ message: "One or more items can't be used!" });
    }
    console.error("Match creation error:", error);
    return res.status(500).json({ message: "Internal Server error" });
  } finally {
    releaseLock(req.user.id, "rps_create");
    session.endSession();
  }
});

exports.joinmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "rps_join")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let finalUpdate, taxedItems, allItems, totalJoinerValue, match, user, winnerItems, winner;

  try {
    await session.withTransaction(async () => {
      const { items: userItems, gameid, choice } = req.body;

      if (!userItems?.length || !Array.isArray(userItems) || !gameid) {
        throw httpError(400, "Invalid request parameters!");
      }
      if (!CHOICES.includes(choice)) {
        throw httpError(400, "Invalid choice");
      }

      const inventoryIds = userItems.map(item => item.inventoryid);
      if (new Set(inventoryIds).size !== userItems.length) {
        throw httpError(400, "One or more items can't be used!");
      }

      [match, user] = await Promise.all([
        rpsMatches.findOne({ _id: gameid }).session(session),
        users.findOne({ userid: req.user.id }).session(session)
      ]);

      if (!match || !user) {
        throw httpError(400, "Game or user not found!");
      }

      if (!match.active) {
        throw httpError(400, "Game not active!");
      }

      if (match.PlayerOne.id === user.userid) {
        throw httpError(400, "You cannot join your own game!");
      }

      const inventoryItems = await inventorys.find({
        _id: { $in: inventoryIds },
        owner: user.userid,
        locked: false
      }).session(session);

      if (inventoryItems.length !== userItems.length) {
        throw httpError(400, "One or more items can't be used!");
      }

      const itemIds = inventoryItems.map(item => item.itemid);
      const dbItems = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).session(session);
      const validItems = dbItems.filter(item => item.itemvalue > 0);

      if (validItems.length !== new Set(itemIds.map(String)).size) {
        throw httpError(400, "Invalid item values!");
      }

      const gameType = validItems[0]?.game;
      if (!validItems.every(item => item.game === gameType) || gameType !== match.game) {
        throw httpError(400, "You cannot cross join!");
      }

      const itemMap = new Map(validItems.map(item => [String(item.itemid), item]));
      totalJoinerValue = inventoryItems.reduce((acc, item) =>
        acc + (itemMap.get(String(item.itemid))?.itemvalue || 0), 0);

      if (totalJoinerValue < match.requirements.min || totalJoinerValue > match.requirements.max) {
        throw httpError(400, "The selected value doesn't match!");
      }

      let serverSeed = match.serverSeed;
      let serverSeedHash = match.serverSeedHash;
      if (!serverSeed || !serverSeedHash) {
        serverSeed = crypto.randomBytes(32).toString('hex');
        serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      }

      const randomSeed = crypto.randomBytes(16).toString('hex');
      const now = new Date();

      const updateResult = await rpsMatches.updateOne(
        { _id: gameid, active: true },
        {
          $set: {
            active: false,
            end: now,
            serverSeed,
            serverSeedHash,
            randomSeed,
            "requirements.static": match.requirements.static + totalJoinerValue,
            PlayerTwo: {
              id: user.userid,
              username: user.username,
              thumbnail: user.thumbnail,
              choice,
              value: totalJoinerValue,
              items: inventoryItems.map(item => ({
                id: item._id,
                itemname: itemMap.get(String(item.itemid))?.itemname,
                itemvalue: itemMap.get(String(item.itemid))?.itemvalue,
                itemid: item.itemid,
                inventoryid: item._id,
                itemimage: itemMap.get(String(item.itemid))?.itemimage || "null"
              }))
            }
          }
        },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw httpError(400, "Game was just taken, try again!");
      }

      await inventorys.deleteMany({ _id: { $in: inventoryIds } }).session(session);

      const matchResult = getResult(serverSeed, randomSeed);
      const { winner: winningPlayer, chances } = getWinner(
        matchResult,
        match.PlayerOne.items.reduce((acc, item) => acc + item.itemvalue, 0),
        totalJoinerValue
      );

      winner = winningPlayer;
      // Crazy Mode flips the outcome: the side that would normally lose wins the pot instead.
      if (match.crazyMode) winner = winner === "PlayerOne" ? "PlayerTwo" : "PlayerOne";
      allItems = [...match.PlayerOne.items, ...inventoryItems.map(item => ({
        ...item.toObject(),
        itemname: itemMap.get(String(item.itemid))?.itemname,
        itemvalue: itemMap.get(String(item.itemid))?.itemvalue
      }))];

      // RPS is not taxed — all items go to the winner.
      const sortedItems = allItems.sort((a, b) => a.itemvalue - b.itemvalue);
      taxedItems = [];
      winnerItems = sortedItems;

      await Promise.all([
        users.findOneAndUpdate(
          { userid: winner === "PlayerOne" ? match.PlayerOne.id : user.userid },
          [
            {
              $set: {
                won: { $add: ["$won", totalJoinerValue] },
                wager: { $add: ["$wager", totalJoinerValue] },
              }
            }
          ],
          { session, new: true }
        ),
        users.findOneAndUpdate(
          { userid: winner === "PlayerOne" ? user.userid : match.PlayerOne.id },
          [
            {
              $set: {
                lost: { $add: ["$lost", totalJoinerValue] },
                wager: { $add: ["$wager", totalJoinerValue] },
              }
            }
          ],
          { session, new: true }
        )
      ]);

      finalUpdate = await rpsMatches.findOneAndUpdate(
        { _id: gameid },
        {
          $set: {
            winner: winner === "PlayerOne" ? match.PlayerOne.id : user.userid,
            winnerchoice: winner === "PlayerOne" ? match.PlayerOne.choice : choice,
            "PlayerOne.chances": chances.starter,
            "PlayerTwo.chances": chances.joiner
          }
        },
        { session, new: true }
      );
    });

    res.status(200).json({ message: "Successfully joined match!", data: finalUpdate });

    try {
      req.app.get("io").emit("RPS_UPDATE", finalUpdate);

      try {
        const winnerName = finalUpdate.winner === match.PlayerOne.id ? match.PlayerOne.username : user.username;
        req.app.get("io").emit("LIVE_WIN", { user: winnerName, game: "RPS", amount: match.requirements.static + totalJoinerValue });
      } catch {}

      await emituser("NOTIFICATION", {
        type: "info",
        title: "Someone joined your RPS match!",
        message: `${user.username} joined your R$${match.requirements.static} rock paper scissors match. ${winner === "PlayerOne" ? "You won! 🎉" : "They won 😭"}`,
        target: match.PlayerOne.id,
      }, match.PlayerOne.id, req.app.get("io"));

      await Promise.all([
        addHistory(finalUpdate.winner, "Game Win", `+${totalJoinerValue}`),
        addHistory(user.userid, "Game Loss", `-${totalJoinerValue}`),
        level(finalUpdate.winner, match.PlayerOne.value),
        level(user.userid, totalJoinerValue),
        updateuser(user.userid, req.app.get("io")),
        updatestats(req.app.get("io")),
        sendwebhook(
          rpswebh,
          "🏁 RPS Match Finished",
          `**${finalUpdate.winner === match.PlayerOne.id ? match.PlayerOne.username : user.username}** won a R$${(match.requirements.static + totalJoinerValue).toLocaleString()} rock paper scissors match!`,
          [
            { name: "Player 1", value: match.PlayerOne.username, inline: true },
            { name: "Player 2", value: user.username, inline: true },
            { name: "Winning Choice", value: finalUpdate.winnerchoice, inline: true },
          ],
          null,
          null,
          WEBHOOK_COLORS.WIN
        ),
      ]);
      checkAndTriggerDrop(req.app.get("io")).catch((e) => console.error("rps drop check:", e));

      // Pay winner with automatic retry — up to 5 attempts with exponential back-off
      await retryPayout(
        winnerItems.map(item => ({
          _id: item._id,
          owner: winner === "PlayerOne" ? match.PlayerOne.id : user.userid,
          itemid: item.itemid,
          locked: false,
        })),
        "RPS"
      );
      await updateuser(finalUpdate.winner, req.app.get("io"));
      await updateuser(user.userid, req.app.get("io"));

      setTimeout(() => {
        req.app.get("io").emit("RPS_CANCEL", {
          _id: finalUpdate._id,
          active: false
        });
        updatestats(req.app.get("io"));
      }, 60000);
    } catch (sideEffectError) {
      console.error("rps join side-effects:", sideEffectError);
    }

  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message?.includes("Write conflict")) {
      return res.status(400).json({ message: 'One or more items cant be used!' });
    } else {
      console.error("rps join:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } finally {
    releaseLock(req.user.id, "rps_join");
    session.endSession().catch(() => {});
  }
});

exports.cancelmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "rps_cancel")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const session = await mongoose.startSession();

  let match, user, updatedMatch;

  try {
    await session.withTransaction(async () => {
      if (!req.user?.id) {
        throw httpError(401, "Unauthorized");
      }

      if (!req.body.matchid) {
        throw httpError(400, "Match ID required!");
      }

      [user, match] = await Promise.all([
        users.findOne({ userid: req.user.id }).session(session),
        rpsMatches.findOne({ _id: req.body.matchid }).session(session)
      ]);

      if (!user) {
        throw httpError(401, "User not found!");
      }

      if (!match) {
        throw httpError(404, "Match not found!");
      }

      if (!match.active) {
        throw httpError(400, "Match already completed!");
      }

      if (match.creatorid !== user.userid) {
        throw httpError(403, "Not your match!");
      }

      const updateResult = await rpsMatches.updateOne(
        {
          _id: match._id,
          active: true,
          creatorid: user.userid
        },
        { $set: { active: false } },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw httpError(409, "Match being joined!");
      }

      const itemsToRestore = match.PlayerOne.items.map(item => ({
        _id: item.id,
        owner: user.userid,
        itemid: item.itemid,
        locked: false,
        createdAt: new Date()
      }));

      await inventorys.insertMany(itemsToRestore, {
        session,
        ordered: false
      }).catch(async error => {
        if (error.code !== 11000) throw error;
      });

      updatedMatch = await rpsMatches.findById(match._id).session(session);
    });

    req.app.get("io").emit("RPS_CANCEL", {
      _id: match._id,
      active: false,
      updatedAt: new Date()
    });

    await Promise.all([
      updatestats(req.app.get("io")),
      addHistory(user.userid, "Game Cancel", `+${match.requirements.static}`),
      updateuser(user.userid, req.app.get("io"))
    ]);

    return res.status(200).json({
      success: true,
      message: "Match canceled!",
      data: updatedMatch
    });
  } catch (error) {
    console.error("CancelRps Error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message?.includes("WriteConflict")) {
      return res.status(409).json({ message: "Match being joined!" });
    } else {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } finally {
    releaseLock(req.user.id, "rps_cancel");
    session.endSession();
  }
});

exports.historyme = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const matches = await rpsMatches.find({
      $and: [
        { $or: [
          { 'PlayerOne.id': req.user.id, "active": false },
          { 'PlayerTwo.id': req.user.id, "active": false }
        ]},
        { 'PlayerTwo.id': { $exists: true } }
      ]
    })
      .sort({ end: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({ message: "OK", history: matches });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
