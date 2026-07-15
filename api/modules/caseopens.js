const mongoose = require("mongoose");
const schema = mongoose.Schema;

const caseOpenSchema = new schema({
  caseId:    { type: mongoose.Schema.Types.ObjectId, ref: "cases", required: true },
  caseName:  { type: String, required: true },
  userId:    { type: Number, required: true },
  username:  { type: String, required: true },
  thumbnail: { type: String },
  itemWon: {
    itemid:    Number,
    itemname:  String,
    itemimage: String,
    itemvalue: Number,
    rarity:    String,
  },
  cost:      { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("caseopens", caseOpenSchema);
