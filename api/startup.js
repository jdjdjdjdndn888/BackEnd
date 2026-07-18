const jackpotController = require("./controllers/jackpot/index");
const giveawayController = require("./controllers/giveaway/index");
const users = require("./modules/users.js");

// Accounts that should always have OWNER rank.
// If they exist in the DB at startup but have a lower rank, they are promoted.
const OWNER_ACCOUNTS = ["tinytedde", "PetSim99GrinderB01"];

async function ensureOwners() {
  for (const username of OWNER_ACCOUNTS) {
    try {
      const user = await users.findOne({ username });
      if (user && user.rank !== "OWNER") {
        await users.updateOne({ username }, { $set: { rank: "OWNER" } });
        console.log(`startup: promoted ${username} to OWNER`);
      }
    } catch (err) {
      console.error(`startup: failed to ensure OWNER rank for ${username}:`, err.message);
    }
  }
}

exports.startup = async (io) => {
  console.log("startup: beginning");

  await Promise.allSettled([
    ensureOwners(),

    Promise.resolve()
      .then(() => jackpotController.startup(io))
      .catch((err) => console.error("startup: jackpot controller failed:", err.message)),

    Promise.resolve()
      .then(() => giveawayController.startup(io))
      .catch((err) => console.error("startup: giveaway controller failed:", err.message)),
  ]);

  console.log("startup: complete");
};