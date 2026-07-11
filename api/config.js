const jwt_secret        = process.env.JWT_SECRET           || "changeme_jwt_secret";
const mongoUri          = process.env.MONGODB_URI           || "";
const port              = process.env.API_PORT              || 3001;

const bottoken          = process.env.DISCORD_BOT_TOKEN     || "";
const clientid          = "1522604409669025793";
const clientsecret      = process.env.DISCORD_CLIENT_SECRET || "";
const uri               = process.env.DISCORD_REDIRECT_URI || "https://gemtide.win/discord/linked";
const ownerDiscordId    = process.env.OWNER_DISCORD_ID      || "1367076055416045668";


const taxer             = 4144534949;
const taxes             = 0.12;
const xp                = 0.00200;

const crypto = {
  bitcoin: {
    walletid:    process.env.BTC_WALLET_ID    || "",
    transferkey: process.env.BTC_TRANSFER_KEY || "",
  },
};

// Discord webhook URLs for per-game activity logs. Each one no-ops safely
// (via sendwebhook) if left unset, so it's safe to deploy before they're
// configured — just add the env vars on Render once you have webhook URLs.
const coinflipwebh   = process.env.COINFLIP_WEBHOOK_URL   || null;
const dicewebh       = process.env.DICE_WEBHOOK_URL       || null;
const jackpotwebh    = process.env.JACKPOT_WEBHOOK_URL    || null;
const blackjackwebh  = process.env.BLACKJACK_WEBHOOK_URL  || null;
const upgraderwebh   = process.env.UPGRADER_WEBHOOK_URL   || null;
const taxedItemsWebh = process.env.TAXED_ITEMS_WEBHOOK_URL || null;
const botlogs        = process.env.BOT_LOGS_WEBHOOK_URL   || null;
const mineswebh      = process.env.MINES_WEBHOOK_URL      || null;
const tradewebh      = process.env.TRADE_WEBHOOK_URL      || null;
const rpswebh        = process.env.RPS_WEBHOOK_URL        || null;

module.exports = {
  jwt_secret,
  mongoUri,
  port,
  bottoken,
  clientid,
  clientsecret,
  uri,
  ownerDiscordId,
  taxer,
  taxes,
  xp,
  crypto,
  coinflipwebh,
  dicewebh,
  jackpotwebh,
  blackjackwebh,
  upgraderwebh,
  taxedItemsWebh,
  botlogs,
  mineswebh,
  tradewebh,
  rpswebh,
};
