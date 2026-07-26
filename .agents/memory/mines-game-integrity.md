---
name: Mines tileIndex validation
description: revealtile endpoint must strictly validate tileIndex to prevent economic exploits in the Mines 1v1 game.
---

**Rule:** In `revealtile`, always coerce `req.body.tileIndex` to a number and validate `Number.isInteger(idx) && idx >= 0 && idx < GRID_SIZE` before any DB read or write.

**Why:** The win condition counts safe reveals toward a "cleared all safe tiles" auto-win. An unvalidated or out-of-range index (e.g. 999 or "abc") could accumulate phantom safe counts and let the joiner force a win without risk — a direct economic exploit.

**How to apply:** Pattern to use:
```js
const tileIndex = Number(req.body.tileIndex);
if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= GRID_SIZE)
  throw httpError(400, "tileIndex must be 0–24");
```
