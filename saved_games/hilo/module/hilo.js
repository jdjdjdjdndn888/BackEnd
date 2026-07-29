const mongoose = require("mongoose");
const { Schema } = mongoose;

const hiloSchema = new Schema({
  userId:          { type: Number, required: true },
  username:        { type: String, required: true },
  thumbnail:       { type: String, default: null },
  operationId:     { type: String, required: true },
  bet:             { type: Number, required: true },
  serverSeed:      { type: String, required: true },
  serverSeedHash:  { type: String, required: true },
  clientSeed:      { type: String, required: true },
  // Full shuffled deck: indices 0-51
  // card value = (index % 13) + 1  → 1=A, 2-10, 11=J, 12=Q, 13=K
  // card suit  = Math.floor(index / 13)  → 0=♠ 1=♥ 2=♦ 3=♣
  deck:             { type: [Number], required: true },
  deckPosition:     { type: Number, default: 1 }, // next card to draw (0 already drawn as currentCard)
  currentCard:      { type: Number, required: true }, // card index 0-51
  round:            { type: Number, default: 0 },
  history: {
    type: [{
      card:            Number, // card at start of this round
      guess:           String, // 'higher' | 'lower' | 'equal'
      nextCard:        Number,
      win:             Boolean,
      probability:     Number,
      roundMultiplier: Number,
    }],
    default: [],
  },
  cumulativeMultiplier: { type: Number, default: 1.0 },
  status:          { type: String, enum: ["active", "cashed_out", "busted"], default: "active" },
  multiplierAtEnd: { type: Number, default: null },
  payout:          { type: Number, default: 0 },
  startedAt:       { type: Date, default: Date.now },
  finishedAt:      { type: Date, default: null },
});

hiloSchema.index({ userId: 1, status: 1 });
hiloSchema.index({ operationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("HiLo", hiloSchema);
