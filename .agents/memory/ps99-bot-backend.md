---
name: PS99 Bot Backend
description: PS99 bot script endpoints, auth middleware, and userId handling patterns
---

The new PS99 Lua script uses three endpoints:
- POST `/trading/items/check-pending` — auth via `authKey` in request body (realBody middleware); sends `userId` as string (tostring)
- POST `/trading/items/confirm-ps99-deposit` — auth via `Authorization` header (real middleware); sends `userId` as number
- POST `/trading/items/confirm-withdraw` — auth via `Authorization` header (real middleware); sends `userId` as number

**Why:** Lua's `tostring()` converts Roblox userId to string for check-pending, but the other two send it as a number. Backend must handle both.

**How to apply:** Use `validUserId(raw)` helper which calls `Number(raw)` and validates with `Number.isSafeInteger(n) && n > 0`. All user-supplied strings fed into `new RegExp()` must go through `escapeRegex(s)` first to prevent ReDoS.

Auth key (`jwt_secret` / `JWT_SECRET` env var on Render) must match the hardcoded auth string in the Lua script.

`confirmWithdrawAll` filters withdrawals by game (case-insensitive regex) if `game` is provided in the request body.
