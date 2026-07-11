const asyncHandler = require("express-async-handler");
const users = require("../../modules/users.js");
const ChatMessage = require("../../modules/chatmessages.js");
const userSockets = require("../../socket/usersockets.js");
const { logEvent } = require("../../logger.js");

// In-memory cache – seeded from MongoDB on first access so messages survive restarts
let messages = null;
const lastMessageTime = {};
const mutedUsers = new Map();

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
  persistMessage(messageData); // fire-and-forget – don't block the response
  lastMessageTime[userId] = now;
  io.emit("MESSAGE", messageData);

  logEvent({
    type: "💬 Chat Message",
    color: 0x68749c,
    description: `**${user.username}**: ${msgcontent}`,
    fields: [
      { name: "Rank",  value: user.rank || "USER",       inline: true },
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

  // ── Staff commands ────────────────────────────────────────────────────────
  let systemResponse = null;
  const isOwner = user.rank === "OWNER";
  const isStaff = isOwner || user.rank === "ADMIN";

  if (msgcontent.startsWith("?") && isStaff) {
    const [command, ...args] = msgcontent.split(" ");

    switch (command.toLowerCase()) {

      case "?mute": {
        const targetUser = args[0];
        const duration = parseInt(args[1], 10) || 30;
        if (!targetUser) { systemResponse = "Please specify a user to mute."; break; }
        const userToMute = await users.findOne({ username: targetUser });
        if (!userToMute) { systemResponse = "The user does not exist!"; break; }
        if (userToMute.userid === userId || userToMute.rank === "ADMIN") {
          systemResponse = "You cannot mute yourself or another admin."; break;
        }
        if (mutedUsers.has(userToMute.userid)) { systemResponse = "The user is already muted!"; break; }
        mutedUsers.set(userToMute.userid, { unmuteTime: now + duration * 60 * 1000, duration });
        systemResponse = `${targetUser} has been muted for ${duration} minutes.`;
        break;
      }

      case "?unmute": {
        const targetUser = args[0];
        if (!targetUser) { systemResponse = "Please specify a user to unmute."; break; }
        const userToUnmute = await users.findOne({ username: targetUser });
        if (!userToUnmute) { systemResponse = "The user does not exist!"; break; }
        if (userToUnmute.userid === userId || userToUnmute.rank === "ADMIN") {
          systemResponse = "You cannot unmute yourself or another ADMIN."; break;
        }
        if (!mutedUsers.has(userToUnmute.userid)) { systemResponse = "The user is not muted!"; break; }
        mutedUsers.delete(userToUnmute.userid);
        systemResponse = `${targetUser} has been unmuted.`;
        break;
      }

      case "?ban": {
        const targetUser = args[0];
        if (!targetUser) { systemResponse = "Please specify a user to ban."; break; }
        const userToBan = await users.findOne({ username: targetUser });
        if (!userToBan) { systemResponse = "The user does not exist!"; break; }
        if (userToBan.userid === userId || userToBan.rank === "ADMIN") {
          systemResponse = "You cannot ban yourself or another ADMIN."; break;
        }
        if (userToBan.banned) { systemResponse = "The user is already banned!"; break; }
        userToBan.banned = true;
        await userToBan.save();
        systemResponse = `${targetUser} has been banned.`;
        break;
      }

      case "?unban": {
        const targetUser = args[0];
        if (!targetUser) { systemResponse = "Please specify a user to unban."; break; }
        const userToUnban = await users.findOne({ username: targetUser });
        if (!userToUnban) { systemResponse = "The user does not exist!"; break; }
        if (userToUnban.userid === userId || userToUnban.rank === "ADMIN") {
          systemResponse = "You cannot unban yourself or another ADMIN."; break;
        }
        if (!userToUnban.banned) { systemResponse = "The user is not banned!"; break; }
        userToUnban.banned = false;
        await userToUnban.save();
        systemResponse = `${targetUser} has been unbanned.`;
        break;
      }

      case "?rainbow": {
        io.emit("rainbow");
        systemResponse = "xd";
        break;
      }

      // ── OWNER-ONLY: reset all users ─────────────────────────────────────
      case "?resetall": {
        if (!isOwner) {
          systemResponse = "Only the site OWNER can use this command.";
          break;
        }
        const confirm = args[0];
        if (confirm !== "confirm") {
          systemResponse = "Type ?resetall confirm to wipe ALL user levels, wager, stats, and Discord links.";
          break;
        }
        try {
          await users.updateMany(
            { rank: { $ne: "OWNER" } },
            {
              $set: {
                level: 0,
                xp: 0,
                wager: 0,
                won: 0,
                lost: 0,
                rank: "USER",
                discordid: null,
                discordusername: null,
              },
            }
          );
          systemResponse = "✅ All user levels, wager, stats, and Discord links have been reset.";
        } catch (err) {
          console.error("[CHAT ?resetall]", err);
          systemResponse = "❌ Reset failed – check server logs.";
        }
        break;
      }

      default:
        systemResponse = "Unknown command. Available: ?mute ?unmute ?ban ?unban ?rainbow ?resetall";
    }
  }

  if (systemResponse) {
    const sysMsg = {
      content:   systemResponse,
      userid:    1,
      username:  "BLOXYSPIN",
      thumbnail: "https://cdn.discordapp.com/icons/1253663005191962654/3d9be4c5c581964ce94050106273ed67.png?size=4096",
      rank:      "OWNER",
      level:     1,
      timestamp: new Date().toISOString().slice(11, 16),
    };
    addToCache(sysMsg);
    persistMessage(sysMsg);
    io.emit("MESSAGE", sysMsg);
  }

  return res.status(200).json({ message: systemResponse || messageData });
});

exports.latestmessages = asyncHandler(async (req, res) => {
  const msgs = await getMessages();
  return res.status(200).json({ messages: msgs });
});
