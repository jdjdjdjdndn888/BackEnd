const asyncHandler = require("express-async-handler");
const coinflips = require("../../modules/coinflips.js");
const dice = require("../../modules/dice.js");
const blackjack = require("../../modules/blackjack.js");
const Jackpot = require("../../modules/jackpotjoins.js");
const moment = require("moment");

exports.getvalue = asyncHandler(async (req, res) => {
  try {
    const [totalFlips, totalDice, totalBJ, jackpotJoins] = await Promise.all([
      coinflips.countDocuments({ active: false, winner: { $ne: null } }),
      dice.countDocuments({ active: false, winner: { $ne: null } }),
      blackjack.countDocuments({ active: false, winner: { $ne: null } }),
      Jackpot.countDocuments({}),
    ]);

    const [flipWager, diceWager, bjWager] = await Promise.all([
      coinflips.aggregate([
        { $match: { active: false, winner: { $ne: null } } },
        { $group: { _id: null, total: { $sum: "$requirements.static" } } },
      ]),
      dice.aggregate([
        { $match: { active: false, winner: { $ne: null } } },
        { $group: { _id: null, total: { $sum: "$requirements.static" } } },
      ]),
      blackjack.aggregate([
        { $match: { active: false, winner: { $ne: null } } },
        { $group: { _id: null, total: { $sum: "$requirements.static" } } },
      ]),
    ]);

    const totalGamesPlayed = totalFlips + totalDice + totalBJ + jackpotJoins;
    const totalWagered =
      (flipWager[0]?.total || 0) +
      (diceWager[0]?.total || 0) +
      (bjWager[0]?.total || 0);

    res.json({
      success: true,
      data: {
        gamesPlayed: totalGamesPlayed,
        gemsWagered: totalWagered,
      },
    });
  } catch (e) {
    console.error("getvalue error:", e);
    res.status(500).json({ success: false, data: { gamesPlayed: 0, gemsWagered: 0 } });
  }
});
