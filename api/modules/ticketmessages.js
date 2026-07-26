const mongoose = require("mongoose");

const ticketMessageSchema = new mongoose.Schema({
  ticketId:  { type: String, required: true, index: true },
  userId:    { type: Number, required: true },
  username:  { type: String, required: true },
  thumbnail: { type: String, default: "" },
  rank:      { type: String, default: "USER" },
  message:   { type: String, required: true },
  isSystem:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("TicketMessage", ticketMessageSchema);
