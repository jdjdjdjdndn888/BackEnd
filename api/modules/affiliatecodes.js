const mongoose = require("mongoose");
const schema = mongoose.Schema;

const affiliateCodeSchema = new schema({
  ownerid: { type: Number, required: true, unique: true },
  ownerusername: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  uses: { type: Number, default: 0 },
  createdat: { type: Date, default: Date.now },
});


module.exports = mongoose.model("affiliatecodes", affiliateCodeSchema);
