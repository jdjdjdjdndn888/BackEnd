const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inventoryItemSchema = new Schema({
  name:  { type: String, required: true },
  count: { type: Number, default: 1 },
}, { _id: false });

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

  // Live status reported by the Lua bot via heartbeat
  inGame:            { type: Boolean, default: false },
  lastSeen:          { type: Date,    default: null },
  lastLeftAt:        { type: Date,    default: null },
  gems:              { type: Number,  default: 0 },
  hugeCount:         { type: Number,  default: 0 },
  inventorySnapshot: { type: [inventoryItemSchema], default: [] },
});

const botsModel = mongoose.model("bots", botsSchema);
module.exports = botsModel;
