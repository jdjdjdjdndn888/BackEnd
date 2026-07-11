const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  content:   { type: String, required: true },
  userid:    { type: Number, required: true },
  username:  { type: String, required: true },
  thumbnail: { type: String, default: null },
  rank:      { type: String, required: true },
  level:     { type: Number, required: true },
  timestamp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // auto-delete after 7 days
});

module.exports = mongoose.model('chatmessages', chatMessageSchema);
