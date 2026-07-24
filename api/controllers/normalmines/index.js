const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const mongoose = require("mongoose");
const users = require("../../modules/users.js");
const NormalMines = require("../../modules/normalmines.js");
const { Wallet } = require("../../modules/normalwallet.js");
const { bjWebhook } = require("../../config.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { addHistory, updateuser, sendwebhook, WEBHOOK_COLORS } = require("../transaction/index.js");
const { httpError } = require("../../utils/httpError.js");

const GRID_SIZE = 25;
const MAX_BET   = 1_000_000_000;
const HOUSE_EDGE = 0.91; // 9% house edge — keeps multipliers fair but meaningfully harder to sustain high streaks

// ── Helpers ──────────────────────────────────────────────────────────────────

function userIdOf(req) {
  const id = Number(req.user?.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw httpError(401, "Unauthorized");
  return id;
}

function betOf(raw) {
  const input = typeof raw === "string" ? raw.trim().toLowerCase() : raw;
  const match  = typeof input === "string" ? input.match(/^(\d+(?:\.\d+)?)([kmbt]?)$/) : null;
  const mults  = { "": 1, k: 1_000, m: 1_000_000, b: 1_000_000_000, t: 1_000_000_000_000 };
  const bet    = match ? Number(match[1]) * mults[match[2]] : Number(input);
  if (!Number.isSafeInteger(bet) || bet < 1 || bet > MAX_BET) {
    throw httpError(400, `Bet must be between 1 and ${MAX_BET.toLocaleString()}. You can use 1m, 100m, 1b etc.`);
  }
  return bet;
}

function mineCountOf(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isSafeInteger(n) || n < 1 || n > 24) {
    throw httpError(400, "Mine count must be between 1 and 24.");
  }
  return n;
}

function operationIdOf(raw) {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || id.length > 120) throw httpError(400, "A unique operation id is required.");
  return id;
}

function tileIndexOf(raw) {
  const idx = Math.floor(Number(raw));
  if (!Number.isSafeInteger(idx) || idx < 0 || idx >= GRID_SIZE) {
    throw httpError(400, "Invalid tile index.");
  }
  return idx;
}

/**
 * Provably-fair mine placement using sha256 chain.
 * Produces a Fisher-Yates shuffle of [0..24] and takes the first mineCount
 * elements as mine positions.
 */
function placeMines(serverSeed, clientSeed, mineCount) {
  const positions = Array.from({ length: GRID_SIZE }, (_, i) => i);
  let counter = 0;
  const random = () => {
    const bytes = crypto
      .createHash("sha256")
      .update(`${serverSeed}:${clientSeed}:${counter++}`)
      .digest();
    return bytes.readUInt32BE(0) / 0x1_0000_0000;
  };
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions.slice(0, mineCount);
}

/**
 * Multiplier after `safeReveals` safe tiles with `mineCount` mines.
 * Each step multiplies by (remaining_tiles / remaining_safe_tiles).
 * Returns 1.00 (no bonus) if no tiles revealed yet.
 */
function computeMultiplier(mineCount, safeReveals) {
  if (safeReveals <= 0) return 1.0;
  let mult = 1.0;
  for (let k = 0; k < safeReveals; k++) {
    const remaining      = GRID_SIZE - k;            // tiles left to choose from
    const remainingSafe  = GRID_SIZE - mineCount - k; // safe tiles left
    if (remainingSafe <= 0) break;
    mult *= remaining / remainingSafe;
  }
  return Math.round(mult * HOUSE_EDGE * 1e6) / 1e6;
}

function exposedGame(game) {
  const data = game.toObject ? game.toObject() : JSON.parse(JSON.stringify(game));
  // Hide mine positions while game is active
  if (data.status === "active") {
    delete data.grid;
    delete data.serverSeed;
  }
  data.currentMultiplier = computeMultiplier(data.mineCount, data.revealed.length);
  return data;
}

function logMines(title, description, game, color) {
  return sendwebhook(
    bjWebhook,
    title,
    description,
    [
      { name: "Player",    value: game.username || `User ${game.userId}`, inline: true },
      { name: "Bet",       value: `${Number(game.bet || 0).toLocaleString()} credits`, inline: true },
      { name: "Mines",     value: String(game.mineCount), inline: true },
      { name: "Revealed",  value: String(game.revealed.length), inline: true },
      { name: "Multiplier",value: `${Number(game.multiplierAtEnd || computeMultiplier(game.mineCount, game.revealed.length)).toFixed(4)}×`, inline: true },
      { name: "Payout",    value: `${Number(game.payout || 0).toLocaleString()} credits`, inline: true },
    ],
    game.thumbnail,
    null,
    color,
  ).catch((e) => console.error("normal mines webhook:", e));
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

exports.getCurrent = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const game   = await NormalMines.findOne({ userId, status: "active" }).sort({ startedAt: -1 });
  res.json({ success: true, data: game ? exposedGame(game) : null });
});

exports.history = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const games  = await NormalMines.find({ userId, status: { $ne: "active" } })
    .sort({ finishedAt: -1 }).limit(20).lean();
  res.json({ success: true, data: games });
});

exports.create = asyncHandler(async (req, res) => {
  const userId      = userIdOf(req);
  const bet         = betOf(req.body?.bet);
  const mineCount   = mineCountOf(req.body?.mineCount ?? 5);
  const operationId = operationIdOf(req.body?.operationId);
  const clientSeed  = typeof req.body?.clientSeed === "string" && req.body.clientSeed.length <= 120
    ? req.body.clientSeed : crypto.randomUUID();

  if (!acquireLock(userId, "normal_mines_create")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  const existing = await NormalMines.findOne({ operationId, userId });
  if (existing) {
    releaseLock(userId, "normal_mines_create");
    return res.json({ success: true, data: exposedGame(existing) });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      const user = await users.findOne({ userid: userId }).session(session);
      if (!user) throw httpError(401, "User not found.");

      const active = await NormalMines.exists({ userId, status: "active" }).session(session);
      if (active) throw httpError(400, "Finish your current game before starting another.");

      const wallet = await Wallet.findOne({ owner: userId }).session(session);
      if (!wallet || wallet.balance < bet) throw httpError(400, "Not enough normal wallet credits.");

      const serverSeed = crypto.randomBytes(32).toString("hex");
      const grid       = placeMines(serverSeed, clientSeed, mineCount);

      game = new NormalMines({
        userId,
        username:    user.username,
        thumbnail:   user.thumbnail,
        operationId,
        bet,
        mineCount,
        grid,
        serverSeed,
        serverSeedHash: crypto.createHash("sha256").update(serverSeed).digest("hex"),
        clientSeed,
        revealed:   [],
        status:     "active",
        payout:     0,
        startedAt:  new Date(),
      });

      wallet.balance  -= bet;
      wallet.wagered  += bet;

      await game.save({ session });
      await wallet.save({ session });
    });

    await updateuser(userId, req.app.get("io"));
    void logMines("💣 Normal Mines Started", `**${game.username}** started a mines game.`, game, WEBHOOK_COLORS.CREATE);
    return res.json({ success: true, data: exposedGame(game) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not start game." });
  } finally {
    await session.endSession();
    releaseLock(userId, "normal_mines_create");
  }
});

exports.reveal = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const tileIndex = tileIndexOf(req.body?.tileIndex);

  if (!acquireLock(userId, "normal_mines_reveal")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      game = await NormalMines.findOne({ userId, status: "active" }).sort({ startedAt: -1 }).session(session);
      if (!game) throw httpError(404, "No active game found.");

      if (game.revealed.includes(tileIndex)) throw httpError(400, "Tile already revealed.");

      const isMine = game.grid.includes(tileIndex);

      if (isMine) {
        // Player hit a mine — lose the bet
        game.revealed.push(tileIndex);
        game.status    = "busted";
        game.payout    = 0;
        game.multiplierAtEnd = computeMultiplier(game.mineCount, game.revealed.length - 1);
        game.finishedAt = new Date();

        const wallet = await Wallet.findOne({ owner: userId }).session(session);
        if (wallet) {
          wallet.lost += game.bet;
          await wallet.save({ session });
        }
      } else {
        // Safe tile
        game.revealed.push(tileIndex);
        const maxSafe = GRID_SIZE - game.mineCount;
        if (game.revealed.length >= maxSafe) {
          // All safe tiles revealed — auto cashout
          const multiplier = computeMultiplier(game.mineCount, game.revealed.length);
          const payout     = Math.floor(game.bet * multiplier);
          game.multiplierAtEnd = multiplier;
          game.payout     = payout;
          game.status     = "cashed_out";
          game.finishedAt = new Date();

          const wallet = await Wallet.findOne({ owner: userId }).session(session);
          if (!wallet) throw httpError(500, "Wallet not found.");
          wallet.balance += payout;
          wallet.won     += payout;
          await wallet.save({ session });
        }
      }

      game.markModified("revealed");
      await game.save({ session });
    });

    await updateuser(userId, req.app.get("io"));

    if (game.status !== "active") {
      const color = game.status === "cashed_out" ? WEBHOOK_COLORS.WIN : WEBHOOK_COLORS.LOSS;
      void logMines(
        game.status === "cashed_out" ? "💣 Normal Mines Win" : "💣 Normal Mines Busted",
        `**${game.username}** ${game.status === "cashed_out" ? "cashed out" : "hit a mine"}.`,
        game,
        color,
      );
    }

    return res.json({ success: true, data: exposedGame(game) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Reveal failed." });
  } finally {
    await session.endSession();
    releaseLock(userId, "normal_mines_reveal");
  }
});

exports.cashout = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);

  if (!acquireLock(userId, "normal_mines_cashout")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      game = await NormalMines.findOne({ userId, status: "active" }).sort({ startedAt: -1 }).session(session);
      if (!game) throw httpError(404, "No active game found.");
      if (game.revealed.length === 0) throw httpError(400, "Reveal at least one tile before cashing out.");

      const multiplier = computeMultiplier(game.mineCount, game.revealed.length);
      const payout     = Math.floor(game.bet * multiplier);

      game.multiplierAtEnd = multiplier;
      game.payout     = payout;
      game.status     = "cashed_out";
      game.finishedAt = new Date();

      const wallet = await Wallet.findOne({ owner: userId }).session(session);
      if (!wallet) throw httpError(500, "Wallet not found.");
      wallet.balance += payout;
      wallet.won     += payout;

      await game.save({ session });
      await wallet.save({ session });
    });

    await updateuser(userId, req.app.get("io"));
    void logMines("💣 Normal Mines Win", `**${game.username}** cashed out.`, game, WEBHOOK_COLORS.WIN);
    return res.json({ success: true, data: exposedGame(game) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Cashout failed." });
  } finally {
    await session.endSession();
    releaseLock(userId, "normal_mines_cashout");
  }
});
