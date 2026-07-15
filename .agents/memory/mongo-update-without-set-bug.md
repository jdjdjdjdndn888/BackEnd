---
name: Mongoose updateOne/updateMany without $ operators silently breaks writes
description: A recurring bug class where update payload lacks $set/$inc etc, causing MongoDB to reject the write as an invalid replacement document
---

MongoDB's `updateOne`/`updateMany` commands require the update argument to consist entirely of update-operator expressions (`$set`, `$inc`, `$push`, ...). If a plain object with bare field names is passed instead (e.g. `Model.updateOne(filter, { winnerid: x, state: "Ended" })`), the driver throws/rejects the write instead of doing a partial update.

**Why:** This class of bug caused two real production issues: jackpot's `play_jackpot` never actually persisted `winnerid` onto the Jackpot doc (so `payflip` always saw `winnerid` unset, threw "No winner determined", and closed the pot with no payout and no tax at all), and jackpot's `close_jackpot` had the same issue setting `state: "Ended"`. Upgrader's `updateMany` for transferring/unlocking target items on win/loss had the identical bug, so winners never actually received ownership of upgrade target items. All were silently swallowed by an outer catch block that just logged and moved on — no visible crash, just missing payouts.

**How to apply:** When touching any `Model.updateOne(...)`, `updateMany(...)`, or `findOneAndUpdate(...)` call in this codebase, verify the update document contains a `$set`/`$inc`/etc. wrapper (or is an aggregation-pipeline array, which is also valid). A quick repo-wide grep for update calls followed by a bare object with no `$` key on the top level should be run after any changes to game payout logic — the games controllers (`api/controllers/*/index.js`) have shown this pattern before and future edits could reintroduce it.
