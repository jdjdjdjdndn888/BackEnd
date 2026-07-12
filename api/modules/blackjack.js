const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cardSchema = {
  rank: { type: String, required: true },
  suit: { type: String, required: true },
  value: { type: Number, required: true },
};

const playerSchema = {
  id: { type: Number },
  username: { type: String },
  thumbnail: { type: String },
  value: { type: Number },
  isDealer: { type: Boolean, default: false },
  hand: { type: [cardSchema], default: [] },
  total: { type: Number, default: 0 },
  busted: { type: Boolean, default: false },
  stood: { type: Boolean, default: false },
  blackjack: { type: Boolean, default: false },
  items: [
    {
      id: { type: String },
      itemname: { type: String },
      itemvalue: { type: Number },
      itemid: { type: Number },
      inventoryid: { type: String },
      itemimage: { type: String },
    },
  ],
};

const blackjackSchema = new Schema({
  crazyMode: { type: Boolean, default: false }, // when true, the normal loser wins the hand instead
  creatorid: { type: Number, required: true },
  game: { type: String, required: true },
  PlayerOne: playerSchema,
  PlayerTwo: playerSchema,
  requirements: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    static: { type: Number, required: true },
  },
  // Remaining shoe of cards, never exposed to clients directly.
  deck: { type: [cardSchema], default: [] },
  turn: { type: String, enum: ["waiting", "player", "finished"], default: "waiting" },
  winner: { type: Number, default: null },
  active: { type: Boolean, default: true },
  start: { type: Date, required: true },
  end: { type: Date, default: null },
  serverSeed: { type: String },
  serverSeedHash: { type: String },
  randomSeed: { type: String },
});

module.exports = mongoose.model("Blackjack", blackjackSchema);
