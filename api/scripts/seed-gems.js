/**
 * Seed gem items into the items collection.
 * Run: node api/scripts/seed-gems.js
 */

const mongoose = require("mongoose");
const { mongoUri } = require("../config.js");
const items = require("../modules/items.js");

if (!mongoUri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const GEM_IMAGE = "https://cdn.discordapp.com/attachments/1522618058265460756/1522857070339293284/pet-simulator-99-gems.png?ex=6a49feaa&is=6a48ad2a&hm=7151b70be01d2a47bbe9063bf6c5e1d9067668dc79aecdee8556c81d135bff3e&";

const GEM_ITEMS = [
  { itemid: 9000001, itemname: "1m gems",   itemvalue: 1_000_000,   itemimage: GEM_IMAGE, game: "PS99" },
  { itemid: 9000005, itemname: "5m gems",   itemvalue: 5_000_000,   itemimage: GEM_IMAGE, game: "PS99" },
  { itemid: 9000010, itemname: "10m gems",  itemvalue: 10_000_000,  itemimage: GEM_IMAGE, game: "PS99" },
  { itemid: 9000025, itemname: "25m gems",  itemvalue: 25_000_000,  itemimage: GEM_IMAGE, game: "PS99" },
  { itemid: 9000050, itemname: "50m gems",  itemvalue: 50_000_000,  itemimage: GEM_IMAGE, game: "PS99" },
  { itemid: 9000100, itemname: "100m gems", itemvalue: 100_000_000, itemimage: GEM_IMAGE, game: "PS99" },
];

async function seed() {
  await mongoose.connect(mongoUri, { dbName: "petflippy" });
  console.log("Connected to MongoDB.");

  let created = 0;
  let skipped = 0;

  for (const gem of GEM_ITEMS) {
    const existing = await items.findOne({ itemname: gem.itemname });
    if (existing) {
      console.log(`  SKIP  ${gem.itemname} (already exists, id=${existing.itemid})`);
      skipped++;
    } else {
      await items.create(gem);
      console.log(`  OK    ${gem.itemname} — value R$${gem.itemvalue.toLocaleString()}`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
