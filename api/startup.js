const jackpotController = require("./controllers/jackpot/index");
const giveawayController = require("./controllers/giveaway/index");
const users = require("./modules/users.js");
const items = require("./modules/items.js");

const API_BASE = "https://api.gemtide.win/item-image";

// Gem denomination item IDs — these use a static Discord emoji image and must
// never be sent through the PS99 catalog image endpoint (they are not pets).
const GEM_ITEM_IDS = [9000001, 9000005, 9000010, 9000025, 9000050, 9000100];
const GEM_IMAGE = "https://cdn.discordapp.com/emojis/1530173247193092146.webp?size=96";

// Rewrite every item whose itemimage doesn't already point to our endpoint.
// Gem items are excluded — they use a fixed Discord emoji URL, not the catalog.
async function migrateItemImages() {
  try {
    // Step 1: restore gem images to the correct static URL in case a previous
    //         migration run accidentally rewrote them to the item-image endpoint.
    const gemFix = await items.updateMany(
      { itemid: { $in: GEM_ITEM_IDS }, itemimage: { $ne: GEM_IMAGE } },
      { $set: { itemimage: GEM_IMAGE } }
    );
    if (gemFix.modifiedCount > 0) {
      console.log(`startup: restored ${gemFix.modifiedCount} gem image(s) → emoji URL`);
    }

    // Step 2: migrate all other items (non-gems) that still point at old URLs.
    const result = await items.updateMany(
      {
        itemid: { $nin: GEM_ITEM_IDS },
        itemimage: { $not: /api\.gemtide\.win\/item-image/ },
      },
      [
        {
          $set: {
            itemimage: {
              $concat: [
                API_BASE + "?name=",
                { $toString: "$itemname" },
              ],
            },
          },
        },
      ]
    );
    if (result.modifiedCount > 0) {
      console.log(`startup: migrated ${result.modifiedCount} item images → ${API_BASE}`);
    }
  } catch (err) {
    console.error("startup: item image migration failed:", err.message);
  }
}

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
    migrateItemImages(),

    Promise.resolve()
      .then(() => jackpotController.startup(io))
      .catch((err) => console.error("startup: jackpot controller failed:", err.message)),

    Promise.resolve()
      .then(() => giveawayController.startup(io))
      .catch((err) => console.error("startup: giveaway controller failed:", err.message)),
  ]);

  console.log("startup: complete");
};