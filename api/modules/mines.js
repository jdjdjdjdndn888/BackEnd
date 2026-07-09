const mongoose = require("mongoose");

const minesSchema = new mongoose.Schema({
  creatorid: { type: Number, required: true },
  game:      { type: String, required: true },
  minesCount: { type: Number, default: 5 },
  grid:      { type: [Number], default: [] }, // indices of bomb positions (revealed after game ends)
  revealed:  { type: [Number], default: [] }, // indices the joiner has clicked
  PlayerOne: {
    id:        Number,
    username:  String,
    thumbnail: String,
    value:     Number,
    items:     Array,
  },
  PlayerTwo: {
    id:        Number,
    username:  String,
    thumbnail: String,
    value:     Number,
    items:     Array,
    cashedOut: { type: Boolean, default: false },
  },
  requirements: {
    min:    Number,
    max:    Number,
    static: Number,
  },
  winner:   { type: Number, default: null },
  active:   { type: Boolean, default: true },
  state:    { type: String, enum: ["waiting", "playing", "finished"], default: "waiting" },
  start:    { type: Date, default: Date.now },
  end:      { type: Date, default: null },
  serverSeed:     String,
  serverSeedHash: String,
  randomSeed:     { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model("mines", minesSchema);
