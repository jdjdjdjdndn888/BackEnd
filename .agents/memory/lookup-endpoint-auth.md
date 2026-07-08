---
name: Lookup endpoint auth
description: Auth and field exposure rules for the universal user lookup endpoints
---

## All lookup routes require bot API key
Routes `/users/lookup`, `/user/lookup`, `/trading/users/lookup`, `/discord/lookup` (GET and POST) all use `bothandler.real` middleware. This checks `req.headers["authorization"] === jwt_secret`.

**Why:** These endpoints were added to support Lua bot scripts and return user profile data including Discord IDs. Without auth, any public request could enumerate users. Fixed after code review flagged broken access control.

## Accepted field names (camelCase + lowercase aliased)
The `exports.lookup` handler normalises:
- `userid` OR `userId` → Roblox numeric ID lookup
- `username` → case-insensitive regex match
- `discordid` OR `discordId` OR `discord_id` → Discord snowflake lookup
- `discordusername` OR `discordUsername` → case-insensitive regex match

**Why:** Lua scripts send camelCase (`userId`, `discordId`); web clients may send lowercase. Both are accepted.

## Fields returned (intentionally restricted)
Returns: `userid`, `username`, `thumbnail`, `displayname`, `rank`, `level`, `xp`, `wager`, `won`, `lost`, `discordid`, `discordusername`.

Does NOT return: `balance`, `banned`. These are sensitive and not needed by the bot's Discord-mention feature.
