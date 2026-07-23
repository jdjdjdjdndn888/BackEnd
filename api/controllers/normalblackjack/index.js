const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const mongoose = require("mongoose");
const users = require("../../modules/users.js");
const NormalBlackjack = require("../../modules/normalblackjack.js");
const { Wallet } = require("../../modules/normalwallet.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const { addHistory, updateuser } = require("../transaction/index.js");
const { httpError } = require("../../utils/httpError.js");

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const MAX_BET = 1_000_000_000;
const BLACKJACK_PROFIT_NUMERATOR = 6;
const BLACKJACK_PROFIT_DENOMINATOR = 5;

function value(rank) {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return Number(rank);
}

function handValue(cards) {
  let total = cards.reduce((sum, card) => sum + card.value, 0);
  let aces = cards.filter((card) => card.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

function makeDeck() {
  const deck = [];
  for (let shoe = 0; shoe < 6; shoe += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) deck.push({ rank, suit, value: value(rank) });
    }
  }
  return deck;
}

function shuffle(deck, serverSeed, clientSeed) {
  let counter = 0;
  const random = () => {
    const bytes = crypto.createHash("sha256")
      .update(`${serverSeed}:${clientSeed}:${counter++}`)
      .digest();
    return bytes.readUInt32BE(0) / 0x1_0000_0000;
  };
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function draw(game) {
  const card = game.deck.shift();
  if (!card) throw httpError(500, "The shoe is empty. Please start a new hand.");
  return card;
}

function isNatural(hand) {
  return hand.cards.length === 2 && handValue(hand.cards).total === 21;
}

function dealerUpCard(game) {
  return game.dealerHand[0];
}

function exposedGame(game) {
  const data = game.toObject ? game.toObject() : JSON.parse(JSON.stringify(game));
  delete data.deck;
  if (data.status === "active") delete data.serverSeed;
  if (data.status === "active" && data.dealerHand.length > 1) {
    data.dealerHand = [data.dealerHand[0], { hidden: true, rank: "?", suit: "?", value: 0 }];
  }
  data.playerHands = data.playerHands.map((hand) => ({
    ...hand,
    total: handValue(hand.cards).total,
  }));
  data.dealerTotal = data.status === "active" ? null : handValue(data.dealerHand).total;
  return data;
}

function userIdOf(req) {
  const id = Number(req.user?.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw httpError(401, "Unauthorized");
  return id;
}

function betOf(raw) {
  const bet = Number(raw);
  if (!Number.isSafeInteger(bet) || bet < 1 || bet > MAX_BET) {
    throw httpError(400, `Bet must be a whole number between 1 and ${MAX_BET.toLocaleString()}.`);
  }
  return bet;
}

function operationIdOf(raw) {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || id.length > 120) throw httpError(400, "A unique operation id is required.");
  return id;
}

function markHand(hand) {
  const { total } = handValue(hand.cards);
  hand.busted = total > 21;
  return total;
}

function allHandsDone(game) {
  return game.playerHands.every((hand) => hand.stood || hand.busted);
}

function advanceHand(game) {
  const next = game.playerHands.findIndex((hand, index) => index > game.activeHand && !hand.stood && !hand.busted);
  if (next >= 0) game.activeHand = next;
}

function dealerPlay(game) {
  const dealer = handValue(game.dealerHand);
  while (dealer.total < 17 || (dealer.total === 17 && dealer.soft)) {
    game.dealerHand.push(draw(game));
    Object.assign(dealer, handValue(game.dealerHand));
  }
}

function settleGame(game, wallet) {
  if (game.status !== "active") return 0;
  const dealer = handValue(game.dealerHand);
  const dealerNatural = isNatural({ cards: game.dealerHand });
  let payout = 0;
  const outcomes = [];

  for (const hand of game.playerHands) {
    const player = handValue(hand.cards);
    let handPayout = 0;
    let result = "loss";
    if (player.total > 21) {
      result = "bust";
    } else if (isNatural(hand) && !game.splitUsed) {
      if (dealerNatural) {
        handPayout = hand.bet;
        result = "push";
      } else {
        handPayout = hand.bet + Math.floor(
          (hand.bet * BLACKJACK_PROFIT_NUMERATOR) / BLACKJACK_PROFIT_DENOMINATOR
        );
        result = "blackjack";
      }
    } else if (dealerNatural) {
      result = "loss";
    } else if (dealer.total > 21 || player.total > dealer.total) {
      handPayout = hand.bet * 2;
      result = "win";
    } else if (player.total === dealer.total) {
      handPayout = hand.bet;
      result = "push";
    }
    hand.result = result;
    payout += handPayout;
    outcomes.push(result);
  }

  // Insurance pays 2:1 in addition to returning the insurance stake.
  if (game.insuranceBet && dealerNatural) {
    payout += game.insuranceBet * 3;
  }
  if (payout > 0) wallet.balance += payout;
  const net = payout - game.totalBet;
  if (net > 0) wallet.won += net;
  if (net < 0) wallet.lost += Math.abs(net);
  game.payout = payout;
  game.outcome = outcomes.join(",") || "loss";
  game.status = "finished";
  game.finishedAt = new Date();
  return payout;
}

async function loadActive(req, session, action) {
  const userId = userIdOf(req);
  const gameId = req.body?.gameId;
  if (!mongoose.isValidObjectId(gameId)) throw httpError(400, "Invalid game.");
  const game = await NormalBlackjack.findOne({ _id: gameId, userId, status: "active" }).session(session);
  if (!game) throw httpError(404, "Active hand not found.");
  if (!["hit", "stand", "double", "split", "insurance"].includes(action)) {
    throw httpError(400, "Unsupported blackjack action.");
  }
  return { game, userId };
}

exports.getCurrent = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const game = await NormalBlackjack.findOne({ userId, status: "active" }).sort({ startedAt: -1 });
  res.json({ success: true, data: game ? exposedGame(game) : null });
});

exports.history = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const games = await NormalBlackjack.find({ userId, status: "finished" })
    .sort({ finishedAt: -1 }).limit(15).select("-deck");
  res.json({ success: true, data: games.map(exposedGame) });
});

exports.create = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const bet = betOf(req.body?.bet);
  const operationId = operationIdOf(req.body?.operationId);
  const clientSeed = typeof req.body?.clientSeed === "string" && req.body.clientSeed.length <= 120
    ? req.body.clientSeed : crypto.randomUUID();
  if (!acquireLock(userId, "normal_blackjack_create")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const existing = await NormalBlackjack.findOne({ operationId, userId });
  if (existing) {
    releaseLock(userId, "normal_blackjack_create");
    return res.json({ success: true, data: exposedGame(existing) });
  }
  const session = await mongoose.startSession();
  let game;
  try {
    await session.withTransaction(async () => {
      const user = await users.findOne({ userid: userId }).session(session);
      if (!user) throw httpError(401, "User not found.");
      const active = await NormalBlackjack.exists({ userId, status: "active" }).session(session);
      if (active) throw httpError(400, "Finish your current hand before starting another.");
      const wallet = await Wallet.findOne({ owner: userId }).session(session);
      if (!wallet || wallet.balance < bet) throw httpError(400, "Not enough normal wallet credits.");
      const serverSeed = crypto.randomBytes(32).toString("hex");
      game = new NormalBlackjack({
        userId,
        username: user.username,
        thumbnail: user.thumbnail,
        operationId,
        initialBet: bet,
        totalBet: bet,
        serverSeed,
        serverSeedHash: crypto.createHash("sha256").update(serverSeed).digest("hex"),
        clientSeed,
        deck: shuffle(makeDeck(), serverSeed, clientSeed),
        dealerHand: [],
        playerHands: [{ cards: [], bet }],
      });
      game.dealerHand.push(draw(game));
      const first = game.playerHands[0];
      first.cards.push(draw(game), draw(game));
      game.dealerHand.push(draw(game));
      wallet.balance -= bet;
      wallet.wagered += bet;
      if (isNatural(first) || isNatural({ cards: game.dealerHand })) settleGame(game, wallet);
      await game.save({ session });
      await wallet.save({ session });
    });
    await updateuser(userId, req.app.get("io"));
    return res.json({ success: true, data: exposedGame(game) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not start blackjack." });
  } finally {
    await session.endSession();
    releaseLock(userId, "normal_blackjack_create");
  }
});

exports.action = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const action = String(req.body?.action || "").toLowerCase();
  if (!acquireLock(userId, `normal_blackjack_${action}`)) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }
  const session = await mongoose.startSession();
  let game;
  let wallet;
  try {
    await session.withTransaction(async () => {
      const loaded = await loadActive(req, session, action);
      game = loaded.game;
      wallet = await Wallet.findOne({ owner: userId }).session(session);
      if (!wallet) throw httpError(400, "Normal wallet not found.");
      const hand = game.playerHands[game.activeHand];
      if (!hand) throw httpError(400, "No active player hand.");
      if (action === "hit") {
        hand.cards.push(draw(game));
        const total = markHand(hand);
        if (total >= 21) hand.stood = total === 21;
        if (hand.stood || hand.busted) advanceHand(game);
      } else if (action === "stand") {
        hand.stood = true;
        advanceHand(game);
      } else if (action === "double") {
        if (hand.cards.length !== 2 || hand.doubled) throw httpError(400, "Double is only available on your first two cards.");
        if (wallet.balance < hand.bet) throw httpError(400, "Not enough wallet credits to double.");
        wallet.balance -= hand.bet;
        wallet.wagered += hand.bet;
        hand.bet *= 2;
        game.totalBet += hand.bet / 2;
        hand.doubled = true;
        hand.cards.push(draw(game));
        markHand(hand);
        hand.stood = true;
        advanceHand(game);
      } else if (action === "split") {
        if (game.splitUsed || hand.cards.length !== 2 || value(hand.cards[0].rank) !== value(hand.cards[1].rank)) {
          throw httpError(400, "Split is only available once on a matching opening pair.");
        }
        if (wallet.balance < hand.bet) throw httpError(400, "Not enough wallet credits to split.");
        wallet.balance -= hand.bet;
        wallet.wagered += hand.bet;
        game.totalBet += hand.bet;
        const bet = hand.bet;
        const left = { cards: [hand.cards[0], draw(game)], bet, stood: false, busted: false, doubled: false, result: "active" };
        const right = { cards: [hand.cards[1], draw(game)], bet, stood: false, busted: false, doubled: false, result: "active" };
        game.playerHands.splice(game.activeHand, 1, left, right);
        game.splitUsed = true;
      } else if (action === "insurance") {
        if (game.activeHand !== 0 || game.playerHands.length !== 1 || dealerUpCard(game).rank !== "A" || game.insuranceBet) {
          throw httpError(400, "Insurance is not available for this hand.");
        }
        const insuranceBet = Math.floor(hand.bet / 2);
        if (wallet.balance < insuranceBet) throw httpError(400, "Not enough wallet credits for insurance.");
        wallet.balance -= insuranceBet;
        wallet.wagered += insuranceBet;
        game.insuranceBet = insuranceBet;
        game.totalBet += insuranceBet;
        if (isNatural({ cards: game.dealerHand })) settleGame(game, wallet);
      }
      if (game.status === "active" && allHandsDone(game)) {
        if (game.playerHands.some((entry) => entry.busted) && game.playerHands.every((entry) => entry.busted)) {
          settleGame(game, wallet);
        } else {
          dealerPlay(game);
          settleGame(game, wallet);
        }
      }
      game.markModified("deck");
      game.markModified("dealerHand");
      game.markModified("playerHands");
      await game.save({ session });
      await wallet.save({ session });
    });
    await updateuser(userId, req.app.get("io"));
    return res.json({ success: true, data: exposedGame(game) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Blackjack action failed." });
  } finally {
    await session.endSession();
    releaseLock(userId, `normal_blackjack_${action}`);
  }
});

exports.cancel = asyncHandler(async (req, res) => {
  throw httpError(400, "Hands cannot be cancelled after the deal. Refresh the table to resume your active hand.");
});