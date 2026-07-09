const jwt = require("jsonwebtoken");
const { jwt_secret } = require("../config.js");
const userSockets = require("./usersockets.js");

module.exports = (io) => {
  io.on("connect", (socket) => {
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
