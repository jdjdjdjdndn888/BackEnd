# GemTide Discord Bot — Setup Guide

## Files you need

| File | Purpose |
|------|---------|
| `bot.js` | The bot itself (2 000 lines, self-contained) |
| `run-bot.js` | Tiny launcher — connects Mongo then loads bot.js |
| `package.json` | Lists the npm packages to install |

---

## Step 1 — Install packages

Create a folder, drop the files in, then run:

```
npm install
```

The only packages `bot.js` actually uses are:

| Package | What it's for |
|---------|--------------|
| `discord.js` | Discord API (slash commands, embeds, buttons, tickets) |
| `mongoose` | MongoDB database connection |

Your `package.json` must have at minimum:

```json
{
  "name": "gemtide-bot",
  "version": "1.0.0",
  "main": "run-bot.js",
  "dependencies": {
    "discord.js": "^14.26.4",
    "mongoose": "^8.8.2"
  }
}
```

---

## Step 2 — Add your values

Open `bot.js` and paste your values at the very top (lines 4-5):

```js
const HARD_CODED_BOT_TOKEN = "YOUR_DISCORD_BOT_TOKEN_HERE";
const HARD_CODED_MONGO_URI = "YOUR_MONGODB_URI_HERE";
```

OR use environment variables instead (both work):

| Env var | Value |
|---------|-------|
| `DISCORD_BOT_TOKEN` | Your bot token from discord.com/developers |
| `MONGODB_URI` | Your MongoDB connection string |

---

## Step 3 — Start the bot

```
node run-bot.js
```

That's it. `run-bot.js` connects to MongoDB first, then loads `bot.js`.

---

## What the bot needs in Discord

- A Discord server (guild) with the bot invited
- These channels must exist (or the bot silently skips them):

| Channel name / purpose | ID in bot.js |
|------------------------|--------------|
| General logs | `1515602211319713853` |
| Coinflip logs | `1523289034632200192` |
| Dice logs | `1523288922367590460` |
| Jackpot logs | `1523289179876884612` |
| Giveaway logs | `1522616966521688196` |
| Taxed items log | `1523482408467300513` |
| Tips log | `1523358826793926806` |
| Support panel | `1521084432688222208` |

- Bot requires these **Privileged Gateway Intents** (enable in Discord Developer Portal):
  - `GUILDS`
  - `GUILD_MESSAGES`
  - `GUILD_MEMBERS`
  - `MESSAGE_CONTENT`

---

## Quick-start checklist

- [ ] `npm install` done
- [ ] Bot token pasted into `bot.js` line 4 (or set `DISCORD_BOT_TOKEN` env var)
- [ ] MongoDB URI pasted into `bot.js` line 5 (or set `MONGODB_URI` env var)
- [ ] Bot invited to your Discord server with slash command permissions
- [ ] Privileged intents enabled in Developer Portal
- [ ] Run: `node run-bot.js`
