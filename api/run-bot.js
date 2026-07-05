/**
 * Standalone bot runner.
 * Connects to MongoDB (needed for slash command handlers) then loads bot.js.
 * Runs independently of the HTTP server so the bot stays alive even if the
 * API server is restarted or crashes.
 */

const mongoose = require("mongoose");
const { mongoUri } = require("./config.js");

if (mongoUri) {
  mongoose
    .connect(mongoUri, { dbName: "petflippy" })
    .then(() => console.log("[bot-runner] MongoDB connected"))
    .catch((err) => console.error("[bot-runner] MongoDB failed:", err.message));
} else {
  console.warn("[bot-runner] MONGODB_URI not set — DB-dependent commands will fail");
}

require("./bot");
