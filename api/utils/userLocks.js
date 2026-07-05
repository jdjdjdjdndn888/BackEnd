/**
 * Global per-user inventory lock.
 *
 * A single user can only have ONE inventory-touching operation in flight at a
 * time — regardless of operation type (coinflip, dice, jackpot, withdraw, tip,
 * giveaway).  This closes the race condition where two concurrent requests
 * could both read the same inventory items before either deletes them.
 *
 * Locks auto-expire after 30 seconds as a safety net against crashes that
 * never call releaseLock.
 */

const activeLocks = new Map(); // userId → expiry timestamp

const LOCK_TTL_MS = 30_000; // 30 s safety expiry

function acquireLock(userId, _action) {
  const key = String(userId);
  const expiry = activeLocks.get(key);

  // Clear stale locks
  if (expiry && Date.now() > expiry) {
    activeLocks.delete(key);
  }

  if (activeLocks.has(key)) return false;

  activeLocks.set(key, Date.now() + LOCK_TTL_MS);
  return true;
}

function releaseLock(userId, _action) {
  activeLocks.delete(String(userId));
}

module.exports = { acquireLock, releaseLock };
