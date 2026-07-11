const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const upgraderSchema = new Schema(
  {
    userid: { type: Number, required: true },
    username: { type: String },
    thumbnail: { type: String },
    betItems: [
      {
        inventoryid: { type: String },
        itemid: { type: Number },
        itemname: { type: String },
        itemimage: { type: String },
        itemvalue: { type: Number },
      },
    ],
    betValue: { type: Number, required: true },
    targetItems: [
      {
        inventoryid: { type: String },
        itemid: { type: Number },
        itemname: { type: String },
        itemimage: { type: String },
        itemvalue: { type: Number },
      },
    ],
    targetValue: { type: Number, required: true },
    winChance: { type: Number, required: true },
    result: { type: String, enum: ["win", "lose"], required: true },
    serverSeed: { type: String },
    serverSeedHash: { type: String },
    clientSeed: { type: String },
    roll: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Upgrader", upgraderSchema);
