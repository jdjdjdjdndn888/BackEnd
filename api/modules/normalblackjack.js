const mongoose = require("mongoose");

const cardSchema = {
  rank: { type: String, required: true },
  suit: { type: String, required: true },
  value: { type: Number, required: true },
};

const handSchema = {
  cards: { type: [cardSchema], default: [] },
  bet: { type: Number, required: true },
  stood: { type: Boolean, default: false },
  busted: { type: Boolean, default: false },
  doubled: { type: Boolean, default: false },
  result: { type: String, default: "active" },
};

const gameSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },
    username: { type: String, required: true },
    thumbnail: { type: String, default: null },
    operationId: { type: String, required: true, unique: true, index: true },
    initialBet: { type: Number, required: true, min: 1 },
    totalBet: { type: Number, required: true, min: 1 },
    dealerHand: { type: [cardSchema], default: [] },
    playerHands: { type: [handSchema], default: [] },
    activeHand: { type: Number, default: 0 },
    splitUsed: { type: Boolean, default: false },
    insuranceBet: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["active", "finished", "cancelled"], default: "active", index: true },
    outcome: { type: String, default: "active" },
    payout: { type: Number, default: 0 },
    serverSeed: { type: String, required: true },
    serverSeedHash: { type: String, required: true },
    clientSeed: { type: String, required: true },
    deck: { type: [cardSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "normalblackjackgames" }
);

gameSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("NormalBlackjack", gameSchema);