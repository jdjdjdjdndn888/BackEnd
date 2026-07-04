const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tradeSchema = new Schema({
  ownerid: { type: Number, required: true },
  ownerusername: { type: String, required: true },
  ownerthumbnail: { type: String, default: "" },
  game: { type: String, required: true },
  offeredItems: [
    {
      itemid: { type: Number, required: true },
      inventoryid: { type: String, required: true },
      itemname: { type: String, required: true },
      itemimage: { type: String, default: "" },
      itemvalue: { type: Number, required: true },
    },
  ],
  wantedDescription: { type: String, default: "" },
  totalValue: { type: Number, required: true },
  status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("trades", tradeSchema);
