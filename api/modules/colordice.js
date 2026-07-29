const mongoose = require("mongoose");
const { Schema } = mongoose;

const colordiceSchema = new Schema({
  creatorId:       { type: Number, required: true },
  creatorUsername: { type: String, required: true },
  creatorThumbnail:{ type: String, default: "" },
  creatorColors:   { type: [String], required: true },
  joinerId:        { type: Number, default: null },
  joinerUsername:  { type: String, default: null },
  joinerThumbnail: { type: String, default: null },
  joinerColors:    { type: [String], default: [] },
  colorCount:      { type: Number, required: true },   // 1-4
  betAmount:       { type: Number, required: true },   // gems
  active:          { type: Boolean, default: true },
  winner:          { type: String, default: null },    // "creator" | "joiner"
  winnerId:        { type: Number, default: null },
  winnerUsername:  { type: String, default: null },
  winnings:        { type: Number, default: 0 },
  rollSequence:    { type: [String], default: [] },
  winningColor:    { type: String, default: null },
  serverSeed:      { type: String, required: true },
  clientSeed:      { type: String, required: true },
  createdAt:       { type: Date, default: Date.now },
  completedAt:     { type: Date, default: null },
});

colordiceSchema.index({ active: 1, createdAt: -1 });
colordiceSchema.index({ creatorId: 1, active: 1 });
colordiceSchema.index({ joinerId: 1 });

module.exports = mongoose.model("colordice", colordiceSchema);
