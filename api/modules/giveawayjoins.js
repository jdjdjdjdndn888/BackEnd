const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const giveawayjoins = new Schema({
    userid: {
        type: Number,
        required: true,
    },
    giveawayid: {
        type: String,
        required: true,
    }
});

// Unique compound index ensures one entry per user per giveaway,
// and makes the duplicate-entry 11000 guard in joingiveaway work correctly.
giveawayjoins.index({ userid: 1, giveawayid: 1 }, { unique: true });

const GiveawayJoins = mongoose.model("giveawaysjoins", giveawayjoins);
module.exports = GiveawayJoins;
