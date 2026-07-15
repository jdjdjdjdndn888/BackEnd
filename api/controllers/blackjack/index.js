const asyncHandler = require("express-async-handler");
const blackjack = require("../../modules/blackjack.js");
const users = require("../../modules/users.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const moment = require("moment");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { taxer, taxes, blackjackwebh } = require("../../config.js");
const { addHistory, updateuser, updatestats, level, emituser, sendwebhook, WEBHOOK_COLORS, registerTaxedItems } = require("../transaction/index.js");
const { checkAndTriggerDrop } = require("../chat/index.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { httpError } = require("../../utils/httpError.js");

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function rankValue(rank) {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank, 10);
}

/** Build & shuffle a fresh 52-card deck deterministically from seeds (provably fair, same pattern as dice's getDiceRolls) */
function buildShuffledDeck(serverSeed, randomSeed) {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, value: rankValue(rank) });
    }
  }

  // Fisher-Yates shuffle driven by a hash-derived byte stream so the result
  // is reproducible/verifiable from the two seeds, same fairness model used
  // for dice/coinflip.
  const combined = `${serverSeed}-${randomSeed}`;
  let counter = 0;
  const nextByte = () => {
    const h = crypto.createHash("sha256").update(`${combined}-${counter}`).digest();
    counter++;
    return h;
  };
  let byteBuf = nextByte();
  let byteIdx = 0;
  const nextRandom = () => {
    if (byteIdx >= byteBuf.length) {
      byteBuf = nextByte();
      byteIdx = 0;
    }
    return byteBuf[byteIdx++] / 255;
  };

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

/** Best blackjack total for a hand, treating Aces as 11 or 1 to avoid busting when possible */
function handTotal(hand) {
  let total = hand.reduce((sum, c) => sum + c.value, 0);
  let aces = hand.filter((c) => c.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function drawCard(deck) {
  return deck.shift();
}

function sanitizeGame(gameDoc) {
  const g = gameDoc.toObject ? gameDoc.toObject() : gameDoc;
  const { deck, serverSeed, ...rest } = g;
  return rest;
}

/** Auto-play the dealer's hand (stand on all 17s) and resolve the winner. Mutates the passed doc's fields in place; caller persists. */
function resolveRound(doc) {
  const dealerKey = doc.PlayerOne.isDealer ? "PlayerOne" : "PlayerTwo";
  const playerKey = dealerKey === "PlayerOne" ? "PlayerTwo" : "PlayerOne";
  const dealer = doc[dealerKey];
  const player = doc[playerKey];

  if (!player.busted) {
    while (handTotal(dealer.hand) < 17) {
      dealer.hand.push(drawCard(doc.deck));
    }
    dealer.total = handTotal(dealer.hand);
    dealer.busted = dealer.total > 21;
  } else {
    dealer.total = handTotal(dealer.hand);
  }
  dealer.stood = true;

  let winnerKey = null;
  let isPush = false;
  if (player.busted) {
    winnerKey = dealerKey;
  } else if (dealer.busted) {
    winnerKey = playerKey;
  } else if (player.blackjack && !dealer.blackjack) {
    winnerKey = playerKey;
  } else if (dealer.total === player.total) {
    isPush = true; // push: neither side wins, both players are refunded their items
  } else {
    winnerKey = dealer.total > player.total ? dealerKey : playerKey;
  }

  // Crazy Mode: flip the winner (the normal loser wins instead). Irrelevant on a push.
  if (doc.crazyMode && !isPush) {
    winnerKey = winnerKey === dealerKey ? playerKey : dealerKey;
  }

  doc.turn = "finished";
  doc.active = false;
  doc.end = new Date();
  doc.push = isPush;
  doc.winner = isPush ? null : doc[winnerKey].id;

  return { winnerKey, dealerKey, playerKey, isPush };
}

exports.getgames = asyncHandler(async (req, res) => {
  try {
    const games = await blackjack
      .find({
        $or: [
          { active: true },
          { active: false, end: { $gte: moment().subtract(1, "minutes").toDate() } },
        ],
      })
      .sort({ "requirements.static": -1 })
      .lean();

    const sanitized = games.map(({ deck, serverSeed, ...rest }) => rest);
    res.status(200).json({ message: "OK", data: sanitized });
  } catch (e) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

exports.creatematch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "blackjack_create")) {
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

      const savedGame = await new blackjack({
        creatorid: user.userid,
        game: gameType,
        crazyMode,
        PlayerOne: {
          id: user.userid,
          username: user.username,
          thumbnail: user.thumbnail,
          value: totalItemValue,
          isDealer: false,
          hand: [],
          total: 0,
          items: validatedItems,
        },
        PlayerTwo: null,
        requirements: {
          min: totalItemValue * 0.9,
          max: totalItemValue * 1.1,
          static: totalItemValue,
        },
        deck: [],
        turn: "waiting",
        winner: null,
        active: true,
        start: new Date(),
        end: null,
        serverSeed,
        serverSeedHash,
        randomSeed: null,
      }).save({ session });

      publicGame = sanitizeGame(savedGame);
    });

    res.status(200).json({ message: "Match created!", data: publicGame });

    try {
      req.app.get("io").emit("NEW_BLACKJACK", publicGame);
      await Promise.all([
        addHistory(savedUser.userid, "Blackjack Creation", `-${totalItemValue}`),
        updatestats(req.app.get("io")),
        updateuser(savedUser.userid, req.app.get("io")),
        sendwebhook(
          blackjackwebh,
          "🃏 Blackjack Created",
          `**${savedUser.username}** created a R$${totalItemValue.toLocaleString()} blackjack 1v1.`,
          [{ name: "Value", value: `R$${totalItemValue.toLocaleString()}`, inline: true }],
          savedUser.thumbnail,
          null,
          WEBHOOK_COLORS.CREATE
        ),
      ]);
    } catch (sideEffectError) {
      console.error("blackjack create side-effects:", sideEffectError);
    }
    return;
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message?.includes("Write conflict")) {
      return res.status(400).json({ message: "One or more items can't be used!" });
    }
    console.error("Blackjack creation error:", error);
    return res.status(500).json({ message: "Internal Server error" });
  } finally {
    releaseLock(req.user.id, "blackjack_create");
    session.endSession();
  }
});

exports.joinmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "blackjack_join")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let finalUpdate, game, user, totalJoinerValue, resolved, payout;

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
        blackjack.findOne({ _id: gameid }).session(session),
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

      const deck = buildShuffledDeck(serverSeed, randomSeed);

      // Bot "rolls" a coin toss to pick the dealer — 50/50, derived from the
      // same seed pair so it's auditable.
      const dealerRollByte = crypto
        .createHash("sha256")
        .update(`${serverSeed}-${randomSeed}-dealer`)
        .digest()[0];
      const creatorIsDealer = dealerRollByte % 2 === 0;

      const playerOneHand = [drawCard(deck), drawCard(deck)];
      const playerTwoHand = [drawCard(deck), drawCard(deck)];

      const playerOneTotal = handTotal(playerOneHand);
      const playerTwoTotal = handTotal(playerTwoHand);

      const updateResult = await blackjack.updateOne(
        { _id: gameid, active: true },
        {
          $set: {
            serverSeed,
            serverSeedHash,
            randomSeed,
            deck,
            "requirements.static": game.requirements.static + totalJoinerValue,
            "PlayerOne.isDealer": creatorIsDealer,
            "PlayerOne.hand": playerOneHand,
            "PlayerOne.total": playerOneTotal,
            "PlayerOne.blackjack": playerOneTotal === 21,
            PlayerTwo: {
              id: user.userid,
              username: user.username,
              thumbnail: user.thumbnail,
              value: totalJoinerValue,
              isDealer: !creatorIsDealer,
              hand: playerTwoHand,
              total: playerTwoTotal,
              blackjack: playerTwoTotal === 21,
              busted: false,
              stood: false,
              items: inventoryItems.map((item) => ({
                id: item._id,
                itemname: itemMap.get(String(item.itemid))?.itemname,
                itemvalue: itemMap.get(String(item.itemid))?.itemvalue,
                itemid: item.itemid,
                inventoryid: item._id,
                itemimage: itemMap.get(String(item.itemid))?.itemimage || "null",
              })),
            },
            turn: "player",
          },
        },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        throw httpError(400, "Game is being joined, try again!");
      }

      await inventorys.deleteMany({ _id: { $in: inventoryIds } }).session(session);

      const freshGame = await blackjack.findOne({ _id: gameid }).session(session);

      const playerKey = freshGame.PlayerOne.isDealer ? "PlayerTwo" : "PlayerOne";
      const nonDealer = freshGame[playerKey];
      const dealerKey = playerKey === "PlayerOne" ? "PlayerTwo" : "PlayerOne";
      const dealer = freshGame[dealerKey];

      // If the acting player already has a natural blackjack, resolve the
      // round immediately instead of waiting on a hit/stand call.
      if (nonDealer.blackjack || dealer.blackjack) {
        resolved = resolveRound(freshGame);
      }

      if (resolved) {
        payout = await handlePayout(freshGame, resolved, session);
      }

      await freshGame.save({ session });
      finalUpdate = sanitizeGame(freshGame);
    });

    res.status(200).json({ message: "Successfully joined match!", data: finalUpdate });

    try {
      req.app.get("io").emit("BLACKJACK_UPDATE", finalUpdate);
      await emituser(
        "NOTIFICATION",
        {
          type: "info",
          title: "Someone joined your blackjack game!",
          message: `${user.username} joined your R${game.requirements.static} blackjack game.`,
          target: game.PlayerOne.id,
        },
        game.PlayerOne.id,
        req.app.get("io")
      );

      if (resolved) {
        await finishSideEffects(finalUpdate, payout, req);
      }

      await Promise.all([
        updatestats(req.app.get("io")),
        sendwebhook(
          blackjackwebh,
          "🃏 Blackjack Joined",
          `**${user.username}** joined a R$${(game.requirements.static + totalJoinerValue).toLocaleString()} blackjack game against **${game.PlayerOne.username}**.`,
          [],
          user.thumbnail,
          null,
          WEBHOOK_COLORS.CREATE
        ),
      ]);
    } catch (sideEffectError) {
      console.error("blackjack join side-effects:", sideEffectError);
    }
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message?.includes("Write conflict")) {
      res.status(400).json({ message: "One or more items can't be used!" });
    } else {
      console.error("blackjack join:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } finally {
    releaseLock(req.user.id, "blackjack_join");
    session.endSession();
  }
});

/** Split the combined pot, tax a cut to `taxer`, and hand the rest to the winner. Must run inside the same transaction/session as the round resolution. Returns the payout summary since mongoose strips unknown props from toObject(). On a push, returns both players' items with no tax. */
async function handlePayout(doc, resolved, session) {
  const { winnerKey, dealerKey, playerKey, isPush } = resolved;

  // Push (tie): return each player's items, no tax, no stats change.
  if (isPush) {
    const p1Items = doc.PlayerOne.items || [];
    const p2Items = doc.PlayerTwo?.items || [];
    const refundRows = [
      ...p1Items.map((item) => ({ _id: item.id || item._id, owner: doc.PlayerOne.id, itemid: item.itemid, locked: false })),
      ...p2Items.map((item) => ({ _id: item.id || item._id, owner: doc.PlayerTwo.id, itemid: item.itemid, locked: false })),
    ];
    if (refundRows.length > 0) {
      await inventorys.insertMany(refundRows, { session });
    }
    return { winnerId: null, loserId: null, loserValue: 0, winnerItems: [], isPush: true };
  }

  const winnerId = doc[winnerKey].id;
  const loserKey = winnerKey === dealerKey ? playerKey : dealerKey;
  const loserId = doc[loserKey].id;
  const loserValue = doc[loserKey].value;

  const allItems = [...doc.PlayerOne.items, ...doc.PlayerTwo.items];
  const sortedItems = [...allItems].sort((a, b) => a.itemvalue - b.itemvalue);
  // Value-based tax: pick cheapest items until their accumulated value covers taxes% of the total pot.
  const totalPotValue = allItems.reduce((sum, item) => sum + (item.itemvalue || 0), 0);
  const targetTaxValue = totalPotValue * taxes;
  let taxAccum = 0;
  const taxedItems = [];
  const winnerItems = [];
  for (const item of sortedItems) {
    if (taxAccum < targetTaxValue) {
      taxedItems.push(item);
      taxAccum += (item.itemvalue || 0);
    } else {
      winnerItems.push(item);
    }
  }

  if (taxedItems.length > 0) {
    await inventorys.insertMany(
      taxedItems.map((item) => ({
        _id: item.id || item._id,
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
      { userid: winnerId },
      [{ $set: { won: { $add: ["$won", loserValue] }, wager: { $add: ["$wager", loserValue] } } }],
      { session, new: true }
    ),
    users.findOneAndUpdate(
      { userid: loserId },
      [{ $set: { lost: { $add: ["$lost", loserValue] }, wager: { $add: ["$wager", loserValue] } } }],
      { session, new: true }
    ),
  ]);

  return { winnerId, loserId, loserValue, winnerItems };
}

/** Post-response side effects for a finished round: item payout, history, stats, webhook. Never throws past the caller's try/catch. */
async function finishSideEffects(finalUpdate, payout, req) {
  const { winnerId, loserId, loserValue, winnerItems, isPush } = payout;

  req.app.get("io").emit("BLACKJACK_UPDATE", finalUpdate);

  // Push (tie): items already returned in handlePayout; just notify both players and clean up.
  if (isPush) {
    setTimeout(() => {
      req.app.get("io").emit("BLACKJACK_CANCEL", { _id: finalUpdate._id, active: false });
      updatestats(req.app.get("io"));
    }, 60000);
    await Promise.all([
      updateuser(finalUpdate.PlayerOne.id, req.app.get("io")),
      updateuser(finalUpdate.PlayerTwo.id, req.app.get("io")),
      updatestats(req.app.get("io")),
      emituser("NOTIFICATION", {
        type: "info", title: "Blackjack Push!", message: "It's a tie — your items have been refunded.", target: finalUpdate.PlayerOne.id,
      }, finalUpdate.PlayerOne.id, req.app.get("io")),
      emituser("NOTIFICATION", {
        type: "info", title: "Blackjack Push!", message: "It's a tie — your items have been refunded.", target: finalUpdate.PlayerTwo.id,
      }, finalUpdate.PlayerTwo.id, req.app.get("io")),
    ]);
    return;
  }

  const winnerKey = finalUpdate.PlayerOne.id === winnerId ? "PlayerOne" : "PlayerTwo";

  // Broadcast live win for homepage ticker
  try {
    req.app.get("io").emit("LIVE_WIN", { user: finalUpdate[winnerKey].username, game: "Blackjack", amount: finalUpdate.requirements.static });
  } catch {}

  setTimeout(async () => {
    try {
      if (winnerItems.length) {
        await inventorys.insertMany(
          winnerItems.map((item) => ({
            _id: item.id || item._id,
            owner: winnerId,
            itemid: item.itemid,
            locked: false,
          })),
          { ordered: false }
        );
      }
      await updateuser(winnerId, req.app.get("io"));
      await updateuser(loserId, req.app.get("io"));
    } catch (error) {
      if (error.code !== 11000) console.error("Blackjack setTimeout payout error:", error);
    }
  }, 3000);

  setTimeout(() => {
    req.app.get("io").emit("BLACKJACK_CANCEL", { _id: finalUpdate._id, active: false });
    updatestats(req.app.get("io"));
  }, 60000);

  await Promise.all([
    addHistory(winnerId, "Blackjack Win", `+${loserValue}`),
    addHistory(loserId, "Blackjack Loss", `-${loserValue}`),
    level(winnerId, loserValue),
    level(loserId, loserValue),
    updatestats(req.app.get("io")),
    sendwebhook(
      blackjackwebh,
      "🏁 Blackjack Finished",
      `**${finalUpdate[winnerKey].username}** won a R$${finalUpdate.requirements.static.toLocaleString()} blackjack game!`,
      [
        { name: "Player 1", value: `${finalUpdate.PlayerOne.username} (${finalUpdate.PlayerOne.total})`, inline: true },
        { name: "Player 2", value: `${finalUpdate.PlayerTwo.username} (${finalUpdate.PlayerTwo.total})`, inline: true },
      ],
      null,
      null,
      WEBHOOK_COLORS.WIN
    ),
  ]);
  checkAndTriggerDrop(req.app.get("io")).catch((e) => console.error("blackjack drop check:", e));
}

async function actOnGame(req, res, action) {
  const lockKey = `blackjack_${action}`;
  if (!acquireLock(req.user.id, lockKey)) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let finalUpdate, resolved, payout;

  try {
    await session.withTransaction(async () => {
      const { gameid } = req.body;
      if (!gameid) throw httpError(400, "Game ID required!");

      const game = await blackjack.findOne({ _id: gameid }).session(session);
      if (!game) throw httpError(404, "Game not found!");
      if (!game.active || game.turn !== "player") throw httpError(400, "It's not your turn!");

      const playerKey = game.PlayerOne.isDealer ? "PlayerTwo" : "PlayerOne";
      const player = game[playerKey];

      if (player.id !== Number(req.user.id)) {
        throw httpError(403, "It's not your turn to act!");
      }
      if (player.busted || player.stood) {
        throw httpError(400, "You've already finished your turn!");
      }

      if (action === "hit") {
        player.hand.push(drawCard(game.deck));
        player.total = handTotal(player.hand);
        if (player.total > 21) {
          player.busted = true;
          resolved = resolveRound(game);
        }
      } else {
        player.stood = true;
        resolved = resolveRound(game);
      }

      if (resolved) {
        payout = await handlePayout(game, resolved, session);
      }

      await game.save({ session });
      finalUpdate = sanitizeGame(game);
    });

    res.status(200).json({ message: "OK", data: finalUpdate });

    try {
      if (resolved) {
        await finishSideEffects(finalUpdate, payout, req);
      } else {
        req.app.get("io").emit("BLACKJACK_UPDATE", finalUpdate);
      }
    } catch (sideEffectError) {
      console.error(`blackjack ${action} side-effects:`, sideEffectError);
    }
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error(`blackjack ${action}:`, error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, lockKey);
    session.endSession();
  }
}

exports.hit = asyncHandler((req, res) => actOnGame(req, res, "hit"));
exports.stand = asyncHandler((req, res) => actOnGame(req, res, "stand"));

exports.cancelmatch = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "blackjack_cancel")) {
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
        blackjack.findOne({ _id: req.body.gameid }).session(session),
      ]);

      if (!user) throw httpError(401, "User not found!");
      if (!game) throw httpError(404, "Game not found!");
      if (!game.active) throw httpError(400, "Game already completed!");
      if (game.creatorid !== user.userid) throw httpError(403, "Not your game!");
      if (game.PlayerTwo?.id) throw httpError(400, "Game already has a joiner!");

      const updateResult = await blackjack.updateOne(
        { _id: game._id, active: true, creatorid: user.userid },
        { $set: { active: false, turn: "finished" } },
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

    req.app.get("io").emit("BLACKJACK_CANCEL", { _id: game._id, active: false });
    await Promise.all([
      updatestats(req.app.get("io")),
      addHistory(user.userid, "Blackjack Cancel", `+${game.requirements.static}`),
      updateuser(user.userid, req.app.get("io")),
    ]);

    return res.status(200).json({ success: true, message: "Game cancelled!" });
  } catch (error) {
    console.error("Cancel Blackjack Error:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "blackjack_cancel");
    session.endSession();
  }
});

exports.historyme = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const games = await blackjack
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
