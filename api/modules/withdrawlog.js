/**
 * WithdrawLog — one document per bot withdraw confirmation.
 *
 * The `withdrawId` field carries a caller-supplied idempotency key from the
 * Lua bot (userId + time bucket). A unique index ensures a retried confirm
 * is rejected before any records are deleted, preventing double-confirmation
 * of the same withdrawal.
 *
 * Documents expire automatically after 24 h (TTL index on `createdAt`).
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const withdrawLogSchema = new Schema({
  withdrawId: { type: String, required: true, unique: true },
  userid:     { type: Number, required: true },
  createdAt:  { type: Date,   default: Date.now, expires: 86400 }, // TTL: 24 h
});

module.exports = mongoose.model("WithdrawLog", withdrawLogSchema);
