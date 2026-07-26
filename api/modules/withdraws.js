const mongoose = require("mongoose");
const schema = mongoose.Schema;
const withdrawsschema = new schema({
  itemid: {
    type: Number,
    required: true,
  },
  itemname: {
    type: String,
    required: true,
  },
  // game is not required — some legacy items may have null game; treat as unknown
  game: {
    type: String,
    default: null,
  },
  userid: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

// Speed up per-user withdraw queue lookups used by the bot
withdrawsschema.index({ userid: 1 });
withdrawsschema.index({ userid: 1, itemid: 1 });
const withdrawsmodel = mongoose.model("withdraws", withdrawsschema);
module.exports = withdrawsmodel;