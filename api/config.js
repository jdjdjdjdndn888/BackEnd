const jwt_secret        = process.env.JWT_SECRET           || "changeme_jwt_secret";
const mongoUri          = process.env.MONGODB_URI           || "";
const port              = process.env.API_PORT              || 3001;

const bottoken          = process.env.DISCORD_BOT_TOKEN     || "";
const clientid          = "1522604409669025793";
const clientsecret      = process.env.DISCORD_CLIENT_SECRET || "";
const uri               = process.env.DISCORD_REDIRECT_URI || "https://ps99bet.vercel.app/discord/linked";
const ownerDiscordId    = process.env.OWNER_DISCORD_ID      || "1367076055416045668";


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
  taxer,
  taxes,
  xp,
  crypto,
};
