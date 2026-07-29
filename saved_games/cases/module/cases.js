const mongoose = require("mongoose");
const schema = mongoose.Schema;

const caseItemSchema = new schema({
  itemid: { type: Number, required: true },
  weight: { type: Number, required: true, default: 10 }, // higher = more common
  rarity: { type: String, enum: ["common", "uncommon", "rare", "epic", "legendary"], default: "common" },
}, { _id: false });

const caseSchema = new schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  cost: { type: Number, required: true }, // gem cost to open
  items: [caseItemSchema],
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("cases", caseSchema);
