---
name: Bot status heartbeat system
description: Live bot in-game status, inventory snapshot, and deposit panel UI for showing bot presence and stock
---

## Architecture

**Bot → Backend (POST /bots/heartbeat)**
- Lua calls every 60s with: `botUserId` (Roblox UserId), `game`, `inGame`, `gems`, `hugeCount`, `inventory: [{name, count}]`
- Auth: `Authorization: <jwt_secret>` header (bothandler.real middleware)
- Matches bot by `userid` in bots collection; upserts `inGame`, `lastSeen`, `gems`, `hugeCount`, `inventorySnapshot`
- Sets `lastLeftAt` when `inGame = false`
- Route must be declared BEFORE `/bots/:game` in routes.js or Express treats "heartbeat" as the game param

**Bots schema new fields** (api/modules/bots.js):
- `inGame: Boolean`, `lastSeen: Date`, `lastLeftAt: Date`
- `gems: Number`, `hugeCount: Number`, `inventorySnapshot: [{name, count}]`

**Frontend auto-refresh**: BotList fetches `/bots/:game` every 30s. Status timers update every 1s via useTimer hook.

**Why:**
Bot left-game confusion — the `online` field in admin panel is manually toggled; `inGame`/`lastSeen` are script-driven and show real-time presence.

**How to apply:**
Any new bot status field must be added to the bots schema AND sent from the Lua heartbeat function (`sendHeartbeat` in gemtide.win.lua). Deposit panel reads these fields directly from the `/bots/:game` response.
