/**
 * retryPayout.js
 *
 * Inserts winner inventory items with automatic retry on transient errors.
 * - Duplicate-key (11000) is silently ignored — item was already created, winner is paid.
 * - Any other error is retried up to maxAttempts times with exponential back-off.
 * - After all attempts are exhausted a CRITICAL log is written so staff can manually restore
 *   the items.  The loser's items were already removed inside the DB transaction, so this
 *   log is the last safety net.
 */

const inventorys = require("../modules/inventorys.js");

/**
 * @param {Array<{_id, owner, itemid, locked}>} itemDocs  Inventory docs to insert
 * @param {string}  context      Game name used in log lines (e.g. "Coinflip")
 * @param {number}  maxAttempts  How many total tries before giving up (default 5)
 */
async function retryPayout(itemDocs, context = "Game", maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await inventorys.insertMany(itemDocs, { ordered: false });
      return; // ✅ success
    } catch (err) {
      // Duplicate key = already inserted on a previous attempt or retry — winner is paid
      if (err.code === 11000) return;

      // Write-conflict can surface as a bulk write error with individual 11000 codes
      const isAllDuplicates =
        err.writeErrors?.length &&
        err.writeErrors.every((e) => e.code === 11000);
      if (isAllDuplicates) return;

      console.error(
        `[${context}] payout attempt ${attempt}/${maxAttempts} failed: ${err.message}`
      );

      if (attempt < maxAttempts) {
        // Back-off: 600 ms, 1.2 s, 1.8 s, 2.4 s ...
        await new Promise((r) => setTimeout(r, 600 * attempt));
      } else {
        console.error(
          `[${context}] CRITICAL — payout failed after ${maxAttempts} attempts. ` +
          `Manual inventory restore required. Items: ${JSON.stringify(itemDocs)}`
        );
      }
    }
  }
}

module.exports = { retryPayout };
