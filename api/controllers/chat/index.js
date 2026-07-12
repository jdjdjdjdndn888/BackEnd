const asyncHandler = require("express-async-handler");
const users = require("../../modules/users.js");
const ChatMessage = require("../../modules/chatmessages.js");
const userSockets = require("../../socket/usersockets.js");
const { logEvent } = require("../../logger.js");
const { logAction } = require("../../utils/logaction.js");
const { OWNER_TIER, FULL_STAFF_TIER, ANY_STAFF_TIER } = require("../../utils/rankTiers.js");
const dropsController = require("./drops.js");

// In-memory cache – seeded from MongoDB on first access so messages survive restarts
let messages = null;
let chatLocked = false;
const lastMessageTime = {};
const mutedUsers = new Map();

const GEMTIDE_BOT = {
  userid:    0,
  username:  "GemTide",
  thumbnail: "https://gemtide.win/logo-gemtide.png",
  rank:      "OWNER",
  level:     100,
};

async function getMessages() {
  if (messages === null) {
    try {
      const dbMessages = await ChatMessage.find({})
        .sort({ createdAt: -1 })
        .limit(40)
        .lean();
      messages = dbMessages.reverse().map((m) => ({
        content:   m.content,
        userid:    m.userid,
        username:  m.username,
        thumbnail: m.thumbnail,
        rank:      m.rank,
        level:     m.level,
        timestamp: m.timestamp,
      }));
    } catch (err) {
      console.error("[CHAT] Failed to seed messages from DB:", err.message);
      messages = [];
    }
  }
  return messages;
}

async function persistMessage(msgData) {
  try {
    await ChatMessage.create(msgData);
  } catch (err) {
    console.error("[CHAT] Failed to persist message:", err.message);
  }
}

function addToCache(msgData) {
  messages.push(msgData);
  if (messages.length > 40) messages.shift();
}

function broadcastSystem(io, content) {
  const sysMsg = {
    ...GEMTIDE_BOT,
    content,
    timestamp: new Date().toISOString().slice(11, 16),
  };
  addToCache(sysMsg);
  persistMessage(sysMsg);
  io.emit("MESSAGE", sysMsg);
  return sysMsg;
}

// Broadcasts a drop as its own chat message so it appears inline in the feed
// like any other message, but carries a `drop` payload the frontend renders
// as a claimable item card instead of plain text. Also used by both the
// automatic tax-triggered drops and the owner `?forcedrop` command.
async function broadcastDrop(io, drop) {
  await getMessages();
  const dropMsg = {
    ...GEMTIDE_BOT,
    content: "",
    type: "drop",
    drop: {
      id: drop._id.toString(),
      itemname: drop.itemname,
      itemvalue: drop.itemvalue,
      itemimage: drop.itemimage,
      code: drop.code,
      claimed: drop.claimed,
      claimedBy: drop.claimedBy,
      claimedUsername: drop.claimedUsername,
    },
    timestamp: new Date().toISOString().slice(11, 16),
  };
  addToCache(dropMsg);
  persistMessage(dropMsg);
  io.emit("MESSAGE", dropMsg);
  return dropMsg;
}
exports.broadcastDrop = broadcastDrop;

// Called from every game controller right after a tax transaction commits
// (never from inside the transaction itself). No-ops below the drop
// threshold.
exports.checkAndTriggerDrop = async function (io) {
  return dropsController.checkAndTriggerDrop(io, broadcastDrop);
};

exports.sendchat = asyncHandler(async (req, res, next, io) => {
  const { msgcontent } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!msgcontent || msgcontent.length < 1) return res.status(400).json({ message: "Your message is too short!" });
  if (msgcontent.length > 60) return res.status(400).json({ message: "Your message is too long!" });

  const now = Date.now();

  if (mutedUsers.has(userId)) {
    const { unmuteTime } = mutedUsers.get(userId);
    if (now < unmuteTime) {
      const minutesLeft = Math.ceil((unmuteTime - now) / 60000);
      return res.status(403).json({ message: `You are muted for another ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.` });
    } else {
      mutedUsers.delete(userId);
    }
  }

  if (lastMessageTime[userId] && now - lastMessageTime[userId] < 3000) {
    return res.status(400).json({ message: "You're sending messages too quickly!" });
  }

  const user = await users.findOne({ userid: userId }).select("username thumbnail rank level");
  if (!user) return res.status(400).json({ message: "User not found" });
  if (user.level < 0) return res.status(400).json({ message: "You must be logged in to chat!" });

  const isOwner = OWNER_TIER.includes(user.rank);
  const isFullStaff = FULL_STAFF_TIER.includes(user.rank);
  const isStaff = ANY_STAFF_TIER.includes(user.rank);

  // Chat lock – only staff can speak when locked (commands still go through)
  if (chatLocked && !isStaff && !msgcontent.startsWith("?")) {
    return res.status(403).json({ message: "🔒 Chat is locked. Only staff can speak right now." });
  }

  // Ensure cache is seeded before we push
  await getMessages();

  const messageData = {
    content:   msgcontent,
    userid:    userId,
    username:  user.username,
    thumbnail: user.thumbnail || null,
    rank:      user.rank,
    level:     user.level,
    timestamp: new Date().toISOString().slice(11, 16),
  };

  addToCache(messageData);
  persistMessage(messageData); // fire-and-forget
  lastMessageTime[userId] = now;
  io.emit("MESSAGE", messageData);

  logEvent({
    type: "💬 Chat Message",
    color: 0x68749c,
    description: `**${user.username}**: ${msgcontent}`,
    fields: [
      { name: "Rank",  value: user.rank || "USER",     inline: true },
      { name: "Level", value: String(user.level ?? 0), inline: true },
    ],
    thumbnail: user.thumbnail || null,
  });

  // Mention notifications
  const mentionMatch = msgcontent.match(/@(\w+)/g);
  if (mentionMatch) {
    for (const mention of mentionMatch) {
      const mentionedName = mention.slice(1);
      if (mentionedName.toLowerCase() === user.username.toLowerCase()) continue;
      try {
        const mentionedUser = await users
          .findOne({ username: { $regex: new RegExp(`^${mentionedName}$`, "i") } })
          .select("userid");
        if (mentionedUser) {
          const sids = userSockets.get(mentionedUser.userid) || [];
          sids.forEach((sid) => {
            const s = io.sockets.sockets.get(sid);
            if (s) s.emit("NOTIFICATION", {
              type: "info",
              title: "You were mentioned in chat!",
              message: `${user.username}: ${msgcontent}`,
              target: mentionedUser.userid,
            });
          });
        }
      } catch {}
    }
  }

  // ── Staff commands ─────────────────────────────────────────────────────────
  let systemResponse = null;

  if (msgcontent.startsWith("?") && isStaff) {
    const [command, ...args] = msgcontent.split(" ");

    switch (command.toLowerCase()) {

      // ── Trial Staff and above ──────────────────────────────────────────────
      case "?mute": {
        const targetUser = args[0];
        const duration = parseInt(args[1], 10) || 30;
        if (!targetUser) { systemResponse = "Usage: ?mute <user> [minutes]"; break; }
        const userToMute = await users.findOne({ username: targetUser });
        if (!userToMute) { systemResponse = "User not found."; break; }
        if (userToMute.userid === userId || OWNER_TIER.includes(userToMute.rank) || userToMute.rank === "ADMIN") {
          systemResponse = "You cannot mute that user."; break;
        }
        if (mutedUsers.has(userToMute.userid)) { systemResponse = `${targetUser} is already muted.`; break; }
        mutedUsers.set(userToMute.userid, { unmuteTime: now + duration * 60 * 1000, duration });
        systemResponse = `🔇 ${targetUser} has been muted for ${duration} minute${duration !== 1 ? "s" : ""}.`;
        logAction(user, "Mute User", targetUser, `${duration} minute(s)`, "chat");
        break;
      }

      case "?unmute": {
        const targetUser = args[0];
        if (!targetUser) { systemResponse = "Usage: ?unmute <user>"; break; }
        const userToUnmute = await users.findOne({ username: targetUser });
        if (!userToUnmute) { systemResponse = "User not found."; break; }
        if (!mutedUsers.has(userToUnmute.userid)) { systemResponse = `${targetUser} is not muted.`; break; }
        mutedUsers.delete(userToUnmute.userid);
        systemResponse = `🔊 ${targetUser} has been unmuted.`;
        logAction(user, "Unmute User", targetUser, null, "chat");
        break;
      }

      // ── Full staff only (Moderator and above) ──────────────────────────────
      case "?ban": {
        if (!isFullStaff) { systemResponse = "⛔ You don't have permission for that command."; break; }
        const targetUser = args[0];
        if (!targetUser) { systemResponse = "Usage: ?ban <user>"; break; }
        const userToBan = await users.findOne({ username: targetUser });
        if (!userToBan) { systemResponse = "User not found."; break; }
        if (userToBan.userid === userId || OWNER_TIER.includes(userToBan.rank) || userToBan.rank === "ADMIN") {
          systemResponse = "You cannot ban that user."; break;
        }
        if (userToBan.banned) { systemResponse = `${targetUser} is already banned.`; break; }
        userToBan.banned = true;
        await userToBan.save();
        systemResponse = `🚫 ${targetUser} has been banned.`;
        logAction(user, "Ban User", targetUser, null, "chat");
        break;
      }

      case "?unban": {
        if (!isFullStaff) { systemResponse = "⛔ You don't have permission for that command."; break; }
        const targetUser = args[0];
        if (!targetUser) { systemResponse = "Usage: ?unban <user>"; break; }
        const userToUnban = await users.findOne({ username: targetUser });
        if (!userToUnban) { systemResponse = "User not found."; break; }
        if (!userToUnban.banned) { systemResponse = `${targetUser} is not banned.`; break; }
        userToUnban.banned = false;
        await userToUnban.save();
        systemResponse = `✅ ${targetUser} has been unbanned.`;
        logAction(user, "Unban User", targetUser, null, "chat");
        break;
      }

      case "?lockchat": {
        if (!isFullStaff) { systemResponse = "⛔ You don't have permission for that command."; break; }
        if (chatLocked) { systemResponse = "🔒 Chat is already locked."; break; }
        chatLocked = true;
        systemResponse = "🔒 Chat has been locked. Only staff can speak.";
        logAction(user, "Lock Chat", null, null, "chat");
        break;
      }

      case "?unlockchat": {
        if (!isFullStaff) { systemResponse = "⛔ You don't have permission for that command."; break; }
        if (!chatLocked) { systemResponse = "🔓 Chat is already unlocked."; break; }
        chatLocked = false;
        systemResponse = "🔓 Chat has been unlocked. Everyone can speak again.";
        logAction(user, "Unlock Chat", null, null, "chat");
        break;
      }

      case "?rainbow": {
        if (!isFullStaff) { systemResponse = "⛔ You don't have permission for that command."; break; }
        io.emit("rainbow");
        systemResponse = "🌈";
        break;
      }

      // ── Purge: wipes recent chat history for everyone ──────────────────────
      case "?purge": {
        if (!isFullStaff) { systemResponse = "⛔ You don't have permission for that command."; break; }
        try {
          await getMessages();
          messages.length = 0;
          await ChatMessage.deleteMany({});
          io.emit("CHAT_PURGED");
          systemResponse = `🧹 Chat has been purged by ${user.username}.`;
          logAction(user, "Purge Chat", null, "Cleared all recent chat messages", "chat");
        } catch (err) {
          console.error("[CHAT ?purge]", err);
          systemResponse = "❌ Purge failed – check server logs.";
        }
        break;
      }

      // ── OWNER-TIER ONLY: manually spawn a single-item drop ────────────────
      case "?forcedrop": {
        if (!isOwner) { systemResponse = "⛔ Only the site Owner/Co-Owner can use this command."; break; }
        try {
          await dropsController.forceDrop(io, broadcastDrop);
        } catch (err) {
          console.error("[CHAT ?forcedrop]", err);
          systemResponse = "❌ Force drop failed — check server logs.";
        }
        break;
      }

      // ── OWNER-TIER ONLY: reset all users ─────────────────────────────────
      case "?resetall": {
        if (!isOwner) { systemResponse = "⛔ Only the site Owner/Co-Owner can use this command."; break; }
        if (args[0] !== "confirm") {
          systemResponse = "Type ?resetall confirm to wipe ALL user levels, wager, stats, and Discord links.";
          break;
        }
        try {
          await users.updateMany(
            { rank: { $nin: OWNER_TIER } },
            { $set: { level: 0, xp: 0, wager: 0, won: 0, lost: 0, rank: "USER", discordid: null, discordusername: null } }
          );
          systemResponse = "✅ All user levels, wager, stats, and Discord links have been reset.";
          logAction(user, "Reset All Users", null, "Wiped levels, wager, stats, and Discord links", "chat");
        } catch (err) {
          console.error("[CHAT ?resetall]", err);
          systemResponse = "❌ Reset failed – check server logs.";
        }
        break;
      }

      default:
        systemResponse = isFullStaff
          ? "Available commands: ?mute ?unmute ?ban ?unban ?lockchat ?unlockchat ?rainbow ?purge — Owner/Co-Owner only: ?forcedrop ?resetall"
          : "Available commands: ?mute ?unmute";
    }
  }

  if (systemResponse) {
    broadcastSystem(io, systemResponse);
  }

  return res.status(200).json({ message: systemResponse || messageData });
});

exports.latestmessages = asyncHandler(async (req, res) => {
  const msgs = await getMessages();
  return res.status(200).json({ messages: msgs });
});

exports.claimdrop = asyncHandler(async (req, res, next, io) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { dropId, code } = req.body;
  if (!dropId || !code) return res.status(400).json({ message: "Missing dropId or code." });

  const result = await dropsController.claimDrop(userId, dropId, code);
  if (!result.success) return res.status(400).json({ message: result.message });

  // Update the persisted/cached chat message in place so a page refresh
  // still shows the drop as claimed, then tell every connected client.
  try {
    await getMessages();
    const cached = messages.find((m) => m.type === "drop" && m.drop?.id === String(dropId));
    if (cached) {
      cached.drop.claimed = true;
      cached.drop.claimedBy = result.drop.claimedBy;
      cached.drop.claimedUsername = result.drop.claimedUsername;
    }
    await ChatMessage.updateOne(
      { type: "drop", "drop.id": String(dropId) },
      { $set: { "drop.claimed": true, "drop.claimedBy": result.drop.claimedBy, "drop.claimedUsername": result.drop.claimedUsername } }
    );
  } catch (err) {
    console.error("[CHAT claimdrop] Failed to sync cached message:", err.message);
  }

  io.emit("DROP_CLAIMED", {
    dropId: String(dropId),
    claimedBy: result.drop.claimedBy,
    claimedUsername: result.drop.claimedUsername,
  });

  return res.status(200).json({ message: `✅ You claimed ${result.drop.itemname}!` });
});
