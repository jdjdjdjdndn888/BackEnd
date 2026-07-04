const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const botsSchema = new Schema({
  name:        { type: String, required: true },
  pfp:         { type: String, required: true },
  userid:      { type: Number, required: true },
  link:        { type: String, default: "" },
  game:        { type: String, required: true },
  online:      { type: Boolean, default: true },
  showJoin:    { type: Boolean, default: true },
  showProfile: { type: Boolean, default: true },
  showId:      { type: Boolean, default: false },
});

const botsModel = mongoose.model("bots", botsSchema);
module.exports = botsModel;
