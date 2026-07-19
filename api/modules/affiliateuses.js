const mongoose = require("mongoose");
const schema = mongoose.Schema;

const affiliateUseSchema = new schema({
  codeownerid:       { type: Number, required: true },
  codeownerusername: { type: String, required: true },
  code:              { type: String, required: true },
  userid:            { type: Number, required: true },
  username:          { type: String, required: true },
  // snapshots taken at the moment the code was used
  depositatuse:      { type: Number, default: 0 },
  wageratuse:        { type: Number, default: 0 },
  // has the code owner claimed their 100M reward for this entry
  claimed:           { type: Boolean, default: false },
  createdat:         { type: Date, default: Date.now },
});

// fast look-up by code owner (userid unique is already set on the field above)
affiliateUseSchema.index({ codeownerid: 1 });

module.exports = mongoose.model("affiliateuses", affiliateUseSchema);
