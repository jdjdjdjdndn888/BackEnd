const mongoose = require("mongoose");
const { Schema } = mongoose;

const DIFFICULTIES = ["easy", "medium", "hard", "expert"];

const towersSchema = new Schema({
  userId:          { type: Number, required: true },
  username:        { type: String, required: true },
  thumbnail:       { type: String, default: null },
  operationId:     { type: String, required: true },
  bet:             { type: Number, required: true },
  difficulty:      { type: String, enum: DIFFICULTIES, required: true },
  // rows[i] = sorted array of bomb column indices for that row (0-based from bottom)
  rows:            { type: [[Number]], required: true },
  serverSeed:      { type: String, required: true },
  serverSeedHash:  { type: String, required: true },
  clientSeed:      { type: String, required: true },
  // picks[i] = column the player chose for row i
  picks:           { type: [Number], default: [] },
  currentRow:      { type: Number, default: 0 }, // 0 = bottom row
  status:          { type: String, enum: ["active", "cashed_out", "busted"], default: "active" },
  multiplierAtEnd: { type: Number, default: null },
  payout:          { type: Number, default: 0 },
  startedAt:       { type: Date,   default: Date.now },
  finishedAt:      { type: Date,   default: null },
});

towersSchema.index({ userId: 1, status: 1 });
towersSchema.index({ operationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Towers", towersSchema);
