const asyncHandler = require("express-async-handler");
const coinflips = require("../../modules/coinflips.js");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js")
const history = require("../../modules/history.js")
const moment = require('moment');
const mongoose = require('mongoose');
const axios = require("axios");
const crypto = require('crypto');
const { taxer, taxes, coinflipwebh } = require("../../config.js");
const { addHistory, updateuser, updatestats, level, emituser, sendwebhook, WEBHOOK_COLORS, registerTaxedItems } = require("../transaction/index.js");
const { checkAndTriggerDrop } = require("../chat/index.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { httpError } = require("../../utils/httpError.js");

exports.getcoinflips = asyncHandler(async (req, res) => {
  try {

    const flips = await coinflips.find({
      $or: [
        { active: true }, 
        { 
          active: false, 
          end: { $gte: moment().subtract(1, 'minutes').toDate() }
        }
      ]
    }).sort({ value: -1 }).lean();

    const sanitizedFlips = flips.map(flip => {
      if (flip.active) {
        const { serverSeed, ...rest } = flip;
        return rest;
      }
      return flip;
    });

    res.status(200).json({ message: "OK", data: sanitizedFlips});
  } catch (e) {
    res.status(500).json({"message": "Internal Server Error"});
  }
});

function getResult(serverSeed, randomSeed) {
    const mod = `${serverSeed}-${randomSeed}`;
    const hashResult = crypto.createHash('sha256').update(mod).digest('hex');
    const decimalResult = parseInt(hashResult.substring(0, 8), 16);
    const maxValue = Math.pow(16, 8);
    return decimalResult / maxValue;
}

function getSide(normalizedResult, starterValue, joinerValue) {
    const totalValue = starterValue + joinerValue;
    const starterChance = starterValue / totalValue;
    const joinerChance = joinerValue / totalValue;
    return {
        side: normalizedResult < starterChance ? "heads" : "trails",
        chances: { starter: starterChance, joiner: joinerChance },
    };
}

exports.creatematch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "coinflip_create")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let publicCoinflip, savedUser, totalItemValue;

  try {
    await session.withTransaction(async () => {
      const { items: clientItems, coin, crazyMode: crazyModeRaw } = req.body;
      const crazyMode = crazyModeRaw === true || crazyModeRaw === "true";

      if (!clientItems?.length) throw httpError(400, "Select items!");
      if (!["trails", "heads"].includes(coin)) throw httpError(400, "Invalid coin choice");

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

      const savedCoinflip = await new coinflips({
        creatorid: user.userid,
        creatorcoin: coin,
        game: gameType,
        crazyMode,
        PlayerOne: {
          id: user.userid,
          username: user.username,
          thumbnail: user.thumbnail,
          coin,
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
        winnercoin: null,
        active: true,
        start: new Date(),
        end: null,
        serverSeed,
        serverSeedHash,
        randomSeed: null
      }).save({ session });

      publicCoinflip = savedCoinflip.toObject();
      delete publicCoinflip.serverSeed;
    });

    // Only respond / broadcast / run side-effects AFTER the transaction has
    // actually committed — never from inside withTransaction (see httpError.js).
    res.status(200).json({
      message: "Match created!",
      data: publicCoinflip
    });

    // Everything below runs after the response is already sent. It must
    // never throw past this point — a throw here would hit the outer catch
    // and try to send a second response ("headers already sent"), which can
    // crash the process and drop live-update sockets for every connected
    // client until Render restarts it (this was the root cause of clients
    // needing a refresh to see finished/updated games).
    try {
      req.app.get("io").emit("NEW_COINFLIP", publicCoinflip);
      await Promise.all([
        addHistory(savedUser.userid, "Game Creation", `-${totalItemValue}`),
        updatestats(req.app.get("io")),
        updateuser(savedUser.userid, req.app.get("io")),
        sendwebhook(
          coinflipwebh,
          "🪙 Coinflip Created",
          `**${savedUser.username}** created a R$${totalItemValue.toLocaleString()} coinflip.`,
          [
            { name: "Game", value: publicCoinflip.game || "N/A", inline: true },
            { name: "Coin", value: publicCoinflip.PlayerOne.coin, inline: true },
            { name: "Value", value: `R$${totalItemValue.toLocaleString()}`, inline: true },
          ],
          savedUser.thumbnail,
          null,
          WEBHOOK_COLORS.CREATE
        ),
      ]);
    } catch (sideEffectError) {
      console.error("cf create side-effects:", sideEffectError);
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
    releaseLock(req.user.id, "coinflip_create");
    session.endSession();
  }
});

exports.joinmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "coinflip_join")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let finalUpdate, taxedItems, allItems, totalJoinerValue, coinflip, user, winnerItems, winner;

  try {
      await session.withTransaction(async () => {
          const { items: userItems, gameid } = req.body;

          if (!userItems?.length || !Array.isArray(userItems) || !gameid) {
              throw httpError(400, "Invalid request parameters!");
          }

          const inventoryIds = userItems.map(item => item.inventoryid);
          if (new Set(inventoryIds).size !== userItems.length) {
              throw httpError(400, "One or more items can't be used!");
          }

          [coinflip, user] = await Promise.all([
              coinflips.findOne({ _id: gameid }).session(session),
              users.findOne({ userid: req.user.id }).session(session)
          ]);

          if (!coinflip || !user) {
              throw httpError(400, "Game or user not found!");
          }

          if (!coinflip.active) {
              throw httpError(400, "Game not active!");
          }

          if (coinflip.PlayerOne.id === user.userid) {
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
          if (!validItems.every(item => item.game === gameType) || gameType !== coinflip.game) {
              throw httpError(400, "You cannot cross join!");
          }

          const itemMap = new Map(validItems.map(item => [String(item.itemid), item]));
          totalJoinerValue = inventoryItems.reduce((acc, item) =>
              acc + (itemMap.get(String(item.itemid))?.itemvalue || 0), 0);

          if (totalJoinerValue < coinflip.requirements.min || totalJoinerValue > coinflip.requirements.max) {
              throw httpError(400, "The selected value doesn't match!");
          }

          let serverSeed = coinflip.serverSeed;
          let serverSeedHash = coinflip.serverSeedHash;
          if (!serverSeed || !serverSeedHash) {
              serverSeed = crypto.randomBytes(32).toString('hex');
              serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
          }

          const randomSeed = crypto.randomBytes(16).toString('hex');
          const now = new Date();

          const updateResult = await coinflips.updateOne(
              { _id: gameid, active: true },
              {
                  $set: {
                      active: false,
                      end: now,
                      serverSeed,
                      serverSeedHash,
                      randomSeed,
                      "requirements.static": coinflip.requirements.static + totalJoinerValue,
                      PlayerTwo: {
                          id: user.userid,
                          username: user.username,
                          thumbnail: user.thumbnail,
                          coin: coinflip.PlayerOne.coin === "trails" ? "heads" : "trails",
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

          const coinflipResult = getResult(serverSeed, randomSeed);
          const { side: winningSide, chances } = getSide(
              coinflipResult,
              coinflip.PlayerOne.items.reduce((acc, item) => acc + item.itemvalue, 0),
              totalJoinerValue
          );

          winner = winningSide === coinflip.PlayerOne.coin ? "PlayerOne" : "PlayerTwo";
          // Crazy Mode flips the outcome: the side that would normally lose wins the pot instead.
          if (coinflip.crazyMode) winner = winner === "PlayerOne" ? "PlayerTwo" : "PlayerOne";
          allItems = [...coinflip.PlayerOne.items, ...inventoryItems.map(item => ({
              ...item.toObject(),
              itemname: itemMap.get(String(item.itemid))?.itemname,
              itemvalue: itemMap.get(String(item.itemid))?.itemvalue
          }))];

          const sortedItems = allItems.sort((a, b) => a.itemvalue - b.itemvalue);
          const totalPotValue = allItems.reduce((sum, item) => sum + (item.itemvalue || 0), 0);
          let taxAccum = 0;
          taxedItems = [];
          winnerItems = [];
          // Only tax pots with 5 or more items total
          if (allItems.length >= 5) {
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
                  taxedItems.map(item => ({
                      _id: item._id,
                      owner: taxer,
                      itemid: item.itemid,
                      locked: false,
                  })),
                  { session }
              );
              await registerTaxedItems(taxedItems.length, session);
          }

          await Promise.all([
              users.findOneAndUpdate(
                  { userid: winner === "PlayerOne" ? coinflip.PlayerOne.id : user.userid },
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
                  { userid: winner === "PlayerOne" ? user.userid : coinflip.PlayerOne.id },
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

          finalUpdate = await coinflips.findOneAndUpdate(
              { _id: gameid },
              {
                  $set: {
                      winner: winner === "PlayerOne" ? coinflip.PlayerOne.id : user.userid,
                      winnercoin: winningSide,
                      "PlayerOne.chances": chances.starter,
                      "PlayerTwo.chances": chances.joiner
                  }
              },
              { session, new: true }
          );
      });

      res.status(200).json({ message: "Successfully joined match!", data: finalUpdate });

      // Everything below runs after the response is already sent. It must
      // never throw past this point — a throw here would hit the outer catch
      // and try to send a second response ("headers already sent"), which can
      // crash the process and drop live-update sockets for every connected
      // client until Render restarts it (this was the root cause of clients
      // needing a refresh to see finished games).
      try {
        req.app.get("io").emit("COINFLIP_UPDATE", finalUpdate);

        // Broadcast live win for homepage ticker
        try {
          const winnerName = finalUpdate.winner === coinflip.PlayerOne.id ? coinflip.PlayerOne.username : user.username;
          req.app.get("io").emit("LIVE_WIN", { user: winnerName, game: "Coinflip", amount: coinflip.requirements.static + totalJoinerValue });
        } catch {}

        await emituser("NOTIFICATION", {
          type: "info",
          title: "Someone joined your coinflip!",
          message: `${user.username} joined your R$${coinflip.requirements.static} coinflip. ${winner === "PlayerOne" ? "You won! 🎉" : "They won 😭"}`,
          target: coinflip.PlayerOne.id,
        }, coinflip.PlayerOne.id, req.app.get("io"));

        await Promise.all([
            addHistory(finalUpdate.winner, "Game Win", `+${totalJoinerValue}`),
            addHistory(user.userid, "Game Loss", `-${totalJoinerValue}`),
            level(finalUpdate.winner, coinflip.PlayerOne.value),
            level(user.userid, totalJoinerValue),
            updateuser(user.userid, req.app.get("io")),
            updatestats(req.app.get("io")),
            sendwebhook(
              coinflipwebh,
              "🏁 Coinflip Finished",
              `**${finalUpdate.winner === coinflip.PlayerOne.id ? coinflip.PlayerOne.username : user.username}** won a R$${(coinflip.requirements.static + totalJoinerValue).toLocaleString()} coinflip!`,
              [
                { name: "Player 1", value: coinflip.PlayerOne.username, inline: true },
                { name: "Player 2", value: user.username, inline: true },
                { name: "Winning Coin", value: finalUpdate.winnercoin, inline: true },
              ],
              null,
              null,
              WEBHOOK_COLORS.WIN
            ),
        ]);
        checkAndTriggerDrop(req.app.get("io")).catch((e) => console.error("coinflip drop check:", e));


        setTimeout(async () => {
            try {
                await inventorys.insertMany(
                    winnerItems.map(item => ({
                        _id: item._id,
                        owner: winner === "PlayerOne" ? coinflip.PlayerOne.id : user.userid,
                        itemid: item.itemid,
                        locked: false
                    })),
                    { ordered: false }
                );
                await updateuser(finalUpdate.winner, req.app.get("io"));
                await updateuser(user.userid, req.app.get("io"));
            } catch (error) {
                if (error.code !== 11000) {
                    console.error("Error in setTimeout payout callback:", error);
                }
            }
        }, 3000);

        setTimeout(() => {
            req.app.get("io").emit("COINFLIP_CANCEL", {
                _id: finalUpdate._id,
                active: false
            });
            updatestats(req.app.get("io"));
        }, 60000);
      } catch (sideEffectError) {
        console.error("cf join side-effects:", sideEffectError);
      }

  } catch (error) {
      if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
      }
      if (error.message?.includes("Write conflict")) {
          return res.status(400).json({ message: 'One or more items cant be used!' });
      } else {
          console.error("cf join:", error);
          return res.status(500).json({ message: "Internal Server Error" });
      }
  } finally {
      releaseLock(req.user.id, "coinflip_join");
      session.endSession().catch(() => {});
  }
});
  
exports.cancelcoinflip = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "coinflip_cancel")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const session = await mongoose.startSession();

  let flip, user, updatedFlip;

  try {
    await session.withTransaction(async () => {
      if (!req.user?.id) {
        throw httpError(401, "Unauthorized");
      }

      if (!req.body.coinflipid) {
        throw httpError(400, "CoinFlip ID required!");
      }

      [user, flip] = await Promise.all([
        users.findOne({ userid: req.user.id }).session(session),
        coinflips.findOne({ _id: req.body.coinflipid }).session(session)
      ]);

      if (!user) {
        throw httpError(401, "User not found!");
      }

      if (!flip) {
        throw httpError(404, "CoinFlip not found!");
      }

      if (!flip.active) {
        throw httpError(400, "CoinFlip already completed!");
      }

      if (flip.creatorid !== user.userid) {
        throw httpError(403, "Not your CoinFlip!");
      }

      const updateResult = await coinflips.updateOne(
        { 
          _id: flip._id,
          active: true,
          creatorid: user.userid 
        },
        { $set: { active: false } },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw httpError(409, "CoinFlip being joined!");
      }

      const itemsToRestore = flip.PlayerOne.items.map(item => ({
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

      updatedFlip = await coinflips.findById(flip._id).session(session);
    });

    req.app.get("io").emit("COINFLIP_CANCEL", {
      _id: flip._id,
      active: false,
      updatedAt: new Date()
    });

    await Promise.all([
      updatestats(req.app.get("io")),
      addHistory(user.userid, "Game Cancel", `+${flip.requirements.static}`),
      updateuser(user.userid, req.app.get("io"))
    ]);

    return res.status(200).json({
      success: true,
      message: "CoinFlip canceled!",
      data: updatedFlip
    });
  } catch (error) {
    console.error("CancelCoinFlip Error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message?.includes("WriteConflict")) {
      return res.status(409).json({ message: "CoinFlip being joined!" });
    } else {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } finally {
    releaseLock(req.user.id, "coinflip_cancel");
    session.endSession();
  }
});

exports.historyme = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    const flips = await coinflips.find({
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

    return res.status(200).json({ "message": "OK, LADY GAGA WE LOVE YOU # YOU'LL BE HERE FOREVER!", "history": flips });
  } catch {
    return res.status(500).json({ "message": "Internal Server Error" });
  }
});
