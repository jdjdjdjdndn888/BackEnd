const mongoose = require("mongoose");

/**
 * Staff/admin action audit trail. Every destructive or privileged action taken
 * from the admin panel or staff chat commands should write an entry here so
 * OWNER/CO_OWNER/ADMIN can review what staff have been doing.
 */
const auditLogSchema = new mongoose.Schema({
  actorId:       { type: Number, required: true },
  actorUsername: { type: String, required: true },
  actorRank:     { type: String, required: true },
  action:        { type: String, required: true }, // short label, e.g. "Ban User"
  target:        { type: String, default: null },  // e.g. affected username/id
  details:       { type: String, default: null },  // free-form extra context
  source:        { type: String, default: "admin" }, // "admin" | "chat"
  createdAt:     { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 }, // keep 90 days
});

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("auditlogs", auditLogSchema);
