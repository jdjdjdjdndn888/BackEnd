const express = require("express");
const os = require("os");
const router = express.Router();
const accountController = require("../controllers/account/index.js");
const chatController = require("../controllers/chat/index.js");
const coinflipController = require("../controllers/coinflip/index.js");
const bothandler = require("../controllers/bot/index.js");
const giveawayController = require("../controllers/giveaway/index.js");
const gamesController = require("../controllers/games/index.js");
const jackpotController = require("../controllers/jackpot/index.js");
const adminController = require("../controllers/admin/index.js");
const tradesController = require("../controllers/trades/index.js");
const diceController = require("../controllers/dice/index.js");
const blackjackController = require("../controllers/blackjack/index.js");
const upgraderController = require("../controllers/upgrader/index.js");
const minesController = require("../controllers/mines/index.js");
const rpsController     = require("../controllers/rps/index.js");
const supportController   = require("../controllers/support/index.js");
const casesController     = require("../controllers/cases/index.js");
const affiliateController = require("../controllers/affiliate/index.js");
const {
  authLimiter,
  mutationLimiter,
  sensitiveLimiter,
  adminLimiter,
} = require("../middleware/security");

router.use(express.json());

router.get("/", (req, res) => res.status(403).json({ message: "Forbidden" }));

// ── Health / ping ─────────────────────────────────────────────────────────────
// Protected by the global originGuard — only approved site origin or Roblox bot
// scripts with Bearer JWT can reach this. Direct browser/curl hits get 403.
router.get("/ping", (req, res) => {
  const start = req.startTime || Date.now();
  const pingMs = Date.now() - start;
  const cpuCores = os.cpus().length;
  res.json({
    success: true,
    message: "sucessfuly pinged the spiney api.",
    data: {
      ping: `${pingMs}ms`,
      uptime: `${process.uptime()} seconds`,
      systemUptime: `${os.uptime()} seconds`,
      cpuCores: `${cpuCores} core${cpuCores !== 1 ? "s" : ""}`,
      loadAverage: os.loadavg(),
      timestamp: new Date().toISOString(),
    },
  });
});

router.post("/me", accountController.verifyToken, accountController.me);
router.post("/users/profile", accountController.profile);
router.post("/login", authLimiter, accountController.login);
router.post("/me/inventory", accountController.verifyToken, accountController.inventory);
router.post("/me/withdraw", sensitiveLimiter, accountController.verifyToken, accountController.withdraw);
router.post("/me/discord", accountController.verifyToken, accountController.linkdiscord);
router.post("/me/discord/unlink", accountController.verifyToken, accountController.unlinkdiscord);

router.post("/users/tip", sensitiveLimiter, accountController.verifyToken, accountController.tip);
router.get("/users/leaderboard", accountController.getleaderboard);

// ── User lookup endpoints (bot scripts + trading system) ──────────────────────
// Protected: requires bot API key (Authorization header = jwt_secret)
router.get("/users/lookup",          bothandler.real, accountController.lookup);
router.post("/users/lookup",         bothandler.real, accountController.lookup);
router.get("/user/lookup",           bothandler.real, accountController.lookup);
router.post("/user/lookup",          bothandler.real, accountController.lookup);
router.get("/trading/users/lookup",  bothandler.real, accountController.lookup);
router.post("/trading/users/lookup", bothandler.real, accountController.lookup);
router.get("/discord/lookup",        bothandler.real, accountController.lookup);
router.post("/discord/lookup",       bothandler.real, accountController.lookup);

router.post("/items/all", bothandler.GetSupported);
router.get("/items/all", bothandler.GetSupported);
router.get("/trading/items/all", bothandler.GetSupported);
router.post("/trading/items/all", bothandler.GetSupported);

router.post("/chat/send", accountController.verifyToken, (req, res, next) => {
  const io = req.app.get('io');
  chatController.sendchat(req, res, next, io);
});
router.post("/chat/latest", chatController.latestmessages);
router.post("/chat/dropclaim", accountController.verifyToken, (req, res, next) => {
  const io = req.app.get('io');
  chatController.claimdrop(req, res, next, io);
});

router.get("/coinflips/flips", coinflipController.getcoinflips);
router.post("/coinflips/create", mutationLimiter, accountController.verifyToken, coinflipController.creatematch);
router.post("/coinflips/join", mutationLimiter, accountController.verifyToken, coinflipController.joinmatch);
router.post("/coinflips/cancel", mutationLimiter, accountController.verifyToken, coinflipController.cancelcoinflip);
router.post("/coinflips/history/me", accountController.verifyToken, coinflipController.historyme);

router.get("/rps/matches", rpsController.getmatches);
router.post("/rps/create", mutationLimiter, accountController.verifyToken, rpsController.creatematch);
router.post("/rps/join", mutationLimiter, accountController.verifyToken, rpsController.joinmatch);
router.post("/rps/cancel", mutationLimiter, accountController.verifyToken, rpsController.cancelmatch);
router.post("/rps/history/me", accountController.verifyToken, rpsController.historyme);

router.post("/withdraw/method", bothandler.real, bothandler.Getmethod);
router.post("/withdraw/withdrawed", bothandler.real, bothandler.withdrawed);

router.post("/deposit/deposit", bothandler.real, bothandler.Deposit);

router.post("/trading/items/check-pending", bothandler.realBody, bothandler.checkPending);
router.post("/trading/items/confirm-ps99-deposit", bothandler.real, bothandler.Deposit);
router.post("/trading/items/confirm-withdraw", bothandler.real, bothandler.confirmWithdrawAll);

router.post("/bots/:game", accountController.verifyToken, bothandler.bots);

router.get("/giveaways/latest", giveawayController.getgiveaways);
router.post("/giveaways/create", mutationLimiter, accountController.verifyToken, giveawayController.giveaway);
router.post("/giveaways/join", mutationLimiter, accountController.verifyToken, giveawayController.joingiveaway);

router.get("/stats/all", gamesController.getvalue);

router.get("/jackpot", jackpotController.get_jackpot);
router.post("/jackpot/join", mutationLimiter, accountController.verifyToken, jackpotController.join_jackpot);

router.get("/dice/games", diceController.getdice);
router.post("/dice/create", mutationLimiter, accountController.verifyToken, diceController.creatematch);
router.post("/dice/join", mutationLimiter, accountController.verifyToken, diceController.joinmatch);
router.post("/dice/cancel", mutationLimiter, accountController.verifyToken, diceController.cancelmatch);
router.post("/dice/history/me", accountController.verifyToken, diceController.historyme);

router.get("/upgrader/items", upgraderController.getItems);
router.post("/upgrader/upgrade", mutationLimiter, accountController.verifyToken, upgraderController.upgrade);
router.get("/upgrader/history/me", accountController.verifyToken, upgraderController.history);

router.get("/blackjack/games", blackjackController.getgames);
router.post("/blackjack/create", mutationLimiter, accountController.verifyToken, blackjackController.creatematch);
router.post("/blackjack/join", mutationLimiter, accountController.verifyToken, blackjackController.joinmatch);
router.post("/blackjack/hit", mutationLimiter, accountController.verifyToken, blackjackController.hit);
router.post("/blackjack/stand", mutationLimiter, accountController.verifyToken, blackjackController.stand);
router.post("/blackjack/cancel", mutationLimiter, accountController.verifyToken, blackjackController.cancelmatch);
router.post("/blackjack/history/me", accountController.verifyToken, blackjackController.historyme);

router.get("/stats/all", gamesController.getvalue);

router.get("/mines/games", minesController.getgames);
router.post("/mines/create", mutationLimiter, accountController.verifyToken, minesController.creatematch);
router.post("/mines/join", mutationLimiter, accountController.verifyToken, minesController.joinmatch);
router.post("/mines/reveal", mutationLimiter, accountController.verifyToken, minesController.revealtile);
router.post("/mines/cancel", mutationLimiter, accountController.verifyToken, minesController.cancelmatch);
router.post("/mines/history/me", accountController.verifyToken, minesController.historyme);

router.use("/admin", adminLimiter);

router.get("/admin/stats", accountController.verifyToken, adminController.isAdmin, adminController.stats);
router.get("/admin/users", accountController.verifyToken, adminController.isAdmin, adminController.getUsers);
router.post("/admin/ban", accountController.verifyToken, adminController.isAdmin, adminController.banUser);
router.post("/admin/setrank", accountController.verifyToken, adminController.isAdmin, adminController.setRank);
router.get("/admin/items", accountController.verifyToken, adminController.isAdmin, adminController.listItems);
router.post("/admin/items/create", accountController.verifyToken, adminController.isAdmin, adminController.createItem);
router.put("/admin/items/:itemid", accountController.verifyToken, adminController.isAdmin, adminController.updateItem);
router.delete("/admin/items/:itemid", accountController.verifyToken, adminController.isAdmin, adminController.deleteItem);
router.post("/admin/items/give", accountController.verifyToken, adminController.isAdmin, adminController.giveItem);
router.post("/admin/items/:itemid/fetchimage", accountController.verifyToken, adminController.isAdmin, adminController.fetchItemImage);
router.get("/trades", tradesController.getListings);
router.get("/trades/mine", accountController.verifyToken, tradesController.getMyListings);
router.post("/trades/create", mutationLimiter, accountController.verifyToken, tradesController.createListing);
router.post("/trades/cancel", mutationLimiter, accountController.verifyToken, tradesController.cancelListing);
router.post("/trades/request", mutationLimiter, accountController.verifyToken, tradesController.sendRequest);
router.post("/trades/respond", mutationLimiter, accountController.verifyToken, tradesController.respondRequest);
router.post("/trades/request/cancel", mutationLimiter, accountController.verifyToken, tradesController.cancelRequest);

router.get("/admin/bots", accountController.verifyToken, adminController.isAdmin, adminController.getBots);
router.post("/admin/bots/toggle", accountController.verifyToken, adminController.isAdmin, adminController.toggleBot);
router.post("/admin/bots/create", accountController.verifyToken, adminController.isAdmin, adminController.createBot);
router.post("/admin/bots/delete", accountController.verifyToken, adminController.isAdmin, adminController.deleteBot);
router.post("/admin/notify", accountController.verifyToken, adminController.isAdmin, adminController.notify);
router.post("/bot-announce", adminController.botAnnounce);
router.post("/admin/reset", accountController.verifyToken, adminController.isAdmin, adminController.resetDB);
router.post("/admin/reset-balances", accountController.verifyToken, adminController.isAdmin, adminController.resetBalances);
router.get("/admin/user-inventory/:userid", accountController.verifyToken, adminController.isAdmin, adminController.getUserInventory);
router.post("/admin/user-inventory/delete", accountController.verifyToken, adminController.isAdmin, adminController.deleteUserInventoryItems);
router.post("/admin/user-inventory/transfer", accountController.verifyToken, adminController.isAdmin, adminController.transferInventoryItems);
router.post("/admin/scrape", accountController.verifyToken, adminController.isAdmin, adminController.scrapeItems);
router.get("/admin/withdrawals", accountController.verifyToken, adminController.isAdmin, adminController.getWithdrawals);
router.delete("/admin/withdrawals/:id", accountController.verifyToken, adminController.isAdmin, adminController.deleteWithdrawal);
router.post("/admin/withdrawals/delete-all", accountController.verifyToken, adminController.isAdmin, adminController.deleteAllWithdrawals);
router.post("/admin/cancel-all-bets", accountController.verifyToken, adminController.isAdmin, adminController.cancelAllBets);
router.post("/admin/reset-inventories", accountController.verifyToken, adminController.isAdmin, adminController.resetAllInventories);
router.get("/admin/logs", accountController.verifyToken, adminController.isAdmin, adminController.getAuditLogs);
router.get("/admin/giveaways", accountController.verifyToken, adminController.isAdmin, adminController.adminGetGiveaways);
router.post("/admin/giveaways/cancel", accountController.verifyToken, adminController.isOwnerTier, adminController.adminCancelGiveaway);
router.post("/admin/giveaways/create", accountController.verifyToken, adminController.isOwnerTier, adminController.adminCreateGiveaway);

// ── Affiliate ─────────────────────────────────────────────────────────────────
router.get("/affiliate/mine",   accountController.verifyToken, affiliateController.getMyAffiliate);
router.post("/affiliate/setcode", mutationLimiter, accountController.verifyToken, affiliateController.setCode);
router.post("/affiliate/usecode", mutationLimiter, accountController.verifyToken, affiliateController.useCode);
router.post("/affiliate/claim",   mutationLimiter, accountController.verifyToken, affiliateController.claimReward);

// ── Admin Affiliates ──────────────────────────────────────────────────────────
router.get("/admin/affiliates",            accountController.verifyToken, adminController.isAdmin, affiliateController.adminGetCodes);
router.post("/admin/affiliates/setcode",   accountController.verifyToken, adminController.isAdmin, adminController.isOwnerTier, affiliateController.adminSetCode);
router.delete("/admin/affiliates/:userid", accountController.verifyToken, adminController.isAdmin, adminController.isOwnerTier, affiliateController.adminRemoveCode);

// Webhook test endpoint — POST /debug/webhooks with body { authKey: "<jwt_secret>" }
router.post("/debug/webhooks", bothandler.realBody, async (req, res) => {
  const { sendwebhook } = require("../controllers/transaction/index.js");
  const cfg = require("../config.js");
  const targets = {
    coinflip:   cfg.coinflipwebh,
    taxedItems: cfg.taxedItemsWebh,
    botlogs:    cfg.botlogs,
    jackpot:    cfg.jackpotwebh,
    dice:       cfg.dicewebh,
    blackjack:  cfg.blackjackwebh,
  };
  const results = {};
  for (const [name, url] of Object.entries(targets)) {
    const r = await sendwebhook(url, `🔧 Webhook Test — ${name}`, `Test fired at ${new Date().toISOString()}`, [], null);
    results[name] = { url: url?.slice(0, 60) + "...", ...r };
  }
  res.json(results);
});

// Seed gem denomination items if they don't exist yet — bot-auth required
router.get("/__seed-gems", bothandler.real, async (req, res) => {
  const items = require("../modules/items.js");
  const GEM_IMAGE = "https://cdn.discordapp.com/attachments/1522618058265460756/1522857070339293284/pet-simulator-99-gems.png?ex=6a49feaa&is=6a48ad2a&hm=7151b70be01d2a47bbe9063bf6c5e1d9067668dc79aecdee8556c81d135bff3e&";
  const GEM_ITEMS = [
    { itemid: 9000001, itemname: "1m gems",   itemvalue: 1_000_000,   itemimage: GEM_IMAGE, game: "PS99" },
    { itemid: 9000005, itemname: "5m gems",   itemvalue: 5_000_000,   itemimage: GEM_IMAGE, game: "PS99" },
    { itemid: 9000010, itemname: "10m gems",  itemvalue: 10_000_000,  itemimage: GEM_IMAGE, game: "PS99" },
    { itemid: 9000025, itemname: "25m gems",  itemvalue: 25_000_000,  itemimage: GEM_IMAGE, game: "PS99" },
    { itemid: 9000050, itemname: "50m gems",  itemvalue: 50_000_000,  itemimage: GEM_IMAGE, game: "PS99" },
    { itemid: 9000100, itemname: "100m gems", itemvalue: 100_000_000, itemimage: GEM_IMAGE, game: "PS99" },
  ];
  const results = [];
  for (const gem of GEM_ITEMS) {
    const existing = await items.findOne({ itemname: gem.itemname });
    if (existing) {
      results.push({ name: gem.itemname, status: "skipped" });
    } else {
      await items.create(gem);
      results.push({ name: gem.itemname, status: "created" });
    }
  }
  res.json({ ok: true, results });
});

// ── Cases ─────────────────────────────────────────────────────────────────────
router.get("/cases",                   casesController.getCases);
router.get("/cases/history",           casesController.getHistory);
router.get("/cases/history/me",        accountController.verifyToken, casesController.getMyHistory);
router.get("/cases/:id",               casesController.getCase);
router.post("/cases/:id/open",         mutationLimiter, accountController.verifyToken, casesController.openCase);

// Admin cases management
router.get("/admin/cases",             accountController.verifyToken, adminController.isAdmin, casesController.adminGetCases);
router.post("/admin/cases",            accountController.verifyToken, adminController.isAdmin, casesController.adminCreateCase);
router.put("/admin/cases/:id",         accountController.verifyToken, adminController.isAdmin, casesController.adminUpdateCase);
router.delete("/admin/cases/:id",      accountController.verifyToken, adminController.isAdmin, casesController.adminDeleteCase);

// ── Support Tickets ───────────────────────────────────────────────────────────
router.post("/support/tickets",                accountController.verifyToken, supportController.createTicket);
router.get("/support/tickets",                 accountController.verifyToken, supportController.getTickets);
router.get("/support/tickets/:id",             accountController.verifyToken, supportController.getTicket);
router.post("/support/tickets/:id/message",    accountController.verifyToken, supportController.sendMessage);
router.post("/support/tickets/:id/close",      accountController.verifyToken, supportController.closeTicket);

router.all("*", (req, res) => {
  const rayId = req.headers['cf-ray'] || 'Unavailable';
  res.status(404).json({
    success: false,
    message: `ERROR: NO ROUTER FOUND, RAY ID: ${rayId}`,
  });
});

module.exports = router;