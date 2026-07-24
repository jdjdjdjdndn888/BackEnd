const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
  {
    userId:     { type: Number, required: true, index: true },
    username:   { type: String, required: true },
    thumbnail:  { type: String, default: null },
    operationId:{ type: String, required: true, unique: true, index: true },
    bet:        { type: Number, required: true, min: 1 },
    mineCount:  { type: Number, required: true, min: 1, max: 24 },
    // mine positions — hidden until game ends
    grid:       { type: [Number], default: [] },
    // safely revealed tile indices in click order
    revealed:   { type: [Number], default: [] },
    // multiplier at the time of cash-out / loss
    multiplierAtEnd: { type: Number, default: 0 },
    status:   { type: String, enum: ["active", "cashed_out", "busted"], default: "active", index: true },
    payout:   { type: Number, default: 0 },
    serverSeed:     { type: String, required: true },
    serverSeedHash: { type: String, required: true },
    clientSeed:     { type: String, required: true },
    startedAt:  { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "normalminesgames" }
);

gameSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("NormalMines", gameSchema);
