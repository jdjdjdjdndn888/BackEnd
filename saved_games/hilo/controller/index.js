const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const mongoose = require("mongoose");
const users = require("../../modules/users.js");
const HiLo = require("../../modules/hilo.js");
const { Wallet } = require("../../modules/normalwallet.js");
const { hiloWebhook } = require("../../config.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { addHistory, updateuser, sendwebhook, WEBHOOK_COLORS } = require("../transaction/index.js");
const { httpError } = require("../../utils/httpError.js");

const HOUSE_EDGE = 0.96; // 4% house edge
const MIN_MULT   = 1.04; // floor multiplier (captures nearly-certain guesses)
const MAX_BET    = 1_000_000_000;

// ── Card helpers ──────────────────────────────────────────────────────────────
// card index 0-51: value = (index % 13) + 1 → 1(A)…13(K), suit = floor(index/13) → 0♠ 1♥ 2♦ 3♣

function cardValue(card) { return (card % 13) + 1; }

/**
 * Shuffle a 52-card deck (0-51) using provably-fair sha256 Fisher-Yates.
 */
function shuffleDeck(serverSeed, clientSeed) {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  let counter = 0;
  const random = () => {
    const bytes = crypto
      .createHash("sha256")
      .update(`${serverSeed}:${clientSeed}:${counter++}`)
      .digest();
    return bytes.readUInt32BE(0) / 0x1_0000_0000;
  };
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Compute how many cards in the remaining deck satisfy the guess relative to currentCard.
 * Returns { favorable, total, probability, multiplier }.
 */
function hiloOdds(currentCard, remainingDeck, guess) {
  const current = cardValue(currentCard);
  let favorable = 0;
  for (const card of remainingDeck) {
    const v = cardValue(card);
    if (guess === "higher" && v > current) favorable++;
    else if (guess === "lower"  && v < current) favorable++;
    else if (guess === "equal"  && v === current) favorable++;
  }
  const total    = remainingDeck.length;
  const prob     = total > 0 ? favorable / total : 0;
  const rawMult  = prob > 0 ? total / favorable : Infinity;
  const mult     = prob > 0 ? Math.max(MIN_MULT, Math.round(rawMult * HOUSE_EDGE * 100) / 100) : 0;
  return { favorable, total, probability: Math.round(prob * 10000) / 10000, multiplier: mult };
}

// ── Validators ────────────────────────────────────────────────────────────────

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

/** Build the sanitized game object sent to the client (hide server seed while active) */
function expose(game) {
  const data = game.toObject ? game.toObject() : JSON.parse(JSON.stringify(game));
  if (data.status === "active") {
    delete data.serverSeed;
    delete data.deck; // never expose deck order to client
  }
  // Include current odds for all three guesses
  if (data.status === "active" && game.deck && game.deckPosition !== undefined) {
    const remaining = game.deck.slice(game.deckPosition);
    data.odds = {
      higher: hiloOdds(game.currentCard, remaining, "higher"),
      lower:  hiloOdds(game.currentCard, remaining, "lower"),
      equal:  hiloOdds(game.currentCard, remaining, "equal"),
    };
  }
  return data;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

exports.getCurrent = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const game   = await HiLo.findOne({ userId, status: "active" }).sort({ startedAt: -1 });
  res.json({ success: true, data: game ? expose(game) : null });
});

exports.history = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const games  = await HiLo.find({ userId, status: { $ne: "active" } })
    .sort({ finishedAt: -1 }).limit(20).lean();
  res.json({ success: true, data: games });
});

exports.create = asyncHandler(async (req, res) => {
  const userId      = userIdOf(req);
  const bet         = betOf(req.body?.bet);
  const operationId = operationIdOf(req.body?.operationId);
  const clientSeed  = typeof req.body?.clientSeed === "string" && req.body.clientSeed.length <= 120
    ? req.body.clientSeed : crypto.randomUUID();

  if (!acquireLock(userId, "hilo_create")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  const existing = await HiLo.findOne({ operationId, userId });
  if (existing) {
    releaseLock(userId, "hilo_create");
    return res.json({ success: true, data: expose(existing) });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      const user = await users.findOne({ userid: userId }).session(session);
      if (!user) throw httpError(401, "User not found.");

      const active = await HiLo.exists({ userId, status: "active" }).session(session);
      if (active) throw httpError(400, "Finish your current game before starting another.");

      const wallet = await Wallet.findOne({ owner: userId }).session(session);
      if (!wallet || wallet.balance < bet) throw httpError(400, "Not enough credits in your normal wallet.");

      const serverSeed     = crypto.randomBytes(32).toString("hex");
      const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
      const deck           = shuffleDeck(serverSeed, clientSeed);
      const firstCard      = deck[0];

      game = new HiLo({
        userId,
        username:    user.username,
        thumbnail:   user.thumbnail,
        operationId,
        bet,
        serverSeed,
        serverSeedHash,
        clientSeed,
        deck,
        deckPosition: 1,
        currentCard:  firstCard,
        round:        0,
        history:      [],
        cumulativeMultiplier: 1.0,
        status:       "active",
        startedAt:    new Date(),
      });

      wallet.balance -= bet;
      wallet.wagered += bet;

      await game.save({ session });
      await wallet.save({ session });
    });

    await updateuser(userId, req.app.get("io"));
    sendwebhook(hiloWebhook, "🃏 HiLo Started",
      `**${game.username}** started a HiLo game.`,
      [{ name: "Bet", value: `${bet.toLocaleString()} credits`, inline: true }],
      game.thumbnail, null, WEBHOOK_COLORS.CREATE
    ).catch(() => {});
    return res.json({ success: true, data: expose(game) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Could not start game." });
  } finally {
    await session.endSession();
    releaseLock(userId, "hilo_create");
  }
});

exports.guess = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const guess  = req.body?.guess;

  if (!["higher", "lower", "equal"].includes(guess)) {
    return res.status(400).json({ message: "Guess must be 'higher', 'lower', or 'equal'." });
  }

  if (!acquireLock(userId, "hilo_guess")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      game = await HiLo.findOne({ userId, status: "active" }).sort({ startedAt: -1 }).session(session);
      if (!game) throw httpError(404, "No active game found.");
      if (game.deckPosition >= game.deck.length) throw httpError(400, "Deck exhausted — please cashout.");

      const remaining     = game.deck.slice(game.deckPosition);
      const { probability, multiplier } = hiloOdds(game.currentCard, remaining, guess);

      if (multiplier === 0) throw httpError(400, "That outcome is impossible with the current card.");

      const nextCard      = game.deck[game.deckPosition];
      const nextValue     = cardValue(nextCard);
      const currentValue  = cardValue(game.currentCard);

      let win = false;
      if (guess === "higher") win = nextValue >  currentValue;
      if (guess === "lower")  win = nextValue <  currentValue;
      if (guess === "equal")  win = nextValue === currentValue;

      // Push history entry
      game.history.push({
        card:            game.currentCard,
        guess,
        nextCard,
        win,
        probability,
        roundMultiplier: win ? multiplier : 0,
      });
      game.markModified("history");

      game.deckPosition += 1;

      if (!win) {
        // Bust
        game.status          = "busted";
        game.multiplierAtEnd = game.cumulativeMultiplier;
        game.payout          = 0;
        game.finishedAt      = new Date();
        // currentCard stays as the card that caused the bust (for reveal)
        game.currentCard     = nextCard;

        const wallet = await Wallet.findOne({ owner: userId }).session(session);
        if (wallet) { wallet.lost += game.bet; await wallet.save({ session }); }
      } else {
        game.cumulativeMultiplier = Math.round(game.cumulativeMultiplier * multiplier * 1e6) / 1e6;
        game.currentCard          = nextCard;
        game.round               += 1;

        // Auto-cashout if deck runs out
        if (game.deckPosition >= game.deck.length) {
          const payout = Math.floor(game.bet * game.cumulativeMultiplier);
          game.multiplierAtEnd = game.cumulativeMultiplier;
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
      sendwebhook(hiloWebhook,
        won ? "🃏 HiLo Win" : "🃏 HiLo Busted",
        `**${game.username}** ${won ? `cashed out at ${game.multiplierAtEnd?.toFixed(2)}×` : "guessed wrong"}.`,
        [{ name: "Bet",    value: `${game.bet.toLocaleString()}`,        inline: true },
         { name: "Rounds", value: String(game.round),                    inline: true },
         { name: "Payout", value: `${game.payout.toLocaleString()}`,     inline: true }],
        game.thumbnail, null, won ? WEBHOOK_COLORS.WIN : WEBHOOK_COLORS.LOSS
      ).catch(() => {});
      if (won) addHistory(userId, "HiLo Win",  `+${game.payout}`).catch(() => {});
      else     addHistory(userId, "HiLo Loss", `-${game.bet}`).catch(() => {});
    }

    return res.json({ success: true, data: expose(game) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Guess failed." });
  } finally {
    await session.endSession();
    releaseLock(userId, "hilo_guess");
  }
});

exports.cashout = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);

  if (!acquireLock(userId, "hilo_cashout")) {
    return res.status(429).json({ message: "Request already in progress." });
  }

  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      game = await HiLo.findOne({ userId, status: "active" }).sort({ startedAt: -1 }).session(session);
      if (!game) throw httpError(404, "No active game found.");
      if (game.round === 0) throw httpError(400, "Make at least one correct guess before cashing out.");

      const payout = Math.floor(game.bet * game.cumulativeMultiplier);

      game.multiplierAtEnd = game.cumulativeMultiplier;
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
    sendwebhook(hiloWebhook, "🃏 HiLo Cashout",
      `**${game.username}** cashed out at ${game.multiplierAtEnd?.toFixed(2)}×.`,
      [{ name: "Bet",    value: `${game.bet.toLocaleString()}`,    inline: true },
       { name: "Rounds", value: String(game.round),               inline: true },
       { name: "Payout", value: `${game.payout.toLocaleString()}`, inline: true }],
      game.thumbnail, null, WEBHOOK_COLORS.WIN
    ).catch(() => {});
    addHistory(userId, "HiLo Win", `+${game.payout}`).catch(() => {});
    return res.json({ success: true, data: expose(game) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Cashout failed." });
  } finally {
    await session.endSession();
    releaseLock(userId, "hilo_cashout");
  }
});
