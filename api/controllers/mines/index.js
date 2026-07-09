const asyncHandler = require("express-async-handler");
const mines = require("../../modules/mines.js");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const moment = require("moment");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { taxer, taxes, mineswebh } = require("../../config.js");
const { addHistory, updateuser, updatestats, level, emituser, sendwebhook, WEBHOOK_COLORS } = require("../transaction/index.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { httpError } = require("../../utils/httpError.js");

/** Generate mine positions from seeds — provably fair */
function generateGrid(serverSeed, randomSeed, minesCount, gridSize = 25) {
  const combined = `${serverSeed}-${randomSeed}-mines`;
  const positions = [];
  let attempt = 0;
  while (positions.length < minesCount) {
    const h = crypto.createHash("sha256").update(`${combined}-${attempt}`).digest("hex");
    for (let i = 0; i < 32 && positions.length < minesCount; i++) {
      const val = parseInt(h.substring(i * 2, i * 2 + 2), 16);
      const pos = val % gridSize;
      if (!positions.includes(pos)) positions.push(pos);
    }
    attempt++;
  }
  return positions;
}

function sanitizeGame(doc) {
  const g = doc.toObject ? doc.toObject() : { ...doc };
  // Hide bomb positions while game is active/playing
  if (g.state !== "finished") delete g.grid;
  delete g.serverSeed;
  return g;
}

exports.getgames = asyncHandler(async (req, res) => {
  try {
    const games = await mines.find({
      $or: [
        { active: true },
        { active: false, end: { $gte: moment().subtract(1, "minutes").toDate() } },
      ],
    }).sort({ "requirements.static": -1 }).lean();

    const sanitized = games.map(({ serverSeed, grid, ...rest }) =>
      rest.state === "finished" ? { serverSeed, grid, ...rest } : rest
    );
    res.status(200).json({ message: "OK", data: sanitized });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

exports.creatematch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "mines_create")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const session = await mongoose.startSession();
  let publicGame, savedUser, totalItemValue;

  try {
    await session.withTransaction(async () => {
      const { items: clientItems, minesCount: mc } = req.body;
      const minesCount = Math.min(Math.max(parseInt(mc) || 5, 1), 20);

      if (!clientItems?.length) throw httpError(400, "Select items!");
      const inventoryIds = clientItems.map((i) => i.inventoryid);
      if (new Set(inventoryIds).size !== clientItems.length)
        throw httpError(400, "One or more items can't be used!");

      const user = await users.findOne({ userid: Number(req.user.id) }).session(session);
      if (!user) throw httpError(401, "Unauthorized");
      savedUser = user;

      const inventoryItems = await inventorys
        .find({
          _id: { $in: inventoryIds },
          $or: [{ owner: user.userid }, { owner: String(user.userid) }],
          locked: { $ne: true }, // accept false, null, or missing — only block explicitly locked items
        })
        .session(session);
      if (inventoryItems.length !== clientItems.length)
        throw httpError(400, "Invalid items detected");

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
      if (validItems.length !== new Set(itemIds.map(String)).size)
        throw httpError(400, "Invalid item values");

      const gameType = validItems[0].game;
      if (!validItems.every((item) => item.game === gameType))
        throw httpError(400, "You cannot cross-join!");

      const itemMap = new Map(validItems.map((item) => [String(item.itemid), item]));
      totalItemValue = inventoryItems.reduce(
        (acc, item) => acc + (itemMap.get(String(item.itemid))?.itemvalue || 0), 0
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

      const savedGame = await new mines({
        creatorid: user.userid,
        game: gameType,
        minesCount,
        grid: [],
        revealed: [],
        PlayerOne: {
          id: user.userid, username: user.username, thumbnail: user.thumbnail,
          value: totalItemValue, items: validatedItems,
        },
        PlayerTwo: null,
        requirements: {
          min: totalItemValue * 0.9,
          max: totalItemValue * 1.1,
          static: totalItemValue,
        },
        winner: null,
        active: true,
        state: "waiting",
        start: new Date(),
        serverSeed,
        serverSeedHash,
        randomSeed: null,
      }).save({ session });

      publicGame = sanitizeGame(savedGame);
    });

    res.status(200).json({ message: "Match created!", data: publicGame });

    try {
      req.app.get("io").emit("NEW_MINES", publicGame);
      await Promise.all([
        addHistory(savedUser.userid, "Mines Creation", `-${totalItemValue}`),
        updatestats(req.app.get("io")),
        updateuser(savedUser.userid, req.app.get("io")),
      ]);
    } catch (e) { console.error("mines create side-effects:", e); }
    return;
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (error.message?.includes("Write conflict"))
      return res.status(400).json({ message: "One or more items can't be used!" });
    console.error("Mines creation error:", error);
    return res.status(500).json({ message: "Internal Server error" });
  } finally {
    releaseLock(req.user.id, "mines_create");
    session.endSession();
  }
});

exports.joinmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "mines_join")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const session = await mongoose.startSession();
  let finalUpdate, game, user, totalJoinerValue;

  try {
    await session.withTransaction(async () => {
      const { items: userItems, gameid } = req.body;
      if (!userItems?.length || !Array.isArray(userItems) || !gameid)
        throw httpError(400, "Invalid request parameters!");

      const inventoryIds = userItems.map((item) => item.inventoryid);
      if (new Set(inventoryIds).size !== userItems.length)
        throw httpError(400, "One or more items can't be used!");

      [game, user] = await Promise.all([
        mines.findOne({ _id: gameid }).session(session),
        users.findOne({ userid: Number(req.user.id) }).session(session),
      ]);

      if (!game || !user) throw httpError(400, "Game or user not found!");
      if (!game.active || game.state !== "waiting") throw httpError(400, "Game not active!");
      if (game.PlayerOne.id === user.userid)
        throw httpError(400, "You cannot join your own game!");

      const inventoryItems = await inventorys
        .find({
          _id: { $in: inventoryIds },
          $or: [{ owner: user.userid }, { owner: String(user.userid) }],
          locked: { $ne: true }, // accept false, null, or missing — only block explicitly locked items
        })
        .session(session);
      if (inventoryItems.length !== userItems.length)
        throw httpError(400, "One or more items can't be used!");

      const itemIds = inventoryItems.map((item) => item.itemid);
      const dbItems = await items
        .find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } })
        .session(session);
      const validItems = dbItems.filter((item) => item.itemvalue > 0);
      if (validItems.length !== new Set(itemIds.map(String)).size)
        throw httpError(400, "Invalid item values!");

      const gameType = validItems[0]?.game;
      if (!validItems.every((item) => item.game === gameType) || gameType !== game.game)
        throw httpError(400, "You cannot cross join!");

      const itemMap = new Map(validItems.map((item) => [String(item.itemid), item]));
      totalJoinerValue = inventoryItems.reduce(
        (acc, item) => acc + (itemMap.get(String(item.itemid))?.itemvalue || 0), 0
      );

      if (totalJoinerValue < game.requirements.min || totalJoinerValue > game.requirements.max)
        throw httpError(400, "The selected value doesn't match!");

      const serverSeed = game.serverSeed || crypto.randomBytes(32).toString("hex");
      const randomSeed = crypto.randomBytes(16).toString("hex");

      // Generate the grid now (but hidden from players until game ends)
      const grid = generateGrid(serverSeed, randomSeed, game.minesCount);

      const updateResult = await mines.updateOne(
        { _id: gameid, active: true, state: "waiting" },
        {
          $set: {
            state: "playing",
            randomSeed,
            grid,
            "requirements.static": game.requirements.static + totalJoinerValue,
            PlayerTwo: {
              id: user.userid,
              username: user.username,
              thumbnail: user.thumbnail,
              value: totalJoinerValue,
              cashedOut: false,
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

      if (updateResult.modifiedCount === 0)
        throw httpError(400, "Game is being joined, try again!");

      await inventorys.deleteMany({ _id: { $in: inventoryIds } }).session(session);

      finalUpdate = sanitizeGame(await mines.findOne({ _id: gameid }).session(session));
    });

    res.status(200).json({ message: "Successfully joined!", data: finalUpdate });

    try {
      req.app.get("io").emit("MINES_UPDATE", finalUpdate);
      await Promise.all([
        updatestats(req.app.get("io")),
        emituser("NOTIFICATION", {
          type: "info",
          title: "Someone joined your mines game!",
          message: `${user.username} joined your R$${game.requirements.static} mines game. Good luck!`,
          target: game.PlayerOne.id,
        }, game.PlayerOne.id, req.app.get("io")),
      ]);
    } catch (e) { console.error("mines join side-effects:", e); }
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (error.message?.includes("Write conflict"))
      return res.status(400).json({ message: "One or more items can't be used!" });
    console.error("mines join:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "mines_join");
    session.endSession();
  }
});

/** Reveal a tile — called by the joiner (PlayerTwo) */
exports.revealtile = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "mines_reveal")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const session = await mongoose.startSession();

  try {
    let finalUpdate;
    let isBomb = false;
    let resolvedGame = null;
    let payout = null;

    await session.withTransaction(async () => {
      const { gameid } = req.body;
      const tileIndex = Number(req.body.tileIndex);
      if (!gameid || req.body.tileIndex === undefined || !Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= GRID_SIZE)
        throw httpError(400, `gameid and tileIndex (0–${GRID_SIZE - 1}) are required!`);

      const game = await mines.findOne({ _id: gameid }).session(session);
      if (!game) throw httpError(404, "Game not found!");
      if (game.state !== "playing") throw httpError(400, "Game not in playing state!");
      if (game.PlayerTwo?.id !== Number(req.user.id))
        throw httpError(403, "Only the joiner can reveal tiles!");
      if (game.revealed.includes(tileIndex))
        throw httpError(400, "Tile already revealed!");

      const newRevealed = [...game.revealed, tileIndex];
      isBomb = game.grid.includes(tileIndex);

      const safeCount = 25 - game.minesCount;
      const revealedSafe = newRevealed.filter((i) => !game.grid.includes(i)).length;
      const allSafeRevealed = revealedSafe >= safeCount;

      let updates = { $push: { revealed: tileIndex } };

      if (isBomb || allSafeRevealed) {
        // Game over
        const winnerId = isBomb ? game.PlayerOne.id : game.PlayerTwo.id;
        const loserId = isBomb ? game.PlayerTwo.id : game.PlayerOne.id;
        const loserValue = isBomb ? game.PlayerTwo.value : game.PlayerOne.value;

        const allItems = [...game.PlayerOne.items, ...game.PlayerTwo.items];
        const sortedItems = [...allItems].sort((a, b) => a.itemvalue - b.itemvalue);
        const taxedCount = Math.floor(sortedItems.length * taxes);
        const taxedItems = sortedItems.slice(0, taxedCount);
        const winnerItems = sortedItems.slice(taxedCount);

        await inventorys.insertMany(
          taxedItems.map((item) => ({
            _id: item.id || item._id,
            owner: taxer,
            itemid: item.itemid,
            locked: false,
          })),
          { session }
        );

        await Promise.all([
          users.findOneAndUpdate(
            { userid: winnerId },
            [{ $set: { won: { $add: ["$won", loserValue] }, wager: { $add: ["$wager", loserValue] } } }],
            { session }
          ),
          users.findOneAndUpdate(
            { userid: loserId },
            [{ $set: { lost: { $add: ["$lost", loserValue] }, wager: { $add: ["$wager", loserValue] } } }],
            { session }
          ),
        ]);

        updates = {
          $push: { revealed: tileIndex },
          $set: { state: "finished", active: false, end: new Date(), winner: winnerId },
        };

        payout = { winnerId, loserId, loserValue, winnerItems };
      }

      await mines.updateOne({ _id: gameid }, updates, { session });
      resolvedGame = await mines.findOne({ _id: gameid }).session(session);
      finalUpdate = resolvedGame.toObject();
      if (finalUpdate.state !== "finished") delete finalUpdate.grid;
      delete finalUpdate.serverSeed;
    });

    res.status(200).json({ message: "OK", data: finalUpdate, isBomb });

    try {
      req.app.get("io").emit("MINES_UPDATE", finalUpdate);

      if (payout) {
        const { winnerId, loserId, loserValue, winnerItems } = payout;
        const winnerName = finalUpdate.PlayerOne.id === winnerId
          ? finalUpdate.PlayerOne.username : finalUpdate.PlayerTwo.username;

        req.app.get("io").emit("LIVE_WIN", {
          user: winnerName,
          game: "Mines",
          amount: finalUpdate.requirements.static,
        });

        setTimeout(async () => {
          try {
            if (winnerItems.length) {
              await inventorys.insertMany(
                winnerItems.map((item) => ({ _id: item.id || item._id, owner: winnerId, itemid: item.itemid, locked: false })),
                { ordered: false }
              );
            }
            await updateuser(winnerId, req.app.get("io"));
            await updateuser(loserId, req.app.get("io"));
          } catch (e) { if (e.code !== 11000) console.error("mines reveal payout:", e); }
        }, 2000);

        setTimeout(() => {
          req.app.get("io").emit("MINES_CANCEL", { _id: finalUpdate._id, active: false });
          updatestats(req.app.get("io"));
        }, 60000);

        await Promise.all([
          addHistory(winnerId, isBomb ? "Mines Win" : "Mines Win (Cleared)", `+${loserValue}`),
          addHistory(loserId, "Mines Loss", `-${loserValue}`),
          level(winnerId, loserValue),
          level(loserId, loserValue),
          updatestats(req.app.get("io")),
          sendwebhook(
            mineswebh,
            "💣 Mines Finished",
            `**${winnerName}** won a R$${loserValue.toLocaleString()} mines game!`,
            [
              { name: "Result", value: isBomb ? "💥 Hit a mine" : "✅ Cleared the board", inline: true },
              { name: "Tiles Revealed", value: `${finalUpdate.revealed.length}`, inline: true },
              { name: "Value", value: `R$${loserValue.toLocaleString()}`, inline: true },
            ],
            null,
            null,
            WEBHOOK_COLORS.WIN
          ).catch((e) => console.error("mines reveal webhook:", e)),
        ]);
      }
    } catch (e) { console.error("mines reveal side-effects:", e); }
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("mines reveal:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "mines_reveal");
    session.endSession();
  }
});

/** Cash out — joiner wins the full pot (minus tax) by stopping early */
exports.cashout = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "mines_cashout")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const session = await mongoose.startSession();

  try {
    let finalUpdate, payout;

    await session.withTransaction(async () => {
      const { gameid } = req.body;
      if (!gameid) throw httpError(400, "gameid required!");

      const game = await mines.findOne({ _id: gameid }).session(session);
      if (!game) throw httpError(404, "Game not found!");
      if (game.state !== "playing") throw httpError(400, "Game not in playing state!");
      if (game.PlayerTwo?.id !== Number(req.user.id))
        throw httpError(403, "Only the joiner can cash out!");
      if (game.revealed.length === 0)
        throw httpError(400, "Reveal at least one tile before cashing out!");

      const winnerId = game.PlayerTwo.id;
      const loserId = game.PlayerOne.id;
      const loserValue = game.PlayerOne.value;

      const allItems = [...game.PlayerOne.items, ...game.PlayerTwo.items];
      const sortedItems = [...allItems].sort((a, b) => a.itemvalue - b.itemvalue);
      const taxedCount = Math.floor(sortedItems.length * taxes);
      const taxedItems = sortedItems.slice(0, taxedCount);
      const winnerItems = sortedItems.slice(taxedCount);

      await inventorys.insertMany(
        taxedItems.map((item) => ({
          _id: item.id || item._id,
          owner: taxer,
          itemid: item.itemid,
          locked: false,
        })),
        { session }
      );

      await Promise.all([
        users.findOneAndUpdate(
          { userid: winnerId },
          [{ $set: { won: { $add: ["$won", loserValue] }, wager: { $add: ["$wager", loserValue] } } }],
          { session }
        ),
        users.findOneAndUpdate(
          { userid: loserId },
          [{ $set: { lost: { $add: ["$lost", loserValue] }, wager: { $add: ["$wager", loserValue] } } }],
          { session }
        ),
      ]);

      await mines.updateOne(
        { _id: gameid },
        { $set: { state: "finished", active: false, end: new Date(), winner: winnerId, "PlayerTwo.cashedOut": true } },
        { session }
      );

      const updated = await mines.findOne({ _id: gameid }).session(session);
      finalUpdate = updated.toObject();
      delete finalUpdate.serverSeed;

      payout = { winnerId, loserId, loserValue, winnerItems };
    });

    res.status(200).json({ message: "Cashed out!", data: finalUpdate });

    try {
      const { winnerId, loserId, loserValue, winnerItems } = payout;
      req.app.get("io").emit("MINES_UPDATE", finalUpdate);
      req.app.get("io").emit("LIVE_WIN", {
        user: finalUpdate.PlayerTwo.username,
        game: "Mines",
        amount: finalUpdate.requirements.static,
      });

      setTimeout(async () => {
        try {
          if (winnerItems.length) {
            await inventorys.insertMany(
              winnerItems.map((item) => ({ _id: item.id || item._id, owner: winnerId, itemid: item.itemid, locked: false })),
              { ordered: false }
            );
          }
          await updateuser(winnerId, req.app.get("io"));
          await updateuser(loserId, req.app.get("io"));
        } catch (e) { if (e.code !== 11000) console.error("mines cashout payout:", e); }
      }, 2000);

      setTimeout(() => {
        req.app.get("io").emit("MINES_CANCEL", { _id: finalUpdate._id, active: false });
        updatestats(req.app.get("io"));
      }, 60000);

      await Promise.all([
        addHistory(winnerId, "Mines Cash Out Win", `+${loserValue}`),
        addHistory(loserId, "Mines Loss", `-${loserValue}`),
        level(winnerId, loserValue),
        level(loserId, loserValue),
        updatestats(req.app.get("io")),
        sendwebhook(
          mineswebh,
          "💰 Mines Cash Out",
          `**${finalUpdate.PlayerTwo.username}** cashed out a R$${loserValue.toLocaleString()} mines game!`,
          [
            { name: "Tiles Revealed", value: `${finalUpdate.revealed.length}`, inline: true },
            { name: "Value", value: `R$${loserValue.toLocaleString()}`, inline: true },
          ],
          null,
          null,
          WEBHOOK_COLORS.WIN
        ).catch((e) => console.error("mines cashout webhook:", e)),
      ]);
    } catch (e) { console.error("mines cashout side-effects:", e); }
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("mines cashout:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "mines_cashout");
    session.endSession();
  }
});

exports.cancelmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "mines_cancel")) {
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
        mines.findOne({ _id: req.body.gameid }).session(session),
      ]);

      if (!user) throw httpError(401, "User not found!");
      if (!game) throw httpError(404, "Game not found!");
      if (game.state !== "waiting") throw httpError(400, "Cannot cancel a game in progress!");
      if (game.creatorid !== user.userid) throw httpError(403, "Not your game!");

      const updateResult = await mines.updateOne(
        { _id: game._id, active: true, state: "waiting", creatorid: user.userid },
        { $set: { active: false, state: "finished" } },
        { session }
      );

      if (updateResult.modifiedCount === 0)
        throw httpError(409, "Game is being joined!");

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

    req.app.get("io").emit("MINES_CANCEL", { _id: game._id, active: false });
    await Promise.all([
      updatestats(req.app.get("io")),
      addHistory(user.userid, "Mines Cancel", `+${game.requirements.static}`),
      updateuser(user.userid, req.app.get("io")),
    ]);

    return res.status(200).json({ success: true, message: "Game cancelled!" });
  } catch (error) {
    console.error("Cancel Mines Error:", error);
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "mines_cancel");
    session.endSession();
  }
});

exports.historyme = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  try {
    const games = await mines.find({
      $and: [
        { $or: [{ "PlayerOne.id": req.user.id, active: false }, { "PlayerTwo.id": req.user.id, active: false }] },
        { "PlayerTwo.id": { $exists: true } },
      ],
    }).sort({ end: -1 }).limit(10).lean();
    return res.status(200).json({ message: "OK", history: games });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
