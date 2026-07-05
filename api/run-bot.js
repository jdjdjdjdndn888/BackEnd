/**
 * Standalone bot runner.
 * Connects to MongoDB then loads bot.js.
 */

// ═══════════════════════════════════════════════════════════════════════
//  HARD-CODED CONFIG — paste values here if not using environment vars
// ═══════════════════════════════════════════════════════════════════════
const HARD_CODED_MONGO_URI = ""; // ← paste MongoDB URI here if not using env var
// ═══════════════════════════════════════════════════════════════════════

const mongoose = require("mongoose");
const { mongoUri: envMongoUri } = require("./config.js");

const mongoUri = HARD_CODED_MONGO_URI || envMongoUri;

if (mongoUri) {
  mongoose
    .connect(mongoUri, { dbName: "petflippy" })
    .then(() => console.log("[bot-runner] MongoDB connected"))
    .catch((err) => console.error("[bot-runner] MongoDB failed:", err.message));
} else {
  console.warn("[bot-runner] MONGODB_URI not set — DB-dependent commands will fail");
}

require("./bot");
