const asyncHandler = require("express-async-handler");
const colordice    = require("../../modules/colordice.js");
const users        = require("../../modules/users.js");
const mongoose     = require("mongoose");
const crypto       = require("crypto");
const moment       = require("moment");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { httpError }                = require("../../utils/httpError.js");
const { addHistory, updateuser, updatestats } = require("../transaction/index.js");

const COLORS    = ["red","blue","green","yellow","orange","purple","pink","cyan","white","black"];
const HOUSE_EDGE = 0.95;   // 5 % rake
const MIN_BET    = 1_000_000;
const MAX_BET    = 50_000_000_000;

// ── Provably-fair roll ────────────────────────────────────────────────────────
// Generates a sequence of colors until one side's selection appears.
function rollColors(serverSeed, clientSeed, creatorColors, joinerColors) {
  const rolls = [];
  for (let nonce = 0; nonce < 200; nonce++) {
    const hash = crypto
      .createHash("sha256")
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest("hex");

    // Unbiased extraction — skip bytes >= 250 to avoid modulo bias
    let colorIdx = null;
    for (let i = 0; i < 32 && colorIdx === null; i++) {
      const byte = parseInt(hash.substring(i * 2, i * 2 + 2), 16);
      if (byte < 250) colorIdx = byte % 10;
    }
    if (colorIdx === null) continue;

    const color = COLORS[colorIdx];
    rolls.push(color);

    if (creatorColors.includes(color)) return { rolls, winner: "creator", winningColor: color };
    if (joinerColors.includes(color))  return { rolls, winner: "joiner",  winningColor: color };
  }
  // Fallback (should never happen with 200 iterations)
  const fallback = creatorColors[0];
  return { rolls: [fallback], winner: "creator", winningColor: fallback };
}

// ── GET /colordice/games ──────────────────────────────────────────────────────
exports.getGames = asyncHandler(async (req, res) => {
  const games = await colordice
    .find({
      $or: [
        { active: true },
        { active: false, completedAt: { $gte: moment().subtract(2, "minutes").toDate() } },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  // Strip server seed from open (unjoined) games
  const sanitized = games.map((g) => {
    if (g.active && !g.joinerId) {
      const { serverSeed, ...rest } = g;
      return rest;
    }
    return g;
  });

  res.status(200).json({ message: "OK", data: sanitized });
});

// ── POST /colordice/create ───────────────────────────────────────────────────
exports.createGame = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "colordice_create"))
    return res.status(429).json({ message: "Request already in progress." });

  const session = await mongoose.startSession();
  let publicGame;
  try {
    await session.withTransaction(async () => {
      const { betAmount, colorCount, colors } = req.body;
      const bet   = Math.floor(Number(betAmount));
      const count = Number(colorCount);

      if (!bet || bet < MIN_BET)       throw httpError(400, `Minimum bet is ${MIN_BET.toLocaleString()} gems`);
      if (bet > MAX_BET)               throw httpError(400, "Bet exceeds maximum allowed");
      if (![1,2,3,4].includes(count))  throw httpError(400, "Color count must be 1, 2, 3, or 4");
      if (!Array.isArray(colors) || colors.length !== count)
                                       throw httpError(400, `Select exactly ${count} color(s)`);
      if (!colors.every((c) => COLORS.includes(c)))
                                       throw httpError(400, "Invalid color selected");
      if (new Set(colors).size !== colors.length)
                                       throw httpError(400, "Duplicate colors not allowed");

      const user = await users.findOne({ userid: Number(req.user.id) }).session(session);
      if (!user)                       throw httpError(401, "Unauthorized");
      if (user.balance < bet)          throw httpError(400, "Insufficient gems");

      const serverSeed = crypto.randomBytes(32).toString("hex");
      const clientSeed = crypto.randomBytes(16).toString("hex");

      await users.updateOne({ userid: user.userid }, { $inc: { balance: -bet } }).session(session);

      const game = new colordice({
        creatorId: user.userid,
        creatorUsername: user.username,
        creatorThumbnail: user.thumbnail || "",
        creatorColors: colors,
        colorCount: count,
        betAmount: bet,
        serverSeed,
        clientSeed,
      });
      await game.save({ session });

      const { serverSeed: _s, ...rest } = game.toObject();
      publicGame = rest;
    });

    req.app.get("io").emit("NEW_COLORDICE", publicGame);
    await Promise.all([
      addHistory(req.user.id, "Color Dice Create", `-${publicGame.betAmount}`),
      updateuser(req.user.id, req.app.get("io")),
    ]);

    return res.status(200).json({ success: true, game: publicGame });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    console.error("[colordice] create error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "colordice_create");
    session.endSession();
  }
});

// ── POST /colordice/join ─────────────────────────────────────────────────────
exports.joinGame = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "colordice_join"))
    return res.status(429).json({ message: "Request already in progress." });

  const session = await mongoose.startSession();
  let publicGame;
  try {
    await session.withTransaction(async () => {
      const { gameId, colors } = req.body;
      if (!gameId || !Array.isArray(colors)) throw httpError(400, "Invalid request");

      const game = await colordice.findById(gameId).session(session);
      if (!game || !game.active || game.joinerId)   throw httpError(400, "Game not available");
      if (game.creatorId === Number(req.user.id))   throw httpError(400, "Cannot join your own game");
      if (colors.length !== game.colorCount)        throw httpError(400, `Select exactly ${game.colorCount} color(s)`);
      if (!colors.every((c) => COLORS.includes(c))) throw httpError(400, "Invalid color");
      if (new Set(colors).size !== colors.length)   throw httpError(400, "Duplicate colors");
      if (colors.some((c) => game.creatorColors.includes(c)))
                                                    throw httpError(400, "Colors overlap with host's selection");

      const joiner = await users.findOne({ userid: Number(req.user.id) }).session(session);
      if (!joiner)                   throw httpError(401, "Unauthorized");
      if (joiner.balance < game.betAmount) throw httpError(400, "Insufficient gems");

      // Deduct from joiner
      await users.updateOne({ userid: joiner.userid }, { $inc: { balance: -game.betAmount } }).session(session);

      // Roll
      const { rolls, winner, winningColor } = rollColors(
        game.serverSeed, game.clientSeed, game.creatorColors, colors
      );

      const pot     = game.betAmount * 2;
      const payout  = Math.floor(pot * HOUSE_EDGE);
      const winnerId       = winner === "creator" ? game.creatorId : joiner.userid;
      const winnerUsername = winner === "creator" ? game.creatorUsername : joiner.username;

      // Pay winner
      await users.updateOne({ userid: winnerId }, { $inc: { balance: payout } }).session(session);

      // Persist result
      game.joinerId        = joiner.userid;
      game.joinerUsername  = joiner.username;
      game.joinerThumbnail = joiner.thumbnail || "";
      game.joinerColors    = colors;
      game.active          = false;
      game.winner          = winner;
      game.winnerId        = winnerId;
      game.winnerUsername  = winnerUsername;
      game.winnings        = payout;
      game.rollSequence    = rolls;
      game.winningColor    = winningColor;
      game.completedAt     = new Date();
      await game.save({ session });

      publicGame = game.toObject();
    });

    req.app.get("io").emit("COLORDICE_UPDATE", publicGame);
    await Promise.all([
      addHistory(req.user.id, "Color Dice Join", `-${publicGame.betAmount}`),
      updateuser(req.user.id, req.app.get("io")),
      updateuser(publicGame.creatorId, req.app.get("io")),
      updatestats(req.app.get("io")),
    ]);

    return res.status(200).json({ success: true, game: publicGame });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    console.error("[colordice] join error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "colordice_join");
    session.endSession();
  }
});

// ── POST /colordice/cancel ───────────────────────────────────────────────────
exports.cancelGame = asyncHandler(async (req, res) => {
  if (!acquireLock(req.user.id, "colordice_cancel"))
    return res.status(429).json({ message: "Request already in progress." });

  const session = await mongoose.startSession();
  let gameId, betAmount;
  try {
    await session.withTransaction(async () => {
      ({ gameId } = req.body);
      const game = await colordice.findById(gameId).session(session);
      if (!game || !game.active || game.joinerId) throw httpError(400, "Game cannot be cancelled");
      if (game.creatorId !== Number(req.user.id)) throw httpError(403, "Not your game");
      betAmount = game.betAmount;

      await users.updateOne({ userid: game.creatorId }, { $inc: { balance: game.betAmount } }).session(session);
      await colordice.deleteOne({ _id: game._id }).session(session);
    });

    req.app.get("io").emit("COLORDICE_CANCEL", { _id: gameId });
    await Promise.all([
      addHistory(req.user.id, "Color Dice Cancel", `+${betAmount}`),
      updateuser(req.user.id, req.app.get("io")),
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "colordice_cancel");
    session.endSession();
  }
});

// ── POST /colordice/history/me ───────────────────────────────────────────────
exports.historyMe = asyncHandler(async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  const uid = Number(req.user.id);
  const games = await colordice
    .find({ active: false, $or: [{ creatorId: uid }, { joinerId: uid }] })
    .sort({ completedAt: -1 })
    .limit(20)
    .lean();
  return res.status(200).json({ message: "OK", history: games });
});
