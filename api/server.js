const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const routes = require("./routes/routes");
const socketHandler = require("./socket/handler");
const { startup } = require("./startup");
const {
  ipBlocklist,
  corsOptions,
  isAllowedOrigin,
  originGuard,
  globalLimiter,
  speedLimiter,
} = require("./middleware/security");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
  },
  // Volumetric protection for the realtime layer: cap payload size, force
  // clients to complete the handshake quickly, and drop long-idle sockets.
  maxHttpBufferSize: 1e5, // 100kb — no reason a client should send more
  pingTimeout: 20000,
  pingInterval: 25000,
  connectTimeout: 10000,
});

app.set("io", io);
// Behind exactly one reverse proxy in production (Render/Vercel rewrite),
// so req.ip reflects the real client IP for rate limiting — required for
// express-rate-limit / express-slow-down to key on the right address.
app.set("trust proxy", 1);

// Blocklist first — reject known-bad IPs before spending any more work on them.
app.use(ipBlocklist);

// Security headers (hides framework fingerprint, sets HSTS, disables sniffing, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // X-XSS-Protection: tell older browsers to block reflected XSS
  xXssProtection: true,
  // Content-Security-Policy: API-only service — no HTML served, so lock it down tight
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'none'"],
      scriptSrc:   ["'none'"],
      styleSrc:    ["'none'"],
      imgSrc:      ["'none'"],
      connectSrc:  ["'self'"],
      frameAncestors: ["'none'"],
      formAction:  ["'none'"],
    },
  },
}));

app.use(cors(corsOptions));

// Hard origin guard — blocks any request that isn't from the approved frontend
// origin, the Roblox bot scripts (Bearer JWT), or the Discord bot announce path.
app.use(originGuard);

// Cap request body size so someone can't DoS the process with huge payloads.
app.use(express.json({ limit: "256kb" }));

app.use((req, _res, next) => {
  req.startTime = Date.now();
  next();
});

// Progressive slow-down first (adds latency to abusive IPs), then a hard
// ceiling that actually rejects requests once they go too far.
app.use(speedLimiter);
app.use(globalLimiter);

app.use("/", routes);

socketHandler(io);

const { mongoUri, port: PORT } = require("./config.js");

if (!mongoUri) {
  console.error("MONGODB_URI environment variable is not set.");
  process.exit(1);
}

mongoose
  .connect(mongoUri, { dbName: "petflippy" })
  .then(() => {
    console.log("Connected to MongoDB");

    try {
      startup(io).catch((err) =>
        console.error("Startup error (non-fatal):", err)
      );
    } catch (err) {
      console.error("Startup invocation error (non-fatal):", err);
    }

    try {
      require("./bot");
      console.log("Discord bot loaded");
    } catch (err) {
      console.error("Discord bot failed to load:", err.message);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`BloxySpin API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
