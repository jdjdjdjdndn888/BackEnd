const jackpotController = require("./controllers/jackpot/index");
const giveawayController = require("./controllers/giveaway/index");

exports.startup = async (io) => {
  console.log("startup: beginning");

  await Promise.allSettled([
    Promise.resolve()
      .then(() => jackpotController.startup(io))
      .catch((err) => console.error("startup: jackpot controller failed:", err.message)),

    Promise.resolve()
      .then(() => giveawayController.startup(io))
      .catch((err) => console.error("startup: giveaway controller failed:", err.message)),
  ]);

  console.log("startup: complete");
};