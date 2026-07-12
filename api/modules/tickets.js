const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  userId:     { type: Number, required: true },
  username:   { type: String, required: true },
  thumbnail:  { type: String, default: "" },
  subject:    { type: String, required: true },
  category:   { type: String, default: "general", enum: ["general", "payment", "bug", "account", "other"] },
  status:     { type: String, default: "open",    enum: ["open", "closed"] },
  closedBy:   { type: String, default: null },
  closedAt:   { type: Date,   default: null },
  ownerPinged:{ type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Ticket", ticketSchema);
