const asyncHandler = require("express-async-handler");
const users         = require("../../modules/users.js");
const inventorys    = require("../../modules/inventorys.js");
const items         = require("../../modules/items.js");
const affiliateCodes = require("../../modules/affiliatecodes.js");
const affiliateUses  = require("../../modules/affiliateuses.js");
const { OWNER_TIER } = require("../../utils/rankTiers.js");
const { logAction }  = require("../../utils/logaction.js");
const { checkVpnOrProxy, getClientIp } = require("../../utils/ipcheck.js");

// ── Constants ──────────────────────────────────────────────────────────────────
const DEPOSIT_REQUIREMENT = 10_000_000;   // referee must deposit ≥ 10 M gems
const WAGER_REQUIREMENT   = 30_000_000;   // referee must wager  ≥ 30 M gems
const REWARD_VALUE        = 100_000_000;  // code owner earns 100 M gems

// Codes nobody (except owners for GEMTIDE) can set
const GLOBALLY_FORBIDDEN = ["free", "gimme", "gems"];
const OWNER_ONLY_CODES   = ["gemtide"];

// Seed / find the 100 M gem item — used when paying out rewards
const GEM_IMAGE = "https://cdn.discordapp.com/attachments/1522618058265460756/1522857070339293284/pet-simulator-99-gems.png";
async function get100MGemItem() {
  let item = await items.findOne({ itemid: 9000100 });
  if (!item) {
    item = await items.create({
      itemid: 9000100, itemname: "100m gems",
      itemvalue: 100_000_000, itemimage: GEM_IMAGE, game: "PS99",
    });
  }
  return item;
}

// ── Code validation helper ─────────────────────────────────────────────────────
function validateCode(code, userRank) {
  if (!code || typeof code !== "string") return "Code is required.";
  const trimmed = code.trim();
  if (trimmed.length < 3)  return "Code must be at least 3 characters.";
  if (trimmed.length > 20) return "Code must be 20 characters or fewer.";
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return "Code may only contain letters, numbers, and underscores.";

  const lower = trimmed.toLowerCase();

  // Fully blocked for everyone
  if (GLOBALLY_FORBIDDEN.includes(lower)) return `"${trimmed}" is not allowed as a code.`;

  // Owner-only reserved words
  if (OWNER_ONLY_CODES.includes(lower) && !OWNER_TIER.includes(userRank)) {
    return `"${trimmed}" is reserved for site owners only.`;
  }

  return null; // OK
}

// ── SET MY CODE ───────────────────────────────────────────────────────────────
exports.setCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userid   = Number(req.user.id);

  const user = await users.findOne({ userid });
  if (!user) return res.status(404).json({ message: "User not found." });

  const err = validateCode(code, user.rank);
  if (err) return res.status(400).json({ message: err });

  const trimmed = code.trim();

  // Make sure nobody else owns this code
  const existing = await affiliateCodes.findOne({
    code: { $regex: new RegExp(`^${trimmed}$`, "i") },
  });
  if (existing && existing.ownerid !== userid) {
    return res.status(409).json({ message: "That code is already taken." });
  }

  await affiliateCodes.findOneAndUpdate(
    { ownerid: userid },
    { ownerid: userid, ownerusername: user.username, code: trimmed },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return res.status(200).json({ message: `Affiliate code set to "${trimmed}".`, code: trimmed });
});

// ── USE SOMEONE'S CODE ────────────────────────────────────────────────────────
exports.useCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userid   = Number(req.user.id);

  if (!code) return res.status(400).json({ message: "Code is required." });

  // ── 1. Get real client IP ──────────────────────────────────────────────────
  const clientIp = getClientIp(req);

  // ── 2. VPN / proxy check ──────────────────────────────────────────────────
  const vpnResult = await checkVpnOrProxy(clientIp);
  if (vpnResult.isVpn) {
    return res.status(403).json({
      message: `VPN and proxy connections are not allowed when using affiliate codes. Please disable your VPN/proxy and try again.`,
    });
  }

  // ── 3. Alt-account check (same IP already used a code) ───────────────────
  // If this IP has been used by a *different* account to enter a code, block it.
  if (clientIp && clientIp !== "unknown") {
    const ipConflict = await affiliateUses.findOne({
      ipaddress: clientIp,
      userid: { $ne: userid },
    }).lean();

    if (ipConflict) {
      return res.status(403).json({
        message: "This IP address has already been used to enter an affiliate code on another account. Alt accounts are not allowed.",
      });
    }
  }

  // ── 4. Can't already have used a code ─────────────────────────────────────
  const alreadyUsed = await affiliateUses.findOne({ userid });
  if (alreadyUsed) {
    return res.status(409).json({ message: `You have already used code "${alreadyUsed.code}".` });
  }

  // ── 5. Find the code ──────────────────────────────────────────────────────
  const codeDoc = await affiliateCodes.findOne({
    code: { $regex: new RegExp(`^${code.trim()}$`, "i") },
  });
  if (!codeDoc) return res.status(404).json({ message: "Code not found." });

  // ── 6. Can't use your own code ────────────────────────────────────────────
  if (codeDoc.ownerid === userid) {
    return res.status(400).json({ message: "You cannot use your own affiliate code." });
  }

  const user = await users.findOne({ userid });
  if (!user) return res.status(404).json({ message: "User not found." });

  // ── 7. Record the use with progress snapshots + IP ───────────────────────
  await affiliateUses.create({
    codeownerid:       codeDoc.ownerid,
    codeownerusername: codeDoc.ownerusername,
    code:              codeDoc.code,
    userid,
    username:          user.username,
    depositatuse:      user.deposited || 0,
    wageratuse:        user.wager     || 0,
    ipaddress:         clientIp,
  });

  // Bump use counter
  await affiliateCodes.updateOne({ _id: codeDoc._id }, { $inc: { uses: 1 } });

  return res.status(200).json({
    message: `Code "${codeDoc.code}" applied! Deposit 10M gems and wager 30M gems to reward ${codeDoc.ownerusername}.`,
  });
});

// ── GET MY AFFILIATE DATA (code owner view) ───────────────────────────────────
exports.getMyAffiliate = asyncHandler(async (req, res) => {
  const userid = Number(req.user.id);

  const codeDoc = await affiliateCodes.findOne({ ownerid: userid }).lean();

  // All uses of this user's code
  const useRecords = codeDoc
    ? await affiliateUses.find({ codeownerid: userid }).lean()
    : [];

  // Enrich with live progress
  const enriched = await Promise.all(
    useRecords.map(async (use) => {
      const referee = await users.findOne({ userid: use.userid }, { deposited: 1, wager: 1 }).lean();
      const depositProgress = Math.max(0, (referee?.deposited || 0) - use.depositatuse);
      const wagerProgress   = Math.max(0, (referee?.wager     || 0) - use.wageratuse);
      const depositMet = depositProgress >= DEPOSIT_REQUIREMENT;
      const wagerMet   = wagerProgress   >= WAGER_REQUIREMENT;
      return {
        _id:           use._id,
        userid:        use.userid,
        username:      use.username,
        depositProgress,
        wagerProgress,
        depositMet,
        wagerMet,
        claimable:     depositMet && wagerMet && !use.claimed,
        claimed:       use.claimed,
        createdat:     use.createdat,
      };
    })
  );

  // What code the viewer is using (if any)
  const usedRecord = await affiliateUses.findOne({ userid }).lean();

  return res.status(200).json({
    myCode:   codeDoc ? codeDoc.code : null,
    uses:     enriched,
    usedCode: usedRecord ? usedRecord.code : null,
    totals: {
      claimable: enriched.filter((u) => u.claimable).length,
      claimed:   enriched.filter((u) => u.claimed).length,
      pending:   enriched.filter((u) => !u.claimable && !u.claimed).length,
    },
    requirements: { deposit: DEPOSIT_REQUIREMENT, wager: WAGER_REQUIREMENT, reward: REWARD_VALUE },
  });
});

// ── CLAIM REWARD ──────────────────────────────────────────────────────────────
exports.claimReward = asyncHandler(async (req, res) => {
  const { useid } = req.body; // AffiliateUse _id to claim
  const userid    = Number(req.user.id);

  if (!useid) return res.status(400).json({ message: "useid is required." });

  const useRecord = await affiliateUses.findOne({ _id: useid, codeownerid: userid });
  if (!useRecord) return res.status(404).json({ message: "Record not found." });
  if (useRecord.claimed) return res.status(409).json({ message: "Already claimed." });

  // Re-check live progress
  const referee = await users.findOne({ userid: useRecord.userid }, { deposited: 1, wager: 1 }).lean();
  const depositProgress = Math.max(0, (referee?.deposited || 0) - useRecord.depositatuse);
  const wagerProgress   = Math.max(0, (referee?.wager     || 0) - useRecord.wageratuse);

  if (depositProgress < DEPOSIT_REQUIREMENT) {
    return res.status(400).json({
      message: `${useRecord.username} has only deposited ${(depositProgress / 1e6).toFixed(1)}M / 10M gems.`,
    });
  }
  if (wagerProgress < WAGER_REQUIREMENT) {
    return res.status(400).json({
      message: `${useRecord.username} has only wagered ${(wagerProgress / 1e6).toFixed(1)}M / 30M gems.`,
    });
  }

  // Mark claimed first to prevent double-claims
  const updated = await affiliateUses.findOneAndUpdate(
    { _id: useid, claimed: false },
    { $set: { claimed: true } },
    { new: true },
  );
  if (!updated) return res.status(409).json({ message: "Already claimed." });

  // Pay out 100 M gems
  const gemItem = await get100MGemItem();
  await inventorys.create({ owner: userid, itemid: gemItem.itemid, locked: false });

  await logAction({
    type:        "AFFILIATE_CLAIM",
    performedby: userid,
    target:      useRecord.userid,
    details:     `${useRecord.username} triggered 100M gem reward for code owner (userid ${userid})`,
  }).catch(() => {});

  return res.status(200).json({ message: `Claimed 100M gems! ${useRecord.username} met both requirements.` });
});

// ── ADMIN: list all codes ─────────────────────────────────────────────────────
exports.adminGetCodes = asyncHandler(async (req, res) => {
  const codes = await affiliateCodes.find().sort({ uses: -1 }).lean();
  const enriched = await Promise.all(
    codes.map(async (c) => {
      const useDocs = await affiliateUses.find({ codeownerid: c.ownerid }).lean();
      const claimed   = useDocs.filter((u) => u.claimed).length;
      const unclaimed = useDocs.length - claimed;
      return { ...c, uses: useDocs.length, claimed, unclaimed };
    })
  );
  return res.status(200).json({ data: enriched });
});

// ── ADMIN: set a user's affiliate code ───────────────────────────────────────
exports.adminSetCode = asyncHandler(async (req, res) => {
  const { userid, code } = req.body;
  const targetId = Number(userid);
  if (!targetId || !code) return res.status(400).json({ message: "userid and code are required." });

  const user = await users.findOne({ userid: targetId });
  if (!user) return res.status(404).json({ message: "User not found." });

  // Owners bypass forbidden-word check when setting for another user
  const err = validateCode(code, req.adminUser.rank);
  if (err) return res.status(400).json({ message: err });

  const trimmed = code.trim();
  const conflict = await affiliateCodes.findOne({
    code: { $regex: new RegExp(`^${trimmed}$`, "i") },
    ownerid: { $ne: targetId },
  });
  if (conflict) return res.status(409).json({ message: "Code already taken by another user." });

  await affiliateCodes.findOneAndUpdate(
    { ownerid: targetId },
    { ownerid: targetId, ownerusername: user.username, code: trimmed },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await logAction({
    type:        "ADMIN_AFFILIATE_SETCODE",
    performedby: req.adminUser.userid,
    target:      targetId,
    details:     `Set affiliate code "${trimmed}" for ${user.username}`,
  }).catch(() => {});

  return res.status(200).json({ message: `Code "${trimmed}" set for ${user.username}.` });
});

// ── ADMIN: remove a user's affiliate code ────────────────────────────────────
exports.adminRemoveCode = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.userid);
  if (!targetId) return res.status(400).json({ message: "userid is required." });

  const deleted = await affiliateCodes.findOneAndDelete({ ownerid: targetId });
  if (!deleted) return res.status(404).json({ message: "No code found for that user." });

  await logAction({
    type:        "ADMIN_AFFILIATE_REMOVECODE",
    performedby: req.adminUser.userid,
    target:      targetId,
    details:     `Removed affiliate code "${deleted.code}"`,
  }).catch(() => {});

  return res.status(200).json({ message: `Code "${deleted.code}" removed.` });
});
