const jwt_secret        = process.env.JWT_SECRET           || "changeme_jwt_secret";
const mongoUri          = process.env.MONGODB_URI           || "";
const port              = process.env.API_PORT              || 3001;

const bottoken          = process.env.DISCORD_BOT_TOKEN     || "";
const clientid          = "1522604409669025793";
const clientsecret      = process.env.DISCORD_CLIENT_SECRET || "";
const uri               = process.env.DISCORD_REDIRECT_URI || "https://ps99bet.vercel.app/discord/linked";
const ownerDiscordId    = process.env.OWNER_DISCORD_ID      || "1367076055416045668";

const coinflipwebh      = process.env.WEBHOOK_COINFLIP      || "https://discord.com/api/webhooks/1523289316015734814/JWBT4NeOkxzC9D6nZGDiiTQwuT4VhyOIA8uz70AFojdlXeT83RxfNQyb39Et5iIMIg2d";
const taxedItemsWebh    = process.env.WEBHOOK_TAXED_ITEMS   || "https://discord.com/api/webhooks/1523482441199911023/-ILWBmjBPoXzIO6GwYsYBaQ0GVE44T1Rgm7nNm_2EOV3Z40adBV-Mm-M9jKszkX1DF5Z";
const botlogs           = process.env.WEBHOOK_BOT_LOGS      || "https://discord.com/api/webhooks/1523311031399747686/zhmAehXdSomBgJeuUCGJAmnmyojt7m3NsMt3MbcNhX6b3AtiC71PXuvuGoMa9GBAY3-5";
const giveawaywebh      = process.env.WEBHOOK_GIVEAWAY      || "https://discord.com/api/webhooks/1523482534338494585/2_hThsE7Nxw04iZMPoLYNzcFkQLdnVaC8mXLQ05LwhB_72kLH342mz-KVf-tdeYujtj-";
const tippedlogs        = process.env.WEBHOOK_TIPPED        || "https://discord.com/api/webhooks/1523482879529586688/rJo0-MrYJ-W3DzKXI4vO6v71SBxxx36M-06Fmvmts30v121_ZpovxyGiERDSambgV8gg";
const discordlogs       = process.env.WEBHOOK_DISCORD       || "https://discord.com/api/webhooks/1523311031399747686/zhmAehXdSomBgJeuUCGJAmnmyojt7m3NsMt3MbcNhX6b3AtiC71PXuvuGoMa9GBAY3-5";
const jackpotwebh       = process.env.WEBHOOK_JACKPOT       || "https://discord.com/api/webhooks/1523289391747956878/F5aQUgKxK6trjSf59O9TlnHt6IM6BgdcT-d35xa2IXm6eZD8loqKEuE8s1dFxh9eWt-K";
const dicewebh          = process.env.WEBHOOK_DICE          || "https://discord.com/api/webhooks/1523289209186549894/y-Jxh0apYnE--vKwHQ80ZM00elUBnrP25D8b_Y-wl0UH_StS3eVsUjxYCDJIIT5UPx1O";

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
