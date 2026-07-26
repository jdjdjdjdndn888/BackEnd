const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const mongoose = require("mongoose");
const users = require("../../modules/users.js");
const Towers = require("../../modules/towers.js");
const { Wallet } = require("../../modules/normalwallet.js");
const { towersWebhook } = require("../../config.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { addHistory, updateuser, sendwebhook, WEBHOOK_COLORS } = require("../transaction/index.js");
const { httpError } = require("../../utils/httpError.js");

const TOWER_ROWS  = 8;
const HOUSE_EDGE  = 0.97; // 3% house edge per row
const MAX_BET     = 1_000_000_000;

const DIFFICULTY_CONFIG = {
  easy:   { cols: 3, bombs: 1 }, // 2 safe tiles → 1.455× per row
  medium: { cols: 3, bombs: 2 }, // 1 safe tile  → 2.910× per row
  hard:   { cols: 4, bombs: 3 }, // 1 safe tile  → 3.880× per row
  expert: { cols: 5, bombs: 4 }, // 1 safe tile  → 4.850× per row
};

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
    throw httpError(400, `Bet must be between 1 and ${MAX_BET.toLocaleString()}.`);
  }
  return bet;
}

function operationIdOf(raw) {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || id.length > 120) throw httpError(400, "A unique operationId is required.");
  return id;
}

/** Row multiplier for one cleared row (includes house edge) */
function rowMult(difficulty) {
  const { cols, bombs } = DIFFICULTY_CONFIG[difficulty];
  return (cols / (cols - bombs)) * HOUSE_EDGE;
}

/** Cumulative multiplier after N rows cleared */
function cumulativeMult(difficulty, rowsCleared) {
  if (rowsCleared <= 0) return 1.0;
  return Math.round(Math.pow(rowMult(difficulty), rowsCleared) * 1e6) / 1e6;
}

/**
 * Provably-fair bomb placement.
 * Produces a Fisher-Yates shuffle of [0..cols-1] per row and takes the
 * first `bombs` elements as bomb positions.
 */
function generateRows(serverSeed, clientSeed, difficulty) {
  const { cols, bombs } = DIFFICULTY_CONFIG[difficulty];
  const rows = [];
  for (let row = 0; row < TOWER_ROWS; row++) {
    const positions = Array.from({ length: cols }, (_, i) => i);
    let counter = 0;
    const random = () => {
      const bytes = crypto
        .createHash("sha256")
        .update(`${serverSeed}:${clientSeed}:${row}:${counter++}`)
        .digest();
      return bytes.readUInt32BE(0) / 0x1_0000_0000;
    };
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    rows.push(positions.slice(0, bombs).sort((a, b) => a - b));
  }
  return rows;
}

/** Strip server seed from active games; add computed multiplier */
function expose(game) {
  const data = game.toObject ? game.toObject() : JSON.parse(JSON.stringify(game));
  if (data.status === "active") {
    delete data.serverSeed;
    // Only reveal bomb positions for completed rows, not upcoming ones
    data.rows = data.rows.map((row, i) => (i < data.picks.length ? row : null));
  }
  data.currentMultiplier = cumulativeMult(data.difficulty, data.picks.length);
  return data;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

exports.getCurrent = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const game   = await Towers.findOne({ userId, status: "active" }).sort({ startedAt: -1 });
  res.json({ success: true, data: game ? expose(game) : null });
});

exports.history = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const games  = await Towers.find({ userId, status: { $ne: "active" } })
    .sort({ finishedAt: -1 }).limit(20).lean();
  res.json({ success: true, data: games });
});

exports.create = asyncHandler(async (req, res) => {
  const userId      = userIdOf(req);
  const bet         = betOf(req.body?.bet);
  const difficulty  = req.body?.difficulty;
  const operationId = operationIdOf(req.body?.operationId);
  const clientSeed  = typeof req.body?.clientSeed === "string" && req.body.clientSeed.length <= 120
    ? req.body.clientSeed : crypto.randomUUID();

  if (!DIFFICULTY_CONFIG[difficulty]) {
    return res.status(400).json({ message: "Invalid difficulty. Choose easy, medium, hard, or expert." });
  }

  if (!acquireLock(userId, "towers_create")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  // Idempotency: if same operationId already exists, return it
  const existing = await Towers.findOne({ operationId, userId });
  if (existing) {
    releaseLock(userId, "towers_create");
    return res.json({ success: true, data: expose(existing) });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      const user = await users.findOne({ userid: userId }).session(session);
      if (!user) throw httpError(401, "User not found.");

      const active = await Towers.exists({ userId, status: "active" }).session(session);
      if (active) throw httpError(400, "Finish your current game before starting another.");

      const wallet = await Wallet.findOne({ owner: userId }).session(session);
      if (!wallet || wallet.balance < bet) throw httpError(400, "Not enough credits in your normal wallet.");

      const serverSeed     = crypto.randomBytes(32).toString("hex");
      const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
      const rows           = generateRows(serverSeed, clientSeed, difficulty);

      game = new Towers({
        userId,
        username:    user.username,
        thumbnail:   user.thumbnail,
        operationId,
        bet,
        difficulty,
        rows,
        serverSeed,
        serverSeedHash,
        clientSeed,
        picks:      [],
        currentRow: 0,
        status:     "active",
        startedAt:  new Date(),
      });

      wallet.balance -= bet;
      wallet.wagered += bet;

      await game.save({ session });
      await wallet.save({ session });
    });

    await updateuser(userId, req.app.get("io"));
    sendwebhook(towersWebhook, "🗼 Towers Started",
      `**${game.username}** started a Towers game (${difficulty}).`,
      [{ name: "Bet", value: `${bet.toLocaleString()} credits`, inline: true },
       { name: "Difficulty", value: difficulty, inline: true }],
      game.thumbnail, null, WEBHOOK_COLORS.CREATE
    ).catch(() => {});
    return res.json({ success: true, data: expose(game) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Could not start game." });
  } finally {
    await session.endSession();
    releaseLock(userId, "towers_create");
  }
});

exports.pick = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const col    = Math.floor(Number(req.body?.col));

  if (!acquireLock(userId, "towers_pick")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      game = await Towers.findOne({ userId, status: "active" }).sort({ startedAt: -1 }).session(session);
      if (!game) throw httpError(404, "No active game found.");

      const { cols } = DIFFICULTY_CONFIG[game.difficulty];
      if (!Number.isInteger(col) || col < 0 || col >= cols) {
        throw httpError(400, "Invalid column selection.");
      }
      if (game.currentRow >= TOWER_ROWS) throw httpError(400, "Game already complete.");

      const bombs   = game.rows[game.currentRow];
      const isBomb  = bombs.includes(col);

      game.picks.push(col);
      game.markModified("picks");

      if (isBomb) {
        // Bust — reveal all rows
        game.status          = "busted";
        game.multiplierAtEnd = cumulativeMult(game.difficulty, game.picks.length - 1);
        game.payout          = 0;
        game.finishedAt      = new Date();

        const wallet = await Wallet.findOne({ owner: userId }).session(session);
        if (wallet) { wallet.lost += game.bet; await wallet.save({ session }); }
      } else {
        game.currentRow += 1;
        const rowsCleared = game.picks.length; // == game.currentRow after increment

        if (rowsCleared >= TOWER_ROWS) {
          // All rows cleared — auto cashout
          const mult   = cumulativeMult(game.difficulty, rowsCleared);
          const payout = Math.floor(game.bet * mult);
          game.multiplierAtEnd = mult;
          game.payout          = payout;
          game.status          = "cashed_out";
          game.finishedAt      = new Date();

          const wallet = await Wallet.findOne({ owner: userId }).session(session);
          if (!wallet) throw httpError(500, "Wallet not found.");
          wallet.balance += payout;
          wallet.won     += payout;
          await wallet.save({ session });
        }
      }

      await game.save({ session });
    });

    await updateuser(userId, req.app.get("io"));

    if (game.status !== "active") {
      const won = game.status === "cashed_out";
      sendwebhook(towersWebhook,
        won ? "🗼 Towers Win" : "🗼 Towers Busted",
        `**${game.username}** ${won ? `cashed out at ${game.multiplierAtEnd?.toFixed(2)}×` : "hit a bomb"}.`,
        [{ name: "Bet",        value: `${game.bet.toLocaleString()}`, inline: true },
         { name: "Difficulty", value: game.difficulty,                inline: true },
         { name: "Rows",       value: String(game.picks.length - (won ? 0 : 1)), inline: true },
         { name: "Payout",     value: `${game.payout.toLocaleString()}`, inline: true }],
        game.thumbnail, null, won ? WEBHOOK_COLORS.WIN : WEBHOOK_COLORS.LOSS
      ).catch(() => {});
      if (won) addHistory(userId, "Towers Win",  `+${game.payout}`).catch(() => {});
      else     addHistory(userId, "Towers Loss", `-${game.bet}`).catch(() => {});
    }

    return res.json({ success: true, data: expose(game) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Pick failed." });
  } finally {
    await session.endSession();
    releaseLock(userId, "towers_pick");
  }
});

exports.cashout = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);

  if (!acquireLock(userId, "towers_cashout")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      game = await Towers.findOne({ userId, status: "active" }).sort({ startedAt: -1 }).session(session);
      if (!game) throw httpError(404, "No active game found.");
      if (game.picks.length === 0) throw httpError(400, "Clear at least one row before cashing out.");

      const mult   = cumulativeMult(game.difficulty, game.picks.length);
      const payout = Math.floor(game.bet * mult);

      game.multiplierAtEnd = mult;
      game.payout          = payout;
      game.status          = "cashed_out";
      game.finishedAt      = new Date();

      const wallet = await Wallet.findOne({ owner: userId }).session(session);
      if (!wallet) throw httpError(500, "Wallet not found.");
      wallet.balance += payout;
      wallet.won     += payout;

      await game.save({ session });
      await wallet.save({ session });
    });

    await updateuser(userId, req.app.get("io"));
    sendwebhook(towersWebhook, "🗼 Towers Cashout",
      `**${game.username}** cashed out at ${game.multiplierAtEnd?.toFixed(2)}×.`,
      [{ name: "Bet",    value: `${game.bet.toLocaleString()}`,    inline: true },
       { name: "Payout", value: `${game.payout.toLocaleString()}`, inline: true },
       { name: "Rows",   value: String(game.picks.length),         inline: true }],
      game.thumbnail, null, WEBHOOK_COLORS.WIN
    ).catch(() => {});
    addHistory(userId, "Towers Win", `+${game.payout}`).catch(() => {});
    return res.json({ success: true, data: expose(game) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Cashout failed." });
  } finally {
    await session.endSession();
    releaseLock(userId, "towers_cashout");
  }
});
