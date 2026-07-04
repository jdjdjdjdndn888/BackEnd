const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tradeRequestSchema = new Schema({
  tradeid: { type: Schema.Types.ObjectId, required: true, ref: "trades" },
  senderid: { type: Number, required: true },
  senderusername: { type: String, required: true },
  senderthumbnail: { type: String, default: "" },
  offeredItems: [
    {
      itemid: { type: Number, required: true },
      inventoryid: { type: String, required: true },
      itemname: { type: String, required: true },
      itemimage: { type: String, default: "" },
      itemvalue: { type: Number, required: true },
    },
  ],
  totalValue: { type: Number, required: true },
  status: { type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("traderequests", tradeRequestSchema);
