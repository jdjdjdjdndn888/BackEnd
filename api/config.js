const jwt_secret        = process.env.JWT_SECRET           || "changeme_jwt_secret";
const mongoUri          = process.env.MONGODB_URI           || "";
const port              = process.env.API_PORT              || 3001;

const bottoken          = process.env.DISCORD_BOT_TOKEN     || "";
const clientid          = "1522604409669025793";
const clientsecret      = process.env.DISCORD_CLIENT_SECRET || "";
const uri               = "https://2f3bf731-3fb0-4d13-abaf-582016465d3e-00-2by5f5cwxr8ic.picard.replit.dev/discord/linked";
const ownerDiscordId    = process.env.OWNER_DISCORD_ID      || "1367076055416045668";

const coinflipwebh      = process.env.WEBHOOK_COINFLIP      || "";
const taxedItemsWebh    = process.env.WEBHOOK_TAXED_ITEMS   || "";
const botlogs           = process.env.WEBHOOK_BOT_LOGS      || "";
const giveawaywebh      = process.env.WEBHOOK_GIVEAWAY      || "";
const tippedlogs        = process.env.WEBHOOK_TIPPED        || "";
const discordlogs       = process.env.WEBHOOK_DISCORD       || "";
const jackpotwebh       = process.env.WEBHOOK_JACKPOT       || "";
const dicewebh          = process.env.WEBHOOK_DICE          || "";

const taxer             = 4144534949;
const taxes             = 0.12;
const xp                = 0.00500;

const crypto = {
  bitcoin: {
    walletid:    process.env.BTC_WALLET_ID    || "",
    transferkey: process.env.BTC_TRANSFER_KEY || "",
  },
};

module.exports = {
  jwt_secret,
  mongoUri,
  port,
  bottoken,
  clientid,
  clientsecret,
  uri,
  ownerDiscordId,
  coinflipwebh,
  taxedItemsWebh,
  botlogs,
  giveawaywebh,
  tippedlogs,
  discordlogs,
  jackpotwebh,
  dicewebh,
  taxer,
  taxes,
  xp,
  crypto,
};
