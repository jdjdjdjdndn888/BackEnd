/**
 * Migration: rename game "MM2" → "Sab" across all collections.
 * Run: node api/scripts/migrate-mm2-to-sab.js
 */

const mongoose = require("mongoose");
const { mongoUri } = require("../config.js");

if (!mongoUri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(mongoUri, { dbName: "petflippy" });
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;
  const collections = ["items", "inventoryitems", "coinflips", "jackpots", "dices", "blackjacks", "rpss", "giveaways", "bots", "depositlogs", "withdrawlogs"];

  for (const col of collections) {
    try {
      const result = await db.collection(col).updateMany(
        { game: { $regex: /^MM2$/i } },
        { $set: { game: "Sab" } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  [${col}] updated ${result.modifiedCount} document(s)`);
      }
    } catch (e) {
      // collection may not exist, skip
    }
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
