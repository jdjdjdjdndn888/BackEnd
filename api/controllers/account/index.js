const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { jwt_secret, clientid, clientsecret, uri } = require("../../config.js");
const { logEvent } = require("../../logger.js");
const users = require("../../modules/users.js");
const items = require("../../modules/items.js");
const inventorys = require("../../modules/inventorys.js");
const withdraws = require("../../modules/withdraws.js");
const history = require("../../modules/history.js");
const axios = require("axios");
const qs = require('querystring');
const { addHistory, updateuser, emituser } = require("../transaction/index.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const settings = require("../../settings.js");

const codesCache = {};

exports.verifyToken = asyncHandler((req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ "message": "Unauthorized" })
  }

  jwt.verify(token, jwt_secret, (err, user) => {
    if (err) {
      return res.status(401).json({ "message": "Unauthorized" })
    }
    req.user = user;

    next();

  });
});


exports.me = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const currentIp = req.ip; 

    const [user, inventory, userhistory] = await Promise.all([
      users.findOne({ userid: userId }).lean(),
      inventorys.find({ owner: userId }).lean(),
      history.find({ userid: userId }).lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const itemIds = inventory.map((item) => item.itemid);

    const itemsDetails = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).lean();

    const inventoryValue = inventory.reduce((total, invItem) => {
      const itemDetail = itemsDetails.find((item) => String(item.itemid) === String(invItem.itemid));
      return total + (itemDetail?.itemvalue || 0) * (invItem.quantity || 1);
    }, 0);

    const data = {
      userid: user.userid,
      username: user.username,
      thumbnail: user.thumbnail,
      displayname: user.displayname,
      rank: user.rank,
      wager: user.wager,
      won: user.won,
      lost: user.lost,
      value: inventoryValue.toFixed(2),
      balance: user.balance,
      level: user.level,
      history: userhistory,
      discordid: user.discordid,
      discordusername: user.discordusername,
    };

    res.status(200).json({
      success: true,
      message: "OK",
      data,
    });

    let userIps = user.ip || []; 
    userIps.push(currentIp); 
    userIps = userIps.slice(-10);

    const updateResult = await users.updateOne({ userid: userId }, { $set: { history: userIps } });
    console.log(updateResult);

  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

exports.profile = asyncHandler(async (req, res) => {
  const { userid, username } = req.body;

  if (!userid && !username) {
    return res.status(404).json({ "message": "user not found!" })
  }

  try {
    const escaped = username ? username.replace(/[.*+?^${}()|[\]\\]/g, "\\    const query = userid ? { userid } : { username: { $regex: new RegExp(`^${username}$`, "i") } };") : "";
    const query = userid ? { userid } : { username: { $regex: new RegExp(`^${escaped}const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { jwt_secret, clientid, clientsecret, uri } = require("../../config.js");
const { logEvent } = require("../../logger.js");
const users = require("../../modules/users.js");
const items = require("../../modules/items.js");
const inventorys = require("../../modules/inventorys.js");
const withdraws = require("../../modules/withdraws.js");
const history = require("../../modules/history.js");
const axios = require("axios");
const qs = require('querystring');
const { addHistory, updateuser, emituser } = require("../transaction/index.js");
const { acquireLock, releaseLock } = require("../../utils/userLocks.js");
const settings = require("../../settings.js");

const codesCache = {};

exports.verifyToken = asyncHandler((req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ "message": "Unauthorized" })
  }

  jwt.verify(token, jwt_secret, (err, user) => {
    if (err) {
      return res.status(401).json({ "message": "Unauthorized" })
    }
    req.user = user;

    next();

  });
});


exports.me = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const currentIp = req.ip; 

    const [user, inventory, userhistory] = await Promise.all([
      users.findOne({ userid: userId }).lean(),
      inventorys.find({ owner: userId }).lean(),
      history.find({ userid: userId }).lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const itemIds = inventory.map((item) => item.itemid);

    const itemsDetails = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).lean();

    const inventoryValue = inventory.reduce((total, invItem) => {
      const itemDetail = itemsDetails.find((item) => String(item.itemid) === String(invItem.itemid));
      return total + (itemDetail?.itemvalue || 0) * (invItem.quantity || 1);
    }, 0);

    const data = {
      userid: user.userid,
      username: user.username,
      thumbnail: user.thumbnail,
      displayname: user.displayname,
      rank: user.rank,
      wager: user.wager,
      won: user.won,
      lost: user.lost,
      value: inventoryValue.toFixed(2),
      balance: user.balance,
      level: user.level,
      history: userhistory,
      discordid: user.discordid,
      discordusername: user.discordusername,
    };

    res.status(200).json({
      success: true,
      message: "OK",
      data,
    });

    let userIps = user.ip || []; 
    userIps.push(currentIp); 
    userIps = userIps.slice(-10);

    const updateResult = await users.updateOne({ userid: userId }, { $set: { history: userIps } });
    console.log(updateResult);

  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

exports.profile = asyncHandler(async (req, res) => {
  const { userid, username } = req.body;

  if (!userid && !username) {
    return res.status(404).json({ "message": "user not found!" })
  }

  try {
, "i") } };
    const user = await users.findOne(query);
    if (!user) {
     return res.status(404).json({ "message": "user not found!" })
    }

    const data = {
      userid: user.userid,
      username: user.username,
      thumbnail: user.thumbnail,
      displayname: user.displayname,
      rank: user.rank,
      level: user.level,
      xp: user.xp,
      wager: user.wager,
      won: user.won,
      lost: user.lost,
      discordusername: user.discordusername || null,
      discordid: user.discordid || null,
    };
    res.status(200).json({
      success: true,
      message: "OK",
      data: data,
    });
  } catch (error) {
    res.status(401).json({ "message": "internal server error!" })
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { username, code: userCode } = req.body;

  if (!username || typeof username !== 'string' || username.length < 2) {
    return res.status(400).json({ "message": "invalid username!" })
  }

  if (userCode) {
    const code = codesCache[userCode];
    if (!code || code.used || code.username !== username) {
      return res.status(400).json({ "message": "already used key!" })
    }

    try {
      let userId;
      try {
        const response = await axios.post(
          'https://users.roblox.com/v1/usernames/users',
          { usernames: [username] },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const userInfo = response.data.data[0];
        if (!userInfo) throw new Error('User not found in Roblox API');
        userId = userInfo.id;
      } catch {
        return res.status(400).json({ "message": "account not found!" })
      }

      let userdata;
      try {
        const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        userdata = response.data;
      } catch {
        return res.status(400).json({ "message": "Internal Server Error" })
      }

      if (!userdata.description || userdata.description !== code.phase) {
        return res.status(404).json({"message": 'Your description doesn\'t match!'});
      }

      let userThumbnail;
      try {
        const thumbRes = await axios.get(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
        );
        const thumbData = thumbRes.data?.data?.[0]?.imageUrl || "";
        userThumbnail = [{ imageUrl: thumbData }];
      } catch {
        userThumbnail = [{ imageUrl: "" }];
      }

      let dbUser = await users.findOne({ userid: userId });
      if (!dbUser) {
        const newUser = new users({
          userid: userId,
          username: userdata.name,
          thumbnail: userThumbnail[0].imageUrl,
          displayname: userdata.displayName,
          rank: 'user',
          level: 0,
          xp: 0,
          balance: 0,
          history: [],
          deposited: 0,
          wager: 0,
          won: 0,
          lost: 0,
          discordusername: null,
          discordid: null,
          banned: false,
        });
        await newUser.save();
      } else {
        dbUser.thumbnail = userThumbnail[0].imageUrl;
        await dbUser.save();
      }

      code.used = true;

      const token = jwt.sign({ id: userId, ip: req.ip || 'unknown' }, jwt_secret);

      logEvent({
        type: "🔑 User Login",
        color: 0x4ade80,
        description: `**${userdata.name}** logged in.`,
        fields: [
          { name: "Roblox ID", value: String(userId), inline: true },
          { name: "IP", value: req.ip || "unknown", inline: true },
        ],
        thumbnail: userThumbnail[0]?.imageUrl || null,
      });

      return res.status(200).json({
        success: true,
        message: 'OK',
        hash: token,
      });
    } catch {
      return res.status(400).json({ "message": "Internal Server error" })
    }
  }

  const generatePhase = () => {
    const wordList = [
      'Roblox', 'Banana', 'Fun', 'Game', 'Old', 'Times', 'Cool', 'Yes',
      'No', 'Okay', 'Details', 'Important', 'Feature', 'Random', 'Unique', 'ok',
      'Process', 'Hey', 'Hola', 'Como', 'Estas', 'Soy', 'Effective',
    ];
    const shuffledWords = wordList.sort(() => Math.random() - 0.5);
    return shuffledWords.slice(0, 5).join(' ');
  };

  const phase = generatePhase();
  const newCode = {
    phase,
    username,
    used: false,
  };

  const codeId = Date.now().toString(); 
  codesCache[codeId] = newCode;

  return res.status(200).json({
    success: true,
    message: 'OK',
    code: codeId,
    phase,
  });
});

exports.inventory = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const userExists = await users.exists({ userid: req.user.id });
    if (!userExists) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const inventory = await inventorys.aggregate([
      {
        $match: {
          $or: [
            { owner: req.user.id },
            { owner: Number(req.user.id) },
            { owner: String(req.user.id) },
          ]
        }
      },
      {
        $lookup: {
          from: "items",
          let: { inv_itemid: "$itemid" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$itemid", "$$inv_itemid"] },
                    { $eq: [{ $toString: "$itemid" }, { $toString: "$$inv_itemid" }] }
                  ]
                }
              }
            }
          ],
          as: "itemData"
        }
      },
      { $unwind: { path: "$itemData", preserveNullAndEmptyArrays: false } },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$itemData", { inventoryid: "$_id" }]
          }
        }
      },
      { $sort: { itemvalue: -1 } }
    ]);

    if (!inventory.length) {
      return res.status(200).json({ message: "empty; poor xd", data: [] });
    }

    return res.status(200).json({ message: "OK", data: inventory });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

exports.withdraw = asyncHandler(async (req, res) => {
  const { items: clientItems } = req.body;

  if (!clientItems || !Array.isArray(clientItems) || clientItems.length === 0) {
    return res.status(400).json({ message: "Please select items!" });
  }

  const inventoryIds = clientItems.map(item => item.inventoryid);
  if (new Set(inventoryIds).size !== clientItems.length) {
    return res.status(400).json({ message: "One or more items can't be used!" });
  }

  if (!acquireLock(req.user.id, "withdraw")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const session = await mongoose.startSession();
  let totalItemValue = 0;

  try {
    await session.withTransaction(async () => {
      const user = await users.findOne({ userid: req.user.id }).session(session);
      if (!user) {
        throw new Error("Unauthorized");
      }

      const numUserId = Number(req.user.id);
      const inventoryItems = await inventorys.find({
        _id: { $in: inventoryIds },
        $or: [{ owner: numUserId }, { owner: String(req.user.id) }],
        locked: { $ne: true }, // accept false, null, or missing — only block explicitly locked items
      }).session(session);

      if (inventoryItems.length !== clientItems.length) {
        throw new Error("One or more items can't be used!");
      }

      const itemIds = inventoryItems.map(item => item.itemid);
      const dbItems = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).session(session);
      if (dbItems.length !== new Set(itemIds.map(String)).size) {
        throw new Error("One or more items can't be used!");
      }

      // Gem item IDs — used to detect and clear stale gem withdraw records
      const GEM_ITEM_IDS = [9000001, 9000005, 9000010, 9000025, 9000050, 9000100];

      const itemMap = new Map(dbItems.map(item => [String(item.itemid), item]));
      const withdrawalsToInsert = [];
      
      inventoryItems.forEach(inventoryItem => {
        const dbItem = itemMap.get(String(inventoryItem.itemid));
        totalItemValue += dbItem.itemvalue;
        withdrawalsToInsert.push({
          _id: inventoryItem._id,
          itemid: dbItem.itemid,
          itemname: dbItem.itemname,
          game: dbItem.game,
          userid: numUserId, // always store as Number to match withdraws schema
        });
      });

      const deleteResult = await inventorys.deleteMany({ 
        _id: { $in: inventoryIds } 
      }).session(session);

      if (deleteResult.deletedCount !== clientItems.length) {
        throw new Error("One or more items can't be used!");
      }

      // If this withdrawal includes gem items, purge any stale gem records for
      // this user first. Stale records accumulate when the bot fails to call
      // confirmWithdrawAll (crash / Render cold-start), and cause the bot to
      // give extra gems on the next withdrawal session.
      const includingGems = withdrawalsToInsert.some(w => GEM_ITEM_IDS.includes(w.itemid));
      if (includingGems) {
        await withdraws.deleteMany({
          userid: numUserId,
          itemid: { $in: GEM_ITEM_IDS },
        }).session(session);
      }

      await withdraws.insertMany(withdrawalsToInsert, { session });
    });

    await addHistory(req.user.id, "Withdrawal", `- ${totalItemValue}`);
    await updateuser(req.user.id, req.app.get("io"));
    
    return res.status(200).json({ message: "Successfully withdrawn!" });

  } catch (error) {
    logEvent({
      type: "❌ Withdraw Error",
      color: 0xff0000,
      description: `**User ${req.user?.id}** withdraw failed: ${error.message}`,
      fields: [{ name: "Items sent", value: JSON.stringify(clientItems).slice(0, 1000) }],
    });
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "withdraw");
    session.endSession();
  }
});

exports.tip = asyncHandler(async (req, res) => {
  const { items: clientItems, touser } = req.body;

  if (!clientItems || !Array.isArray(clientItems) || clientItems.length === 0) {
    return res.status(400).json({ message: "Please select items!" });
  }

  if (!touser) {
    return res.status(400).json({ message: "Select a user to tip to!" });
  }

  if (settings.tippingLocked) {
    const tipper = await users.findOne({ userid: req.user.id }).lean();
    const rank = tipper?.rank?.toUpperCase();
    if (rank !== "OWNER" && rank !== "ADMIN") {
      return res.status(403).json({ message: "Tipping is currently disabled by the site owner." });
    }
  }

  if (!acquireLock(req.user.id, "tip")) {
    return res.status(429).json({ message: "Request already in progress, please wait." });
  }

  const inventoryIds = clientItems.map(item => item.inventoryid);
  if (new Set(inventoryIds).size !== clientItems.length) {
    return res.status(400).json({ message: "One or more items can't be used!" });
  }

  const session = await mongoose.startSession();
  let totalItemValue = 0;
  let itemMap, tiptouser, user, itemCounts;

  try {
    await session.withTransaction(async () => {
      [tiptouser, user] = await Promise.all([
        users.findOne({ userid: touser }).session(session),
        users.findOne({ userid: req.user.id }).session(session)
      ]);

      if (!tiptouser || tiptouser.banned) {
        throw new Error("Recipient not found or banned!");
      }

      if (!user) {
        throw new Error("Unauthorized");
      }

      if (user.userid === tiptouser.userid) {
        throw new Error("Cannot tip yourself!");
      }

      const inventoryItems = await inventorys.find({
        _id: { $in: inventoryIds },
        owner: user.userid,
        locked: false
      }).session(session);

      if (inventoryItems.length !== clientItems.length) {
        throw new Error("One or more items can't be used!");
      }

      const itemIds = inventoryItems.map(item => item.itemid);
      const dbItems = await items.find({ itemid: { $in: [...itemIds, ...itemIds.map(String)] } }).session(session);

      if (dbItems.length !== new Set(itemIds.map(String)).size) {
        throw new Error("One or more items can't be used!");
      }

      itemMap = new Map(dbItems.map(item => [String(item.itemid), item]));
      itemCounts = new Map();
      const newInventoryEntries = [];
      totalItemValue = 0;

      for (const inventoryItem of inventoryItems) {
        const dbItem = itemMap.get(String(inventoryItem.itemid));
        totalItemValue += dbItem.itemvalue;

        const currentCount = itemCounts.get(String(dbItem.itemid)) || 0;
        itemCounts.set(String(dbItem.itemid), currentCount + 1);

        newInventoryEntries.push({
          _id: inventoryItem._id,
          itemid: inventoryItem.itemid,
          game: inventoryItem.game,
          locked: false,
          owner: tiptouser.userid,
          createdAt: inventoryItem.createdAt
        });
      }

      const deleteResult = await inventorys.deleteMany({ 
        _id: { $in: inventoryIds } 
      }).session(session);

      if (deleteResult.deletedCount !== inventoryIds.length) {
        throw new Error("One or more items can't be used!");
      }

      await inventorys.insertMany(newInventoryEntries, { session });
    });

    const webhookData = {
      items: Array.from(itemCounts.entries()).map(([itemid, count]) => {
        const dbItem = itemMap.get(itemid);
        return `${dbItem.itemname} x${count} - R$${dbItem.itemvalue}`;
      }),
      totalValue: totalItemValue
    };

    logEvent({
      type: "💜 Tip Sent",
      color: 0x8b5cf6,
      description: `**${user.username}** tipped **${tiptouser.username}** R$${webhookData.totalValue}`,
      fields: [
        { name: "Items", value: webhookData.items.join("\n") || "—", inline: false },
        { name: "From", value: user.username, inline: true },
        { name: "To", value: tiptouser.username, inline: true },
        { name: "Value", value: `R$${webhookData.totalValue}`, inline: true },
      ],
      thumbnail: user.thumbnail,
    });

    await Promise.all([
      emituser("TIP", {
        to: tiptouser.userid,
        from: user.username,
        value: totalItemValue,
        items: clientItems.length,
      }, tiptouser.userid, req.app.get("io")),
      addHistory(user.userid, "sent tip", -totalItemValue),
      addHistory(tiptouser.userid, "got tip", +totalItemValue),
      updateuser(user.userid, req.app.get("io")),
      updateuser(tiptouser.userid, req.app.get("io"))
    ]);

    return res.status(200).json({ message: `Successfully tipped ${tiptouser.username}!` });

  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  } finally {
    releaseLock(req.user.id, "tip");
    session.endSession();
  }
});
exports.linkdiscord = asyncHandler(async (req, res) => {
  if (!req.body.code) {
    return res.status(400).json({ message: "Code is missing" });
  }

  if (!req.user?.id) {
    return res.status(401).json({ message: "Please login to do that" });
  }

  if (!clientsecret) {
    console.error("[linkdiscord] DISCORD_CLIENT_SECRET is not set on this server.");
    return res.status(500).json({ message: "Server misconfiguration — contact support" });
  }

  const numUserId = Number(req.user.id);
  const user = await users.findOne({ userid: numUserId });
  if (!user) {
    return res.status(401).json({ message: "Please login to do that" });
  }

  if (user.discordusername || user.discordid) {
    return res.status(400).json({ message: "You already have a linked Discord account!" });
  }

  try {
    const params = qs.stringify({
      client_id: clientid,
      client_secret: clientsecret,
      code: req.body.code,
      grant_type: "authorization_code",
      redirect_uri: uri,
      scope: "identify",
    });

    const tokenResponse = await axios.post("https://discord.com/api/oauth2/token", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const accessToken = tokenResponse.data.access_token;

    const discordResponse = await axios.get("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const { username, id } = discordResponse.data;

    const discordId = String(id);

    const discordExist = await users.findOne({ discordid: discordId });
    if (discordExist) {
      return res.status(400).json({ message: "That Discord account is already linked!" });
    }

    user.discordusername = username;
    user.discordid = id; 
    await user.save();

    logEvent({
      type: "🔗 Discord Linked",
      color: 0x5865f2,
      description: `**${user.username}** linked their Discord account.`,
      fields: [
        { name: "Roblox Username", value: user.username, inline: true },
        { name: "Discord", value: `@${username}`, inline: true },
        { name: "Discord ID", value: discordId, inline: true },
      ],
      thumbnail: user.thumbnail,
    });

    await updateuser(user.userid, req.app.get("io"))

    return res.status(200).json({
      message: "Successfully linked!",
      username: username,
      id: discordId,
    });
  } catch (error) {
    const discordErr = error?.response?.data;
    console.error("[linkdiscord] Discord OAuth error:", discordErr || error.message);
    if (discordErr?.error === "invalid_grant") {
      return res.status(400).json({ message: "Discord link expired — please try again" });
    }
    if (discordErr?.error === "invalid_client") {
      return res.status(500).json({ message: "Server misconfiguration — contact support" });
    }
    return res.status(500).json({ message: "Failed to link Discord — please try again" });
  }
});

exports.unlinkdiscord = asyncHandler(async (req, res) => {
  try {
    if (!req.user?.id) return res.status(400).json({ "message": "Unauthorized" });

    const user = await users.findOne({ "userid": req.user.id });
    if (!user) return res.status(400).json({ "message": "Unauthorized" });
  
    if (!user.discordusername || !user.discordid) return res.status(400).json({ "message": "you have no account linked!" });
  
    user.discordusername = null;
    user.discordid = null;
    await user.save();

    await updateuser(user.userid, req.app.get("io"))

    res.status(200).json({ "message": "Successfuly unlinked!" });
  }
  catch (error) {
    return res.status(500).json({ "message": "Internal Server Error"});
  }

})

exports.getleaderboard = asyncHandler(async (req, res) => {
  try {
    const leaders = await users.find({}).sort({ wager: -1 }).limit(10);
    res.status(200).json({ "message": "OK", "leaders": leaders })
  }
  catch (error) {
    return res.status(500).json({ "message": "Internal Server Error"});
  }
})

// ── Universal user lookup ──────────────────────────────────────────────────────
// Accepts: ?userid=, ?username=, ?discordid=, ?discordusername=
// Also reads the same fields from req.body for POST compatibility.
exports.lookup = asyncHandler(async (req, res) => {
  const p = { ...req.query, ...(req.body || {}) };
  // Accept both camelCase (userId, discordId) from Lua/bot scripts and
  // snake_case/lowercase (userid, discordid) from web clients.
  const userid        = p.userid        || p.userId;
  const username      = p.username;
  const discordid     = p.discordid     || p.discordId     || p.discord_id;
  const discordusername = p.discordusername || p.discordUsername;

  let query = null;

  if (userid) {
    const n = Number(userid);
    query = Number.isFinite(n) ? { userid: n } : null;
  } else if (username) {
    // escape regex metacharacters
    const esc1 = username.split("").map(function(c) {
      return /[.*+?^${}()|[\]\\]/.test(c) ? "\\" + c : c;
    }).join("");
    query = { username: { $regex: "^" + esc1 + "$", $options: "i" } };
  } else if (discordid) {
    const n = Number(discordid);
    query = Number.isFinite(n) ? { discordid: n } : { discordid: discordid };
  } else if (discordusername) {
    const esc2 = discordusername.split("").map(function(c) {
      return /[.*+?^${}()|[\]\\]/.test(c) ? "\\" + c : c;
    }).join("");
    query = { discordusername: { $regex: "^" + esc2 + "$", $options: "i" } };
  }
  if (!query) {
    return res.status(400).json({ success: false, message: "Provide userid, username, discordid, or discordusername." });
  }

  try {
    const user = await users.findOne(query).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    return res.status(200).json({
      success: true,
      message: "OK",
      data: {
        userid:          user.userid,
        username:        user.username,
        thumbnail:       user.thumbnail,
        displayname:     user.displayname,
        rank:            user.rank,
        level:           user.level,
        xp:              user.xp,
        wager:           user.wager,
        won:             user.won,
        lost:            user.lost,
        discordid:       user.discordid       ?? null,
        discordusername: user.discordusername ?? null,
      },
    });
  } catch (err) {
    console.error("lookup error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
})