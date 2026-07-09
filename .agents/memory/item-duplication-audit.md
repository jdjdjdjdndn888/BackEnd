---
name: Item Duplication Audit — completed
description: Full audit of all item duplication/double-payout vectors and the fixes applied
---

## Audit result: all real vectors closed as of commit 2886220

### Architecture (stays solid)
- `acquireLock(userId)` — single key per userId, ignores action param; serialises ALL inventory ops for a user across game types.
- Cancel endpoints: MongoDB transaction with atomic `updateOne({active:true})` gate — double-cancel is impossible.
- Trade `respondRequest`: transaction gating on `status:"pending"/"active"` — double-accept is impossible.
- Jackpot join: both `acquireLock` + `hasJoined` check inside session.
- Upgrader: `acquireLock` + transaction. Clean.
- Giveaway create: transaction with per-item `findOne({locked:false})` before delete. Clean.

### Fixes applied (commits 03a4979, 9fab00f, 2886220)

**1. Admin `cancelAllBets` TOCTOU (coinflip/dice/blackjack/mines)**
- `cancelWaiting` and `cancelActive` now do a conditional `updateOne` (includes active/state in WHERE) and check `modifiedCount === 0` before any `insertMany`.
- Prevents double-restore when a game resolves between the `find()` and the per-doc write.

**2. Jackpot admin cancel TOCTOU**
- Only cancels jackpots with `state $nin ["Rolling","Locked","Paying","Ended"]`.
- Same `modifiedCount` guard before item restore.

**3. Jackpot `payflip` explicit state guard**
- Added `"Paying"` state. `payflip` atomically transitions `Locked → Paying` before inserting any items.
- If called twice, second call finds state not in target set and exits without inserting — no double-payout even if `.save()` duplicate-key is somehow bypassed.
- `close_jackpot` and `play_jackpot` already use `state:{$ne:"Ended"}` so they still work.

**4. Dice/Blackjack/Mines setTimeout payouts**
- Added `{ordered:false}` to all `insertMany` calls in payout setTimeouts.
- Catch blocks suppress code-11000 (duplicate key) and log anything else — batch failure can never silently swallow winner payout.

**5. Cancel endpoints — defense in depth**
- `coinflip.cancelcoinflip`, `dice.cancelmatch`, `blackjack.cancelmatch`, `mines.cancelmatch` all now call `acquireLock` at entry and `releaseLock` in `finally`.
- Prevents spam-opening of concurrent Mongo sessions; Mongo atomic gate still enforces correctness.

**6. Bot deposit idempotency**
- New `api/modules/depositlog.js` — unique index on `depositId`, TTL 24h.
- `bot.Deposit` accepts optional `depositId` (body or `x-deposit-id` header). If provided, inserts record atomically; duplicate-key → 200 ALREADY_PROCESSED, skips item insert.
- Backward compatible: if no depositId is sent, behaviour is unchanged.

### Remaining known non-issues
- Trades controller inventory mutations have no `acquireLock` but are fully transactional with state-gating — not exploitable.
- Giveaway controller has no `acquireLock` but transaction with per-item ownership check prevents double-spend.
- Admin inventory mutations are admin-only; no per-user lock needed.

**Why:** Without the TOCTOU guards an admin cancel fired during an active game resolution could restore items to both players while the game's setTimeout also gave items to the winner — real economic duplication. The `ordered:false`+11000 fix ensures batch payout failures never silently leave a winner with nothing.
