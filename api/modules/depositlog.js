/**
 * DepositLog — one document per bot deposit request.
 *
 * The `depositId` field carries a caller-supplied idempotency key (the bot
 * should send a stable ID derived from the trade/session it is confirming).
 * A unique index on `depositId` means a retried request with the same key
 * hits a duplicate-key error and is rejected before any inventory is written,
 * closing the replay-duplication vector on the bot deposit path.
 *
 * Documents expire automatically after 24 h (TTL index on `createdAt`) so
 * the collection never grows unbounded.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const depositLogSchema = new Schema({
  depositId: { type: String, required: true, unique: true },
  userid:    { type: Number, required: true },
  createdAt: { type: Date,   default: Date.now, expires: 86400 }, // TTL: 24 h
});

module.exports = mongoose.model("DepositLog", depositLogSchema);
