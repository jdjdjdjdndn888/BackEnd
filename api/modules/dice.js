const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const diceSchema = new Schema({
  creatorid: { type: Number, required: true },
  game: { type: String, required: true },
  PlayerOne: {
    id: { type: Number, required: true },
    username: { type: String, required: true },
    thumbnail: { type: String, required: true },
    value: { type: Number, required: true },
    chances: { type: Number, required: true, default: 1.0 },
    dice: { type: [Number], default: [] },   // [d1, d2, d3]
    total: { type: Number, default: 0 },
    items: [
      {
        id: { type: String, required: true },
        itemname: { type: String, required: true },
        itemvalue: { type: Number, required: true },
        itemid: { type: Number, required: true },
        inventoryid: { type: String, required: true },
        itemimage: { type: String, required: true },
      },
    ],
  },
  PlayerTwo: {
    id: { type: Number },
    username: { type: String },
    thumbnail: { type: String },
    value: { type: Number },
    chances: { type: Number },
    dice: { type: [Number], default: [] },
    total: { type: Number, default: 0 },
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
  },
  requirements: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    static: { type: Number, required: true },
  },
  winner: { type: Number, default: null },
  active: { type: Boolean, default: true },
  start: { type: Date, required: true },
  end: { type: Date, default: null },
  serverSeed: { type: String },
  serverSeedHash: { type: String },
  randomSeed: { type: String },
});

module.exports = mongoose.model("Dice", diceSchema);
