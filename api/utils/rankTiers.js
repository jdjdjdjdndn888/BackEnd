/**
 * Canonical staff rank tiers, shared between the admin panel and site chat
 * command permissions. Keep in sync with SPECIAL_RANKS in utils/getrole.js.
 */

// Full admin panel access (users/items/bots/withdrawals/danger zone).
const ADMIN_PANEL_TIER = ["OWNER", "CO_OWNER", "ADMIN"];

// Owner-level-only destructive actions (resetall, reset balances, wipe inventories).
const OWNER_TIER = ["OWNER", "CO_OWNER"];

// Full staff chat commands: mute/unmute/ban/unban/lockchat/unlockchat/rainbow/purge.
const FULL_STAFF_TIER = ["OWNER", "CO_OWNER", "ADMIN", "TRUSTED_STAFF", "MODERATOR"];

// Limited staff: mute/unmute only, no bans or destructive commands.
const TRIAL_STAFF_TIER = ["TRIAL_STAFF"];

// Any rank that should bypass a locked chat / be treated as "staff" for chat UI purposes.
const ANY_STAFF_TIER = [...FULL_STAFF_TIER, ...TRIAL_STAFF_TIER];

// All valid assignable ranks (used to validate /admin/setrank).
const ALL_RANKS = ["USER", "TRIAL_STAFF", "MIDDLEMAN", "MODERATOR", "TRUSTED_STAFF", "ADMIN", "CO_OWNER", "OWNER"];

module.exports = {
  ADMIN_PANEL_TIER,
  OWNER_TIER,
  FULL_STAFF_TIER,
  TRIAL_STAFF_TIER,
  ANY_STAFF_TIER,
  ALL_RANKS,
};
