const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  content:   { type: String, required: false, default: "" },
  userid:    { type: Number, required: true },
  username:  { type: String, required: true },
  thumbnail: { type: String, default: null },
  rank:      { type: String, required: true },
  level:     { type: Number, required: true },
  timestamp: { type: String, required: true },
  // "message" (default) is a normal/system chat line. "drop" carries a
  // claimable item drop card instead of plain text — see api/controllers/chat/drops.js.
  type:      { type: String, enum: ["message", "drop"], default: "message" },
  drop:      { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // auto-delete after 7 days
});

module.exports = mongoose.model('chatmessages', chatMessageSchema);
