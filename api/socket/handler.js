const jwt = require("jsonwebtoken");
const { jwt_secret } = require("../config.js");
const userSockets = require("./usersockets.js");

// ── Per-IP connection guards ────────────────────────────────────────────
// Socket.io sits outside express-rate-limit, so a flood of raw connections
// (or reconnect loops) can still exhaust file descriptors / memory even
// with HTTP rate limiting in place. Cap both the connection *rate* and the
// number of concurrent sockets any single IP may hold open.
const MAX_CONNECTIONS_PER_MINUTE = 60;
const MAX_CONCURRENT_SOCKETS_PER_IP = 20;
const connectionLog = new Map(); // ip -> [timestamps]
const concurrentByIp = new Map(); // ip -> count

function getClientIp(socket) {
  return (
    socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    socket.handshake.address
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  const timestamps = (connectionLog.get(ip) || []).filter((t) => t > windowStart);
  timestamps.push(now);
  connectionLog.set(ip, timestamps);
  return timestamps.length > MAX_CONNECTIONS_PER_MINUTE;
}

// Periodically drop stale IP entries so the maps don't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [ip, timestamps] of connectionLog) {
    const kept = timestamps.filter((t) => t > cutoff);
    if (kept.length) connectionLog.set(ip, kept);
    else connectionLog.delete(ip);
  }
}, 60 * 1000);

module.exports = (io) => {
  io.use((socket, next) => {
    const ip = getClientIp(socket);

    if ((concurrentByIp.get(ip) || 0) >= MAX_CONCURRENT_SOCKETS_PER_IP) {
      return next(new Error("Too many concurrent connections"));
    }

    if (isRateLimited(ip)) {
      return next(new Error("Too many connection attempts, slow down"));
    }

    next();
  });

  io.on("connect", (socket) => {
    const ip = getClientIp(socket);
    concurrentByIp.set(ip, (concurrentByIp.get(ip) || 0) + 1);
    socket.on("disconnect", () => {
      const current = concurrentByIp.get(ip) || 1;
      if (current <= 1) concurrentByIp.delete(ip);
      else concurrentByIp.set(ip, current - 1);
    });

    // Authenticate on connect
    const token = socket.handshake.auth?.token;
    try {
      const decoded = jwt.verify(token, jwt_secret);
      socket.userId = decoded.id;
      userSockets.set(decoded.id, socket.id);
    } catch {
      // Not authenticated — socket stays connected but userId is unset.
      // Unauthenticated clients still receive all public broadcast events.
    }

    // Allow the client to re-authenticate without a full disconnect/reconnect.
    // Called after login so the server maps the new userId → socketId.
    socket.on("reauth", (data) => {
      try {
        const decoded = jwt.verify(data?.token, jwt_secret);
        if (socket.userId) userSockets.delete(socket.userId, socket.id);
        socket.userId = decoded.id;
        userSockets.set(decoded.id, socket.id);
      } catch {
        // Invalid token — leave userId as-is
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) userSockets.delete(socket.userId, socket.id);
    });
  });

  setInterval(() => {
    io.emit("ONLINE_UPDATE", io.sockets.sockets.size + 15);
  }, 2000);
};
