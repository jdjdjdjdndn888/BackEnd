// Temporary diagnostic script — spins up an in-memory MongoDB and exercises
// the real tax -> drop -> claim flow to reproduce the reported bug.
// NOT part of the app; delete after debugging.
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

async function main() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const inventorys = require("./modules/inventorys.js");
  const items = require("./modules/items.js");
  const users = require("./modules/users.js");
  const Drop = require("./modules/drops.js");
  const dropstate = require("./modules/dropstate.js");
  const { taxer } = require("./config.js");
  const drops = require("./controllers/chat/drops.js");

  // Seed: an item template, a tax-account inventory row (unlocked), and a claiming user.
  await items.create({ itemid: 1001, itemname: "Test Sword", itemvalue: 500, itemimage: "https://example.com/sword.png", game: "test" });
  const invDoc = await inventorys.create({ itemid: 1001, owner: taxer, locked: false });
  await users.create({
    userid: 999, username: "Claimer", displayname: "Claimer", rank: "MEMBER",
    wager: 0, deposited: 0, balance: 0, xp: 0, level: 1,
  });

  console.log("Before spawn: inventory doc =", await inventorys.findById(invDoc._id).lean());

  let capturedDrop = null;
  const broadcastFn = async (io, drop) => {
    capturedDrop = drop;
    console.log("Drop spawned:", { id: drop._id.toString(), itemid: drop.itemid, code: drop.code, inventoryId: drop.inventoryId.toString() });
  };

  await drops.forceDrop(null, broadcastFn);

  console.log("After spawn: inventory doc =", await inventorys.findById(invDoc._id).lean());

  if (!capturedDrop) {
    console.log("!! No drop was spawned at all.");
  } else {
    const result = await drops.claimDrop(999, capturedDrop._id.toString(), capturedDrop.code);
    console.log("Claim result:", result);
    console.log("After claim: inventory doc =", await inventorys.findById(invDoc._id).lean());
    console.log("After claim: drop doc =", await Drop.findById(capturedDrop._id).lean());
  }

  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
