const auditlogs = require("../modules/auditlogs.js");

/**
 * Fire-and-forget audit log write. Never throws — logging must not break the
 * action it's recording.
 * @param {{userid:number, username:string, rank:string}} actor
 * @param {string} action - short label, e.g. "Ban User"
 * @param {string} [target] - affected user/entity
 * @param {string} [details] - extra context
 * @param {"admin"|"chat"} [source]
 */
function logAction(actor, action, target, details, source = "admin") {
  if (!actor) return;
  auditlogs
    .create({
      actorId: actor.userid,
      actorUsername: actor.username,
      actorRank: actor.rank,
      action,
      target: target || null,
      details: details || null,
      source,
    })
    .catch((err) => console.error("[AUDIT LOG] Failed to write entry:", err.message));
}

module.exports = { logAction };
